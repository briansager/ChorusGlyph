export type LyricWord = {
  text: string
  startTime: number
  endTime?: number
}

export type LyricLine = {
  id: string
  text: string
  startTime: number
  endTime?: number
  words?: LyricWord[]
}
