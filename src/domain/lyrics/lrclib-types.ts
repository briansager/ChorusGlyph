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
  artistName: string
  duration: number
}
