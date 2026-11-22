import { parseLrc } from './lrc-parser'
import { LrclibClient } from './lrclib-client'
import type { LyricsDocument } from './lyrics-types'
import type { LyricsSource, LyricsSourceRequest } from './lyrics-source'

export class LrclibLyricsSource implements LyricsSource {
  readonly id = 'lrclib'
  readonly displayName = 'LRCLIB'
  private readonly client: Pick<LrclibClient, 'getLyrics'>

  constructor(client: Pick<LrclibClient, 'getLyrics'> = new LrclibClient()) {
    this.client = client
  }

  async load(request: LyricsSourceRequest): Promise<LyricsDocument> {
    const title = request.title?.trim()
    const artist = request.artist?.trim()

    if (!title) throw new Error('Enter a track title before searching LRCLIB.')
    if (!artist) throw new Error('Enter an artist before searching LRCLIB.')
    if (!Number.isFinite(request.duration) || request.duration === undefined || request.duration <= 0) {
      throw new Error('Enter a positive duration in seconds before searching LRCLIB.')
    }

    const result = await this.client.getLyrics({
      trackName: title,
      artistName: artist,
      duration: request.duration,
    })

    if (!result.syncedLyrics?.trim()) {
      if (result.plainLyrics?.trim()) {
        throw new Error('LRCLIB returned untimed lyrics; untimed lyrics cannot yet be synchronized.')
      }
      throw new Error('LRCLIB did not return synchronized lyrics for this track.')
    }

    const lines = parseLrc(result.syncedLyrics)
    if (!lines.length) {
      throw new Error('LRCLIB returned synchronized lyrics that could not be parsed.')
    }

    return {
      lines,
      title: result.trackName,
      artist: result.artistName,
      duration: result.duration,
      sourceId: this.id,
    }
  }
}
