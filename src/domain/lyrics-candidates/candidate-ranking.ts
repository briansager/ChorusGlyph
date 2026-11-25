import type { LyricCandidate } from './lyric-candidate-types'
import { normalizeMetadata } from './metadata-normalization'

export type CandidateRankingInput = { title?: string; artist?: string; album?: string }

export function rankLyricCandidates(candidates: readonly LyricCandidate[], input: CandidateRankingInput): LyricCandidate[] {
  const title = normalizeMetadata(input.title).base.toLocaleLowerCase()
  const artist = normalizeMetadata(input.artist).base.toLocaleLowerCase()
  const album = normalizeMetadata(input.album).base.toLocaleLowerCase()

  return candidates.map((candidate) => {
    const candidateTitle = candidate.normalizedTitle || normalizeMetadata(candidate.title).base.toLocaleLowerCase()
    const candidateArtist = candidate.normalizedArtist || normalizeMetadata(candidate.artist).base.toLocaleLowerCase()
    const candidateAlbum = candidate.normalizedAlbum || normalizeMetadata(candidate.album).base.toLocaleLowerCase()
    const exactTitle = Boolean(title && candidateTitle === title)
    const exactArtist = Boolean(artist && candidateArtist === artist)
    const exactAlbum = Boolean(album && candidateAlbum === album)
    let matchScore = 0.2
    let matchingReasons = ['Weak or ambiguous metadata match.']

    if (exactTitle && exactArtist) {
      matchScore = 1
      matchingReasons = ['Title and artist match exactly.']
    } else if (exactTitle && (!artist || !candidateArtist)) {
      matchScore = 0.9
      matchingReasons = ['Title matches exactly; artist metadata is incomplete.']
    } else if (exactTitle && exactAlbum) {
      matchScore = 0.8
      matchingReasons = ['Title and album match; artist differs or is unavailable.']
    } else if (title && candidateTitle && (candidateTitle.includes(title) || title.includes(candidateTitle))) {
      matchScore = 0.5
      matchingReasons = ['Title partially matches. Confirm the candidate before importing.']
    }

    return { ...candidate, matchScore, matchingReasons, status: 'suggested' as const, requiresConfirmation: matchScore < 1 }
  }).sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0))
}
