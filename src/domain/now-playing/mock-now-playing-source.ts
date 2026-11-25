import type { NowPlayingSource } from './now-playing-source'
import type { NowPlayingState } from './now-playing-types'

export class MockNowPlayingSource implements NowPlayingSource {
  constructor(private state: NowPlayingState) {}
  getState(): NowPlayingState { return this.state }
  subscribe(listener: (state: NowPlayingState) => void): () => void {
    listener(this.state)
    return () => undefined
  }
  setState(state: NowPlayingState): void { this.state = state }
}
