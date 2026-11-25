import type { NowPlayingSource } from './now-playing-source'
import type { NowPlayingState } from './now-playing-types'
import { createBrowserCompanionTokenStorage, type CompanionTokenStorage } from './companion-token-storage'
import type {
  CompanionHealthResponse,
  CompanionNowPlayingResponse,
  CompanionStatus,
  CompanionConnectionStatus,
} from './windows-companion-types'

export const WINDOWS_COMPANION_BASE_URL = 'http://127.0.0.1:38471'
const POLL_INTERVAL_MS = 2500
const REQUEST_TIMEOUT_MS = 4000

const emptyState: NowPlayingState = { title: '', artist: '', playbackState: 'paused', position: 0 }
const messages: Record<CompanionConnectionStatus, string> = {
  disabled: 'Windows companion is disabled.',
  connecting: 'Connecting to the Windows companion…',
  'connected-playing': 'Connected: media is playing.',
  'connected-paused': 'Connected: media is paused.',
  'no-media': 'Connected, but no media session is active.',
  offline: 'Windows companion is offline or unreachable.',
  'invalid-token': 'The companion token was rejected.',
  'media-access-unavailable': 'The companion cannot access Windows media sessions.',
  malformed: 'The companion returned an invalid response.',
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type CompanionSourceOptions = {
  fetchFn?: FetchLike
  storage?: CompanionTokenStorage
  documentRef?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
  intervalMs?: number
  timeoutMs?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validHealth(value: unknown): value is CompanionHealthResponse {
  return isRecord(value) && typeof value.healthy === 'boolean'
}

function validNowPlaying(value: unknown): value is CompanionNowPlayingResponse {
  if (!isRecord(value) || typeof value.available !== 'boolean' || !Number.isInteger(value.revision)) return false
  if (typeof value.observedAtUtc !== 'string') return false
  return ['playing', 'paused', 'stopped', 'none', 'unknown'].includes(String(value.playbackState))
}

export class WindowsCompanionSource implements NowPlayingSource {
  private state = emptyState
  private status: CompanionStatus = { status: 'disabled', message: messages.disabled }
  private listeners = new Set<(state: NowPlayingState) => void>()
  private statusListeners = new Set<(status: CompanionStatus) => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private request?: AbortController
  private polling = false
  private enabled = false
  private generation = 0
  private readonly fetchFn: FetchLike
  private readonly storage: CompanionTokenStorage
  private readonly documentRef: CompanionSourceOptions['documentRef']
  private readonly setTimeoutFn: typeof setTimeout
  private readonly clearTimeoutFn: typeof clearTimeout
  private readonly intervalMs: number
  private readonly timeoutMs: number

  constructor(options: CompanionSourceOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch
    this.storage = options.storage ?? createBrowserCompanionTokenStorage()
    this.documentRef = options.documentRef ?? document
    this.setTimeoutFn = options.setTimeoutFn ?? setTimeout
    this.clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout
    this.intervalMs = options.intervalMs ?? POLL_INTERVAL_MS
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
  }

  getState(): NowPlayingState { return this.state }
  getStatus(): CompanionStatus { return this.status }
  getStoredToken(): string | undefined { return this.storage.get() }
  subscribe(listener: (state: NowPlayingState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  subscribeStatus(listener: (status: CompanionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  async connect(token: string): Promise<void> {
    const trimmed = token.trim()
    if (!trimmed) { this.setStatus('invalid-token'); return }
    this.disconnect(false)
    this.enabled = true
    this.storage.set(trimmed)
    const generation = ++this.generation
    this.setStatus('connecting')
    this.documentRef?.addEventListener('visibilitychange', this.handleVisibility)
    await this.poll(generation, trimmed)
  }

  disconnect(clearToken = false): void {
    this.enabled = false
    this.generation += 1
    this.request?.abort()
    this.request = undefined
    if (this.timer !== undefined) this.clearTimeoutFn(this.timer)
    this.timer = undefined
    this.documentRef?.removeEventListener('visibilitychange', this.handleVisibility)
    if (clearToken) this.storage.clear()
    this.setStatus('disabled')
  }

  clearStoredToken(): void { this.storage.clear() }
  dispose(): void { this.disconnect(false); this.listeners.clear(); this.statusListeners.clear() }

  private handleVisibility = () => {
    if (this.enabled && this.documentRef?.visibilityState === 'visible') this.schedule(0, this.generation)
  }

  private setStatus(status: CompanionConnectionStatus, media?: CompanionNowPlayingResponse): void {
    this.status = { status, message: messages[status], ...(media ? { media } : {}) }
    for (const listener of this.statusListeners) listener(this.status)
  }

  private notify(state: NowPlayingState): void {
    this.state = state
    for (const listener of this.listeners) listener(state)
  }

  private schedule(delay: number, generation: number): void {
    if (!this.enabled || generation !== this.generation || this.documentRef?.visibilityState === 'hidden') return
    if (this.timer !== undefined) this.clearTimeoutFn(this.timer)
    this.timer = this.setTimeoutFn(() => { void this.poll(generation, this.storage.get() ?? '') }, delay)
  }

  private async poll(generation: number, token: string): Promise<void> {
    if (!this.enabled || this.polling || generation !== this.generation || !token) return
    this.polling = true
    const controller = new AbortController()
    this.request = controller
    const timeout = this.setTimeoutFn(() => controller.abort(), this.timeoutMs)
    try {
      const init: RequestInit = { method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
      const healthResponse = await this.fetchFn(`${WINDOWS_COMPANION_BASE_URL}/v1/health`, init)
      if (generation !== this.generation) return
      if (healthResponse.status === 401) { this.setStatus('invalid-token'); return }
      if (!healthResponse.ok) { this.setStatus('offline'); return }
      const health: unknown = await healthResponse.json()
      if (!validHealth(health)) { this.setStatus('malformed'); return }
      if (!health.healthy) {
        this.setStatus(health.error === 'media_access_unavailable' ? 'media-access-unavailable' : 'offline')
        return
      }
      const response = await this.fetchFn(`${WINDOWS_COMPANION_BASE_URL}/v1/now-playing`, init)
      if (generation !== this.generation) return
      if (response.status === 401) { this.setStatus('invalid-token'); return }
      if (!response.ok) { this.setStatus('offline'); return }
      const media: unknown = await response.json()
      if (!validNowPlaying(media)) { this.setStatus('malformed'); return }
      if (!media.available) {
        this.notify(emptyState)
        this.setStatus('no-media', media)
      } else {
        this.notify({
          title: typeof media.title === 'string' ? media.title : '',
          artist: typeof media.artist === 'string' ? media.artist : '',
          duration: typeof media.durationSeconds === 'number' ? media.durationSeconds : undefined,
          playbackState: media.playbackState === 'playing' ? 'playing' : 'paused',
          position: typeof media.positionSeconds === 'number' ? Math.max(0, media.positionSeconds) : 0,
        })
        this.setStatus(media.playbackState === 'playing' ? 'connected-playing' : 'connected-paused', media)
      }
    } catch {
      if (generation === this.generation) this.setStatus('offline')
    } finally {
      this.clearTimeoutFn(timeout)
      if (this.request === controller) this.request = undefined
      this.polling = false
      if (this.enabled && generation === this.generation) this.schedule(this.intervalMs, generation)
    }
  }
}
