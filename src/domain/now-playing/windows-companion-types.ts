export type CompanionConnectionStatus =
  | 'disabled'
  | 'connecting'
  | 'connected-playing'
  | 'connected-paused'
  | 'no-media'
  | 'offline'
  | 'invalid-token'
  | 'media-access-unavailable'
  | 'malformed'

export type CompanionHealthResponse = {
  healthy: boolean
  status?: string
  error?: string | null
}

export type CompanionNowPlayingResponse = {
  available: boolean
  revision: number
  sessionId?: string | null
  title?: string | null
  artist?: string | null
  album?: string | null
  sourceApplication?: string | null
  playbackState: 'playing' | 'paused' | 'stopped' | 'none' | 'unknown'
  positionSeconds?: number | null
  durationSeconds?: number | null
  observedAtUtc: string
}

export type CompanionStatus = {
  status: CompanionConnectionStatus
  message: string
  media?: CompanionNowPlayingResponse
}
