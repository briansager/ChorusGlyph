import { normalizeMetadata } from '../../domain/lyrics-candidates/metadata-normalization'
import { createLrclibDocument } from '../../domain/lyrics/lrclib-source'
import type { LyricMatchReference, LrclibSearchResult } from '../../domain/lyrics/lrclib-types'
import type { LyricsDocument } from '../../domain/lyrics/lyrics-types'

export type ResultMatch = { label: string; reasons: string[]; score: number; languageMismatch: boolean }
export type ReviewedLyricResult = {
  key: string
  record: LrclibSearchResult
  match: ResultMatch
  document?: LyricsDocument
  unavailableReason?: string
  duplicateCount: number
}
export type LyricSearchReview = {
  reference: LyricMatchReference
  fromCandidate: boolean
  results: ReviewedLyricResult[]
  duplicateCount: number
}

const normalized = (value?: string | null) => normalizeMetadata(value).comparison
const languages: Record<string, string> = {
  ja: 'ja', jpn: 'ja', japanese: 'ja', zh: 'zh', zho: 'zh', chi: 'zh', chinese: 'zh',
  ko: 'ko', kor: 'ko', korean: 'ko', th: 'th', tha: 'th', thai: 'th', en: 'en', eng: 'en', english: 'en',
}
const languageKey = (value?: string | null) => {
  const key = value?.trim().toLowerCase().split(/[-_]/)[0] ?? ''
  return languages[key] ?? key
}

export function compareLyricResult(record: LrclibSearchResult, reference: LyricMatchReference): ResultMatch {
  const reasons: string[] = []
  let score = 0
  let matches = 0
  let differences = 0
  const compare = (label: string, expected: string, actual: string, weight: number) => {
    if (!expected) reasons.push(label + ' not provided for the reference song; not compared.')
    else if (!actual) reasons.push(label + ' missing from this result; cannot compare.')
    else if (expected === actual) {
      reasons.push(label + ' matches after normalization.')
      matches++
      score += weight
    } else {
      reasons.push(label + ' differs from the reference song.')
      differences++
      score -= weight
    }
  }
  compare('Title', normalized(reference.title), normalized(record.trackName), 3)
  if (normalized(reference.title) !== normalized(record.trackName) &&
      normalizeMetadata(reference.title).base.toLowerCase() === normalizeMetadata(record.trackName).base.toLowerCase()) {
    reasons.push('The base title is similar, but version or featuring labels differ.')
  }
  compare('Artist', normalized(reference.artist), normalized(record.artistName), 2)
  compare('Album', normalized(reference.album), normalized(record.albumName), 1)
  if (!reference.duration || !Number.isFinite(reference.duration) || reference.duration <= 0) reasons.push('Reference duration unavailable; not compared.')
  else if (!record.duration || record.duration <= 0) reasons.push('Result duration unavailable; cannot compare.')
  else {
    const difference = Math.abs(reference.duration - record.duration)
    const close = difference <= 2
    reasons.push('Duration ' + (close ? 'is within 2 seconds' : 'differs by more than 2 seconds') + ' (' + difference.toFixed(1) + 's difference).')
    if (close) { matches++; score++ } else { differences++; score-- }
  }
  const expectedLanguage = languageKey(reference.language)
  const actualLanguage = languageKey(record.language)
  const languageMismatch = Boolean(expectedLanguage && actualLanguage && expectedLanguage !== actualLanguage)
  if (!expectedLanguage) reasons.push('Reference language unavailable; not compared.')
  else if (!actualLanguage) reasons.push('Result language not provided; cannot verify language.')
  else {
    reasons.push(languageMismatch ? 'Language differs: expected ' + reference.language + ', result ' + record.language + '.' : 'Language metadata agrees.')
    if (languageMismatch) { differences++; score -= 2 } else { matches++; score++ }
  }
  return {
    label: differences ? 'Metadata differences — review carefully' : matches ? 'Metadata aligns — review lyrics' : 'Limited metadata to compare',
    reasons, score, languageMismatch,
  }
}

/** Group identical content, keeping different timings, editions and translations separate. */
export function reviewLyricResults(records: LrclibSearchResult[], reference: LyricMatchReference, fromCandidate: boolean): LyricSearchReview {
  const unique = new Map<string, ReviewedLyricResult>()
  const lyricText = (value?: string | null) => value?.replace(/\r\n/g, '\n').trim() ?? ''
  records.forEach((record, index) => {
    const fingerprint = JSON.stringify([
      normalized(record.trackName), normalized(record.artistName), normalized(record.albumName),
      record.duration ?? null, languageKey(record.language), record.instrumental,
      lyricText(record.syncedLyrics), lyricText(record.plainLyrics),
    ])
    const existing = unique.get(fingerprint)
    if (existing) { existing.duplicateCount++; return }
    let document: LyricsDocument | undefined
    let unavailableReason: string | undefined
    try { document = createLrclibDocument(record) }
    catch (error) { unavailableReason = error instanceof Error ? error.message : 'No usable timed lyrics.' }
    unique.set(fingerprint, {
      key: 'result-' + index, record, document, unavailableReason, duplicateCount: 1,
      match: compareLyricResult(record, reference),
    })
  })
  const results = [...unique.values()].sort((a, b) => b.match.score - a.match.score)
  return { reference: { ...reference }, fromCandidate, results, duplicateCount: records.length - results.length }
}
