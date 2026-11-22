import { describe, expect, it, vi } from 'vitest'
import {
  LRCLIB_CLIENT_HEADER,
  LRCLIB_ENDPOINT,
  LrclibClient,
  LrclibError,
} from '../domain/lyrics/lrclib-client'

const responseBody = {
  id: 42,
  trackName: 'Original demo track',
  artistName: 'ChorusGlyph Demo',
  albumName: 'A Self-Written Test',
  duration: 123.5,
  instrumental: false,
  hasWordSync: false,
  plainLyrics: 'Original demo line',
  syncedLyrics: '[00:00.00]Blue morning starts\n[00:03.00]Small lights cross the sky',
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('LrclibClient', () => {
  it('builds the lookup URL and sends the browser-compatible client header', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(responseBody))
    const client = new LrclibClient(fetchMock)

    await client.getLyrics({ trackName: 'Demo track', artistName: 'Demo artist', duration: 123.5 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]
    const url = new URL(requestUrl.toString())
    expect(url.origin + url.pathname).toBe(LRCLIB_ENDPOINT)
    expect(url.searchParams.get('track_name')).toBe('Demo track')
    expect(url.searchParams.get('artist_name')).toBe('Demo artist')
    expect(url.searchParams.get('duration')).toBe('123.5')
    expect(requestInit?.headers).toEqual({ 'Lrclib-Client': LRCLIB_CLIENT_HEADER })
  })

  it('returns a validated JSON response', async () => {
    const client = new LrclibClient(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(responseBody)))

    await expect(client.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).resolves.toMatchObject({
      trackName: 'Original demo track',
      syncedLyrics: expect.stringContaining('Blue morning starts'),
    })
  })

  it('rejects missing search input', async () => {
    const client = new LrclibClient(vi.fn<typeof fetch>())

    await expect(client.getLyrics({ trackName: '', artistName: 'Artist', duration: 10 })).rejects.toMatchObject({
      code: 'missing-input',
    })
    expect(client).toBeInstanceOf(LrclibClient)
  })

  it('handles not found responses', async () => {
    const client = new LrclibClient(vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 })))

    await expect(client.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).rejects.toMatchObject({
      code: 'not-found',
      message: 'LRCLIB could not find a matching track.',
    })
  })

  it('handles rate limiting and extracts Retry-After', async () => {
    const client = new LrclibClient(
      vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '30' } })),
    )

    await expect(client.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).rejects.toEqual(
      expect.objectContaining({ code: 'rate-limit', retryAfter: '30' }),
    )
  })

  it.each([500, 503])('handles server status %s', async (status) => {
    const client = new LrclibClient(vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status })))

    await expect(client.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).rejects.toMatchObject({
      code: 'server-error',
    })
  })

  it('handles network failures', async () => {
    const client = new LrclibClient(vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))

    await expect(client.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).rejects.toMatchObject({
      code: 'network-error',
    })
  })

  it('rejects invalid JSON and invalid response data', async () => {
    const invalidJsonClient = new LrclibClient(
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response('{not json', { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    )
    await expect(invalidJsonClient.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).rejects.toMatchObject({
      code: 'invalid-response',
    })

    const invalidShapeClient = new LrclibClient(
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ trackName: 'Only a partial response' })),
    )
    await expect(invalidShapeClient.getLyrics({ trackName: 'Track', artistName: 'Artist', duration: 10 })).rejects.toBeInstanceOf(
      LrclibError,
    )
  })
})
