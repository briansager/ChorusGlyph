import type { LrclibLookup, LrclibResponse } from './lrclib-types'

export const LRCLIB_ENDPOINT = 'https://lrclib.net/api/get'
export const LRCLIB_CLIENT_HEADER = 'ChorusGlyph/0.1.0 (https://github.com/briansager/ChorusGlyph)'

export type LrclibErrorCode =
  | 'missing-input'
  | 'not-found'
  | 'rate-limit'
  | 'server-error'
  | 'network-error'
  | 'invalid-response'

export class LrclibError extends Error {
  readonly code: LrclibErrorCode
  readonly retryAfter?: string

  constructor(code: LrclibErrorCode, message: string, retryAfter?: string) {
    super(message)
    this.name = 'LrclibError'
    this.code = code
    this.retryAfter = retryAfter
  }
}

export type LrclibFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function validateResponse(value: unknown): LrclibResponse {
  if (!isRecord(value)) {
    throw new LrclibError('invalid-response', 'LRCLIB returned an invalid response object.')
  }

  const valid =
    (value.id === undefined || (typeof value.id === 'number' && Number.isInteger(value.id))) &&
    typeof value.trackName === 'string' &&
    typeof value.artistName === 'string' &&
    isOptionalString(value.albumName) &&
    typeof value.duration === 'number' &&
    Number.isFinite(value.duration) &&
    value.duration >= 0 &&
    typeof value.instrumental === 'boolean' &&
    (value.hasWordSync === undefined || typeof value.hasWordSync === 'boolean') &&
    (value.plainLyrics === undefined || value.plainLyrics === null || typeof value.plainLyrics === 'string') &&
    (value.syncedLyrics === undefined || value.syncedLyrics === null || typeof value.syncedLyrics === 'string') &&
    isOptionalString(value.lyricsfile)

  if (!valid) {
    throw new LrclibError('invalid-response', 'LRCLIB returned data with an invalid shape.')
  }

  return value as LrclibResponse
}

export class LrclibClient {
  private readonly fetchImpl: LrclibFetch

  constructor(fetchImpl: LrclibFetch = fetch) {
    this.fetchImpl = fetchImpl
  }

  async getLyrics(input: LrclibLookup): Promise<LrclibResponse> {
    const trackName = input.trackName.trim()
    const artistName = input.artistName?.trim() ?? ''

    if (!trackName || !Number.isFinite(input.duration) || input.duration <= 0) {
      throw new LrclibError('missing-input', 'Track title and a positive duration are required.')
    }

    const url = new URL(LRCLIB_ENDPOINT)
    url.searchParams.set('track_name', trackName)
    if (artistName) url.searchParams.set('artist_name', artistName)
    url.searchParams.set('duration', String(input.duration))

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { 'Lrclib-Client': LRCLIB_CLIENT_HEADER },
      })
    } catch {
      throw new LrclibError('network-error', 'Unable to reach LRCLIB. Check your connection and try again.')
    }

    if (response.status === 404) {
      throw new LrclibError('not-found', 'LRCLIB could not find a matching track.')
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') ?? undefined
      const waitMessage = retryAfter ? ` Try again after ${retryAfter}.` : ' Try again later.'
      throw new LrclibError('rate-limit', `LRCLIB rate-limited this lookup.${waitMessage}`, retryAfter)
    }

    if (response.status === 500 || response.status === 503) {
      const retryAfter = response.headers.get('Retry-After') ?? undefined
      const waitMessage = retryAfter ? ` Try again after ${retryAfter}.` : ' Try again later.'
      throw new LrclibError('server-error', `LRCLIB is temporarily unavailable.${waitMessage}`, retryAfter)
    }

    if (!response.ok) {
      throw new LrclibError('server-error', `LRCLIB returned HTTP ${response.status}.`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('json')) {
      throw new LrclibError('invalid-response', 'LRCLIB returned a non-JSON response.')
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new LrclibError('invalid-response', 'LRCLIB returned invalid JSON.')
    }

    return validateResponse(body)
  }
}
