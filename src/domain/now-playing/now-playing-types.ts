export type PlaybackState = 'playing' | 'paused'

export type NowPlayingState = {
  title: string
  artist: string
  duration?: number
  playbackState: PlaybackState
  position: number
}
