import { describe, expect, it } from 'vitest'
import { createCandidateFromCompanionMedia, getCompanionMediaIdentity } from '../domain/lyrics-candidates/companion-candidate'
import { rankLyricCandidates } from '../domain/lyrics-candidates/candidate-ranking'
import type { LyricCandidate } from '../domain/lyrics-candidates/lyric-candidate-types'
import { normalizeMetadata } from '../domain/lyrics-candidates/metadata-normalization'
import { initialLyricSuggestionState, lyricSuggestionReducer } from '../features/lyric-suggestions/lyric-suggestion-state'
import { changedRevisionMedia, incompleteMedia, noMedia, playingMedia } from './companion-fixtures'

function candidate(id: string, title: string, artist?: string, album?: string): LyricCandidate {
  return {
    id, title, artist, album, sourceName: 'Self-written fixture', kind: 'user-provided', status: 'suggested',
    requiresConfirmation: true, requiresImport: true, createdAt: 1, matchingReasons: [],
    normalizedTitle: normalizeMetadata(title).base.toLocaleLowerCase(),
    normalizedArtist: normalizeMetadata(artist).base.toLocaleLowerCase(),
    normalizedAlbum: normalizeMetadata(album).base.toLocaleLowerCase(),
  }
}

describe('lyric candidate foundation', () => {
  it('normalizes punctuation and Unicode while preserving display values', () => {
    const normalized = normalizeMetadata('  Demo “Morning” — Track  ')
    expect(normalized.display).toBe('Demo “Morning” — Track')
    expect(normalized.comparison).toContain('demo “morning” - track')
  })

  it.each(['Demo Track (Live)', 'Demo Track [Remix]', 'Demo Track (Instrumental)', 'Demo Track (Karaoke)'])('handles %s conservatively', (value) => {
    const normalized = normalizeMetadata(value)
    expect(normalized.base).toBe('Demo Track')
    expect(normalized.display).toBe(value)
    expect(normalized.qualifiers).toHaveLength(1)
  })

  it('handles featuring suffixes without changing the display title', () => {
    const normalized = normalizeMetadata('Demo Track feat. Example Artist')
    expect(normalized.base).toBe('Demo Track')
    expect(normalized.display).toBe('Demo Track feat. Example Artist')
  })

  it('handles missing title and artist without inventing metadata', () => {
    expect(createCandidateFromCompanionMedia({ ...incompleteMedia, title: null })).toMatchObject({ reason: 'missing-title' })
    const result = createCandidateFromCompanionMedia({ ...playingMedia, artist: null })
    expect(result.candidate).toMatchObject({ title: 'Example title', artist: undefined })
    expect(result.candidate?.requiresConfirmation).toBe(true)
  })

  it('creates a candidate only for a usable media identity', () => {
    expect(createCandidateFromCompanionMedia(noMedia).candidate).toBeUndefined()
    expect(createCandidateFromCompanionMedia(playingMedia, 100).candidate?.createdAt).toBe(100)
    expect(getCompanionMediaIdentity(playingMedia)).toBe(getCompanionMediaIdentity({ ...playingMedia, revision: 99, positionSeconds: 80 }))
    expect(getCompanionMediaIdentity(playingMedia)).not.toBe(getCompanionMediaIdentity(changedRevisionMedia))
  })

  it('ranks exact, album, partial, and ambiguous candidates deterministically', () => {
    const candidates = [
      candidate('partial', 'Demo Morning', 'Other Artist'),
      candidate('album', 'Demo Track', 'Other Artist', 'Demo Album'),
      candidate('exact', 'Demo Track', 'Example Artist'),
    ]
    const ranked = rankLyricCandidates(candidates, { title: 'Demo Track', artist: 'Example Artist', album: 'Demo Album' })
    expect(ranked.map((item) => item.id)).toEqual(['exact', 'album', 'partial'])
    expect(ranked[0].matchScore).toBe(1)
    expect(ranked[2].requiresConfirmation).toBe(true)
  })

  it('supports dismissal, selection, editing, and import/search without lyric content', () => {
    const item = candidate('one', 'Demo Track', 'Example Artist')
    const suggested = lyricSuggestionReducer(initialLyricSuggestionState, { type: 'suggest', candidates: [item] })
    const selected = lyricSuggestionReducer(suggested, { type: 'select', candidateId: item.id })
    expect(selected.status).toBe('selected')
    const edited = lyricSuggestionReducer(selected, { type: 'edit', candidateId: item.id, fields: { title: 'Edited Demo' } })
    expect(edited.status).toBe('edited')
    const imported = lyricSuggestionReducer(edited, { type: 'request-import-search', candidateId: item.id })
    expect(imported.searchFields).toEqual({ title: 'Edited Demo', artist: 'Example Artist' })
    expect(imported).not.toHaveProperty('lines')
    expect(lyricSuggestionReducer(imported, { type: 'dismiss' }).status).toBe('dismissed')
  })

  it('does not make network requests while creating candidates', () => {
    const result = createCandidateFromCompanionMedia(playingMedia)
    expect(result.candidate?.sourceName).toBe('Windows companion')
  })
})
