import type { CompanionNowPlayingResponse } from '../now-playing/windows-companion-types'
import type { LyricCandidate } from './lyric-candidate-types'
import { normalizeMetadata } from './metadata-normalization'

export type CompanionCandidateResult = {
  candidate?: LyricCandidate
  identity?: string
  reason?: 'no-media' | 'missing-title'
}

export function getCompanionMediaIdentity(media: CompanionNowPlayingResponse): string {
  const title = normalizeMetadata(media.title).comparison
  const artist = normalizeMetadata(media.artist).comparison
  const album = normalizeMetadata(media.album).comparison
  const source = normalizeMetadata(media.sourceApplication).comparison
  return [media.sessionId ?? '', title, artist, album, source].join('|')
}

export function createCandidateFromCompanionMedia(media: CompanionNowPlayingResponse, now = Date.now()): CompanionCandidateResult {
  if (!media.available) return { reason: 'no-media' }
  const title = normalizeMetadata(media.title)
  if (!title.display) return { identity: getCompanionMediaIdentity(media), reason: 'missing-title' }
  const artist = normalizeMetadata(media.artist)
  const album = normalizeMetadata(media.album)
  const identity = getCompanionMediaIdentity(media)

  return {
    identity,
    candidate: {
      id: `companion:${identity}`,
      title: title.display,
      artist: artist.display || undefined,
      album: album.display || undefined,
      sourceName: 'Windows companion',
      ...(typeof media.durationSeconds === 'number' && Number.isFinite(media.durationSeconds) && media.durationSeconds > 0 ? { duration: media.durationSeconds } : {}),
      sourceIdentifier: media.sourceApplication ?? undefined,
      matchScore: artist.display ? 1 : 0.65,
      matchingReasons: artist.display
        ? ['Title and artist were provided by the Windows companion.']
        : ['Title was provided by the Windows companion; artist metadata is missing.'],
      kind: 'local',
      status: 'suggested',
      requiresConfirmation: true,
      requiresImport: true,
      createdAt: now,
      normalizedTitle: title.base.toLocaleLowerCase(),
      normalizedArtist: artist.base.toLocaleLowerCase(),
      normalizedAlbum: album.base.toLocaleLowerCase(),
    },
  }
}
