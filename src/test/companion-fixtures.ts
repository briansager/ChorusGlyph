import type { CompanionHealthResponse, CompanionNowPlayingResponse } from '../domain/now-playing/windows-companion-types'

export const healthyResponse: CompanionHealthResponse = { healthy: true, status: 'ok' }
export const mediaAccessUnavailableResponse: CompanionHealthResponse = { healthy: false, error: 'media_access_unavailable' }

export const playingMedia: CompanionNowPlayingResponse = {
  available: true, revision: 1, sessionId: 'local-session', title: 'Example title', artist: 'Example artist',
  album: 'Example album', sourceApplication: 'Example.App', playbackState: 'playing', positionSeconds: 12.5,
  durationSeconds: 120, observedAtUtc: '2026-11-25T00:00:00Z',
}
export const pausedMedia: CompanionNowPlayingResponse = { ...playingMedia, revision: 2, playbackState: 'paused' }
export const noMedia: CompanionNowPlayingResponse = { available: false, revision: 3, playbackState: 'none', observedAtUtc: '2026-11-25T00:00:00Z' }
export const incompleteMedia: CompanionNowPlayingResponse = { available: true, revision: 4, playbackState: 'playing', observedAtUtc: '2026-11-25T00:00:00Z' }
export const changedRevisionMedia: CompanionNowPlayingResponse = { ...playingMedia, revision: 5, title: 'Another example' }
