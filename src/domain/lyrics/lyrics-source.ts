import type { LyricsDocument } from './lyrics-types'

export type LyricsSourceRequest = {
  text?: string
  file?: File
  title?: string
  artist?: string
  duration?: number
}

export interface LyricsSource {
  id: string
  displayName: string
  load(request: LyricsSourceRequest): Promise<LyricsDocument>
}
