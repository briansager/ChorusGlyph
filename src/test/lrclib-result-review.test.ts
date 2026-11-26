import { describe, expect, it } from 'vitest'
import type { LrclibSearchResult } from '../domain/lyrics/lrclib-types'
import { compareLyricResult, reviewLyricResults } from '../features/lyrics-source/lrclib-result-review'

const record: LrclibSearchResult = {
  trackName: 'Ａ Morning — Song', artistName: 'Original Artist', albumName: 'Demo Album', duration: 120, language: 'ja',
  instrumental: false, syncedLyrics: '[00:00.00]My original line',
}
const reference = { title: 'A Morning - Song', artist: 'original artist', album: 'Demo Album', duration: 122, language: 'Japanese' }

describe('LRCLIB result metadata review', () => {
  it('compares normalized title, artist, album, duration and language without a probability claim', () => {
    const match = compareLyricResult(record, reference)
    expect(match.reasons).toEqual(expect.arrayContaining([
      'Title matches after normalization.', 'Artist matches after normalization.', 'Album matches after normalization.',
      'Duration is within 2 seconds (2.0s difference).', 'Language metadata agrees.',
    ]))
    expect(match.label).toBe('Metadata aligns — review lyrics')
    expect(match.languageMismatch).toBe(false)
  })
  it('preserves edition differences rather than treating the base title as an exact match', () => {
    const match = compareLyricResult({ ...record, trackName: 'Morning (Live)' }, { title: 'Morning' })
    expect(match.reasons).toContain('The base title is similar, but version or featuring labels differ.')
    expect(match.label).toBe('Metadata differences — review carefully')
  })
  it('reports explicit album, artist, duration and language differences', () => {
    const match = compareLyricResult({ ...record, artistName: 'Other', albumName: 'Other', duration: 130, language: 'zh' }, reference)
    expect(match.languageMismatch).toBe(true)
    expect(match.reasons).toEqual(expect.arrayContaining([
      'Artist differs from the reference song.', 'Album differs from the reference song.',
      'Duration differs by more than 2 seconds (8.0s difference).',
    ]))
  })
  it('does not infer language from Han-only or other lyric text', () => {
    const match = compareLyricResult({ ...record, language: undefined, syncedLyrics: '[00:00.00]東京' }, reference)
    expect(match.languageMismatch).toBe(false)
    expect(match.reasons).toContain('Result language not provided; cannot verify language.')
  })
  it('keeps stable order for equal scores and ranks available metadata agreements first', () => {
    const review = reviewLyricResults([{ ...record, trackName: 'Wrong' }, record, { ...record, syncedLyrics: '[00:02.00]Another version' }], reference, true)
    expect(review.results.map((r) => r.key)).toEqual(['result-1', 'result-2', 'result-0'])
    expect(review.reference).toEqual(reference)
    expect(review.reference).not.toBe(reference)
  })
  it('groups repeated content across record IDs but preserves different lyrics and timing', () => {
    const review = reviewLyricResults([record, { ...record, id: 2 }, { ...record, syncedLyrics: '[00:01.00]My original line' }, { ...record, syncedLyrics: '[00:00.00]Different lyrics' }], reference, true)
    expect(review.results).toHaveLength(3)
    expect(review.duplicateCount).toBe(1)
    expect(review.results[0].duplicateCount).toBe(2)
  })
  it('never constructs a loadable document from unsynchronized or invalid lyric text', () => {
    const review = reviewLyricResults([{ ...record, syncedLyrics: null, plainLyrics: 'My line' }, { ...record, syncedLyrics: 'invalid timing' }], {}, false)
    expect(review.results.every((r) => !r.document && r.unavailableReason)).toBe(true)
  })
})
