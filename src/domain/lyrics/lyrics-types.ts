import type { LyricLine, LyricWord } from './lyric-types'

export type LyricsDocument = {
  lines: LyricLine[]
  title?: string
  artist?: string
  duration?: number
  sourceId: string
}

export type { LyricLine, LyricWord }
