import { parseLrc } from './lrc-parser'
import type { LyricsDocument } from './lyrics-types'
import type { LyricsSource, LyricsSourceRequest } from './lyrics-source'

export class PasteTextLyricsSource implements LyricsSource {
  readonly id = 'paste-text'
  readonly displayName = 'Pasted text'

  async load(request: LyricsSourceRequest): Promise<LyricsDocument> {
    const text = request.text?.trim()
    if (!text) {
      throw new Error('Paste timed LRC text before loading lyrics.')
    }

    const lines = parseLrc(text)
    if (!lines.length) {
      throw new Error('Pasted text must contain valid timed LRC lines.')
    }

    return {
      lines,
      title: request.title?.trim() || undefined,
      artist: request.artist?.trim() || undefined,
      duration: request.duration,
      sourceId: this.id,
    }
  }
}
