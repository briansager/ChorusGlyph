export type LyricCandidateKind = 'local' | 'user-provided' | 'remote'
export type LyricCandidateStatus = 'suggested' | 'selected' | 'rejected' | 'imported' | 'failed'

export type LyricCandidate = {
  id: string
  title?: string
  artist?: string
  album?: string
  language?: string
  duration?: number
  sourceName: string
  sourceUrl?: string
  sourceIdentifier?: string
  matchScore?: number
  matchingReasons: string[]
  kind: LyricCandidateKind
  status: LyricCandidateStatus
  requiresConfirmation: boolean
  requiresImport: boolean
  createdAt: number
  normalizedTitle: string
  normalizedArtist: string
  normalizedAlbum: string
}

export type LyricCandidateSearchFields = {
  title?: string
  artist?: string
}
