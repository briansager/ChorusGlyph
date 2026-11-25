import type { LyricCandidate, LyricCandidateSearchFields } from '../../domain/lyrics-candidates/lyric-candidate-types'

export type LyricSuggestionState = {
  status: 'none' | 'suggested' | 'selected' | 'edited' | 'dismissed' | 'import-search-requested' | 'error'
  candidates: LyricCandidate[]
  selectedCandidateId?: string
  searchFields?: LyricCandidateSearchFields
  error?: string
}

export const initialLyricSuggestionState: LyricSuggestionState = { status: 'none', candidates: [] }

export type LyricSuggestionAction =
  | { type: 'suggest'; candidates: LyricCandidate[] }
  | { type: 'select'; candidateId: string }
  | { type: 'edit'; candidateId: string; fields: LyricCandidateSearchFields }
  | { type: 'dismiss' }
  | { type: 'request-import-search'; candidateId: string }
  | { type: 'error'; message: string }

export function lyricSuggestionReducer(state: LyricSuggestionState, action: LyricSuggestionAction): LyricSuggestionState {
  switch (action.type) {
    case 'suggest': return { status: action.candidates.length ? 'suggested' : 'none', candidates: action.candidates }
    case 'select': return {
      ...state,
      status: 'selected',
      selectedCandidateId: action.candidateId,
      candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: 'selected' } : candidate),
    }
    case 'edit': return {
      ...state,
      status: 'edited',
      selectedCandidateId: action.candidateId,
      searchFields: action.fields,
      candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, ...action.fields, status: 'selected' } : candidate),
    }
    case 'dismiss': return { status: 'dismissed', candidates: [] }
    case 'request-import-search': {
      const candidate = state.candidates.find((item) => item.id === action.candidateId)
      return candidate ? { ...state, status: 'import-search-requested', selectedCandidateId: candidate.id, searchFields: { title: candidate.title, artist: candidate.artist } } : state
    }
    case 'error': return { ...state, status: 'error', error: action.message }
  }
}
