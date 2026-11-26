import { describe, expect, it, vi } from 'vitest'
import {
  LRCLIB_CLIENT_HEADER,
  LRCLIB_ENDPOINT,
  LRCLIB_SEARCH_ENDPOINT,
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

  it('omits the artist query when title-only lookup is requested', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(responseBody))
    const client = new LrclibClient(fetchMock)

    await client.getLyrics({ trackName: 'Track', duration: 10 })

    const url = new URL(fetchMock.mock.calls[0][0].toString())
    expect(url.searchParams.get('track_name')).toBe('Track')
    expect(url.searchParams.has('artist_name')).toBe(false)
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
  it('searches the stable multi-result endpoint with one explicit request and the existing client header', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([responseBody, { ...responseBody, id: 43 }]))
    const client = new LrclibClient(fetchMock)
    expect(fetchMock).not.toHaveBeenCalled()
    const results = await client.searchLyrics({ trackName: '  Demo track  ', artistName: ' Demo artist ' })
    expect(results).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [requestUrl, init] = fetchMock.mock.calls[0]
    const url = new URL(requestUrl.toString())
    expect(url.origin + url.pathname).toBe(LRCLIB_SEARCH_ENDPOINT)
    expect(Object.fromEntries(url.searchParams)).toEqual({ track_name: 'Demo track', artist_name: 'Demo artist' })
    expect(init?.headers).toEqual({ 'Lrclib-Client': LRCLIB_CLIENT_HEADER })
  })

  it('allows a title-only search and incomplete result metadata', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([{ ...responseBody, artistName: null, albumName: null, duration: null }]))
    const result = await new LrclibClient(fetchMock).searchLyrics({ trackName: 'Track' })
    expect(result[0]).toMatchObject({ artistName: null, duration: null })
    expect(new URL(fetchMock.mock.calls[0][0].toString()).searchParams.has('artist_name')).toBe(false)
  })

  it('blocks an empty title before making any search request', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    await expect(new LrclibClient(fetchMock).searchLyrics({ trackName: ' ' })).rejects.toMatchObject({ code: 'missing-input' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([[], null, {}, [{ ...responseBody, duration: '120' }], [{ ...responseBody, language: 2 }]])('validates search response shape %s', async (body) => {
    const client = new LrclibClient(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body)))
    if (Array.isArray(body) && body.length === 0) await expect(client.searchLyrics({ trackName: 'Track' })).resolves.toEqual([])
    else await expect(client.searchLyrics({ trackName: 'Track' })).rejects.toMatchObject({ code: 'invalid-response' })
  })

  it('returns no results for a search 404 and surfaces rate-limit recovery without automatic retries', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '30' } }))
    const client = new LrclibClient(fetchMock)
    await expect(client.searchLyrics({ trackName: 'Track' })).resolves.toEqual([])
    await expect(client.searchLyrics({ trackName: 'Track' })).rejects.toMatchObject({ code: 'rate-limit', retryAfter: '30' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('invokes the default native fetch with the global receiver for lookup and search', async () => {
    const fetchMock = vi.fn(function(this: unknown, input: RequestInfo | URL) {
      expect(this).toBe(globalThis)
      return Promise.resolve(jsonResponse(new URL(input.toString()).pathname.endsWith('/search') ? [responseBody] : responseBody))
    })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const client = new LrclibClient()
      await client.getLyrics({ trackName: 'Track', duration: 120 })
      await client.searchLyrics({ trackName: 'Track' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally { vi.unstubAllGlobals() }
  })

})
