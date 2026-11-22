import type { NowPlayingSource } from './now-playing-source'
import type { NowPlayingState } from './now-playing-types'

export type TimerClock = () => number

export type ManualTimerOptions = {
  title?: string
  artist?: string
  duration?: number
}

export class ManualTimer implements NowPlayingSource {
  private readonly clock: TimerClock
  private readonly title: string
  private readonly artist: string
  private readonly duration: number | undefined
  private readonly listeners = new Set<(state: NowPlayingState) => void>()
  private elapsedMilliseconds = 0
  private startedAt: number | undefined

  constructor(clock: TimerClock = () => performance.now(), options: ManualTimerOptions = {}) {
    this.clock = clock
    this.title = options.title ?? 'Manual timer'
    this.artist = options.artist ?? 'ChorusGlyph'
    this.duration = options.duration
  }

  play(): void {
    if (this.isPlaying()) return
    this.startedAt = this.clock()
    this.notify()
  }

  pause(): void {
    if (!this.isPlaying()) return
    this.elapsedMilliseconds = this.getElapsedMilliseconds()
    this.startedAt = undefined
    this.notify()
  }

  reset(): void {
    const changed = this.getCurrentTime() !== 0 || this.isPlaying()
    this.elapsedMilliseconds = 0
    this.startedAt = undefined
    if (changed) this.notify()
  }

  seek(seconds: number): void {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
    this.elapsedMilliseconds = safeSeconds * 1000

    if (this.isPlaying()) {
      this.startedAt = this.clock()
    }

    this.notify()
  }

  getCurrentTime(): number {
    return Math.max(0, this.getElapsedMilliseconds() / 1000)
  }

  isPlaying(): boolean {
    return this.startedAt !== undefined
  }

  getState(): NowPlayingState {
    return {
      title: this.title,
      artist: this.artist,
      duration: this.duration,
      playbackState: this.isPlaying() ? 'playing' : 'paused',
      position: this.getCurrentTime(),
    }
  }

  subscribe(listener: (state: NowPlayingState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private getElapsedMilliseconds(): number {
    if (this.startedAt === undefined) return Math.max(0, this.elapsedMilliseconds)
    return Math.max(0, this.elapsedMilliseconds + this.clock() - this.startedAt)
  }

  private notify(): void {
    const state = this.getState()
    this.listeners.forEach((listener) => listener(state))
  }
}
