import { describe, expect, it, vi } from 'vitest'
import { WindowsCompanionSource } from '../domain/now-playing/windows-companion-source'
import { healthyResponse, mediaAccessUnavailableResponse, noMedia, playingMedia } from './companion-fixtures'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function sourceWith(fetchFn: typeof fetch) {
  const storage = { value: undefined as string | undefined, get() { return this.value }, set(value: string) { this.value = value }, clear() { this.value = undefined } }
  return { source: new WindowsCompanionSource({ fetchFn, storage, intervalMs: 100000 }), storage }
}

describe('WindowsCompanionSource', () => {
  it('does not contact localhost before explicit opt-in', () => {
    const fetchFn = vi.fn<typeof fetch>()
    sourceWith(fetchFn)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('normalizes a valid playing response and sends the bearer token', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(response(healthyResponse)).mockResolvedValueOnce(response(playingMedia))
    const { source } = sourceWith(fetchFn)
    await source.connect('run-token')
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(fetchFn.mock.calls[1][0]).toBe('http://127.0.0.1:38471/v1/now-playing')
    expect((fetchFn.mock.calls[1][1]?.headers as Record<string, string>).Authorization).toBe('Bearer run-token')
    expect(source.getState()).toMatchObject({ title: 'Example title', artist: 'Example artist', playbackState: 'playing', position: 12.5 })
    expect(source.getStatus().status).toBe('connected-playing')
  })

  it('reports no current media without inventing metadata', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(response(healthyResponse)).mockResolvedValueOnce(response(noMedia))
    const { source } = sourceWith(fetchFn)
    await source.connect('run-token')
    expect(source.getStatus().status).toBe('no-media')
    expect(source.getState()).toEqual({ title: '', artist: '', playbackState: 'paused', position: 0 })
  })

  it('reports invalid tokens and media-access failures clearly', async () => {
    const unauthorized = sourceWith(vi.fn<typeof fetch>().mockResolvedValue(response({}, 401))).source
    await unauthorized.connect('bad-token')
    expect(unauthorized.getStatus().status).toBe('invalid-token')

    const unavailableFetch = vi.fn<typeof fetch>().mockResolvedValue(response(mediaAccessUnavailableResponse))
    const unavailable = sourceWith(unavailableFetch).source
    await unavailable.connect('run-token')
    expect(unavailable.getStatus().status).toBe('media-access-unavailable')
    expect(unavailableFetch).toHaveBeenCalledTimes(1)
  })

  it('does not allow a reset to be repopulated by a stale response', async () => {
    let resolveHealth!: (value: Response) => void
    const pending = new Promise<Response>((resolve) => { resolveHealth = resolve })
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(pending)
    const { source } = sourceWith(fetchFn)
    const connectPromise = source.connect('run-token')
    source.disconnect()
    resolveHealth(response(healthyResponse))
    await connectPromise
    expect(source.getStatus().status).toBe('disabled')
    expect(source.getState().title).toBe('')
  })

  it('prevents overlapping polls and cleans up on disconnect', async () => {
    let resolveHealth!: (value: Response) => void
    const pending = new Promise<Response>((resolve) => { resolveHealth = resolve })
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(pending)
    const { source } = sourceWith(fetchFn)
    const connectPromise = source.connect('run-token')
    await Promise.resolve()
    expect(fetchFn).toHaveBeenCalledTimes(1)
    source.disconnect()
    resolveHealth(response(healthyResponse))
    await connectPromise
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
