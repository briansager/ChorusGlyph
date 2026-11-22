import type { NowPlayingState } from './now-playing-types'

export interface NowPlayingSource {
  getState(): NowPlayingState
  subscribe(listener: (state: NowPlayingState) => void): () => void
}
