export type LrclibResponse = {
  id?: number
  trackName: string
  artistName: string
  albumName?: string
  duration: number
  instrumental: boolean
  hasWordSync?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
  lyricsfile?: string
}

export type LrclibLookup = {
  trackName: string
  artistName?: string
  duration: number
}

/** Search records can have unknown metadata. Never infer missing values. */
export type LrclibSearchResult = Omit<LrclibResponse, 'artistName' | 'albumName' | 'duration'> & {
  artistName?: string | null
  albumName?: string | null
  duration?: number | null
  language?: string | null
}
export type LrclibSearch = { trackName: string; artistName?: string }
/** Local snapshot, independent of active lyrics and subsequent suggestions. */
export type LyricMatchReference = {
  title?: string
  artist?: string
  album?: string
  duration?: number
  language?: string
}
