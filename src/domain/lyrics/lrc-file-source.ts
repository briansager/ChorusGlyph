import { parseLrc } from './lrc-parser'
import type { LyricsDocument } from './lyrics-types'
import type { LyricsSource, LyricsSourceRequest } from './lyrics-source'

export class LrcFileLyricsSource implements LyricsSource {
  readonly id = 'lrc-file'
  readonly displayName = 'Local LRC file'

  async load(request: LyricsSourceRequest): Promise<LyricsDocument> {
    if (!request.file) {
      throw new Error('Choose an LRC file before loading lyrics.')
    }

    const text = await request.file.text()
    if (!text.trim()) {
      throw new Error('The selected LRC file is empty.')
    }

    const lines = parseLrc(text)
    if (!lines.length) {
      throw new Error('The selected file does not contain valid timed LRC lines.')
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
