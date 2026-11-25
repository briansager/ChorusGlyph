import type { CompanionNowPlayingResponse, CompanionStatus } from './windows-companion-types'
import type { NowPlayingState } from './now-playing-types'
import { MockNowPlayingSource } from './mock-now-playing-source'

export const demoNowPlayingState: NowPlayingState = {
  title: 'Demo morning track',
  artist: 'ChorusGlyph Demo',
  playbackState: 'playing',
  position: 12,
  duration: 120,
}

export const demoNowPlayingMedia: CompanionNowPlayingResponse = {
  available: true,
  revision: 100,
  sessionId: 'development-demo-session',
  title: demoNowPlayingState.title,
  artist: demoNowPlayingState.artist,
  album: 'Self-written Demo Album',
  sourceApplication: 'ChorusGlyph Demo Mode',
  playbackState: 'playing',
  positionSeconds: demoNowPlayingState.position,
  durationSeconds: demoNowPlayingState.duration,
  observedAtUtc: '2026-11-25T00:00:00Z',
}

export const demoNowPlayingSource = new MockNowPlayingSource(demoNowPlayingState)

export function getDemoNowPlayingStatus(): CompanionStatus {
  const state = demoNowPlayingSource.getState()
  return {
    status: state.playbackState === 'playing' ? 'connected-playing' : 'connected-paused',
    message: 'Development demo now-playing data is active.',
    media: {
      ...demoNowPlayingMedia,
      title: state.title,
      artist: state.artist,
      playbackState: state.playbackState,
      positionSeconds: state.position,
      durationSeconds: state.duration,
    },
  }
}
