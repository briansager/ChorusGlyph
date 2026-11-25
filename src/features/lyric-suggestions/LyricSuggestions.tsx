import { useRef } from 'react'
import { Icon } from '../../shared/ui/Icon'
import type { CompanionStatus } from '../../domain/now-playing/windows-companion-types'
import type { LyricCandidate, LyricCandidateSearchFields } from '../../domain/lyrics-candidates/lyric-candidate-types'
import type { LyricSuggestionState } from './lyric-suggestion-state'

type Props = {
  state: LyricSuggestionState
  companionStatus: CompanionStatus
  onSelect: (candidateId: string) => void
  onEdit: (candidateId: string, fields: LyricCandidateSearchFields) => void
  onDismiss: () => void
  onImportSearch: (candidateId: string) => void
}

function companionMessage(status: CompanionStatus['status']): string {
  if (status === 'disabled') return 'No song suggestions. Load lyrics manually or connect the optional Windows companion.'
  if (status === 'no-media') return 'No active media session was detected.'
  if (status === 'offline') return 'Suggestions are unavailable while the companion is offline.'
  if (status === 'media-access-unavailable') return 'The companion cannot access Windows media sessions.'
  if (status === 'invalid-token') return 'The companion token was rejected.'
  if (status === 'malformed') return 'The companion returned incomplete metadata.'
  return 'No lyric candidate is available yet.'
}

function CandidateCard({ candidate, state, onSelect, onEdit, onImportSearch, onDismiss }: {
  candidate: LyricCandidate
  state: LyricSuggestionState
  onSelect: Props['onSelect']
  onEdit: Props['onEdit']
  onImportSearch: Props['onImportSearch']
  onDismiss: Props['onDismiss']
}) {
  const isDemo = candidate.sourceIdentifier === 'ChorusGlyph Demo Mode'
  const isSelected = state.selectedCandidateId === candidate.id
  const isEditing = state.status === 'edited' && state.selectedCandidateId === candidate.id
  const fields = state.searchFields ?? { title: candidate.title, artist: candidate.artist }
  return (
    <article className="candidate-card" data-selected={isSelected}>
      <p className="category"><Icon name="currentSong" /> Suggested song · Metadata only</p>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-blue-100">{candidate.title || 'Untitled candidate'}</h3>
          <p className="mt-1 text-sm text-slate-300">{candidate.artist || 'Artist unavailable'}</p>
          {candidate.album && <p className="mt-1 text-xs text-slate-500">Album: {candidate.album}</p>}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-400">Source: {isDemo ? 'Demo metadata · Simulated Windows companion' : candidate.sourceName}{candidate.sourceIdentifier && !isDemo ? ` · ${candidate.sourceIdentifier}` : ''}</p>
      {candidate.id.startsWith('companion:') && candidate.matchScore !== undefined && <p className="helper">{isDemo ? 'Demo confidence data' : 'Metadata completeness'}: {Math.round(candidate.matchScore * 100)}%. At suggestion time, title and artist present score 100%; title alone scores 65%. This is not a verified lyric match.</p>}
      <p className="helper">Active lyrics remain unchanged.</p>
      {isEditing && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-300">Title<input aria-label="Edit candidate title" value={fields.title ?? ''} onChange={(event) => onEdit(candidate.id, { ...fields, title: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
          <label className="text-xs text-slate-300">Artist<input aria-label="Edit candidate artist" value={fields.artist ?? ''} onChange={(event) => onEdit(candidate.id, { ...fields, artist: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
        </div>
      )}
      <div className="candidate-actions">
        <button type="button" className="primary" onClick={() => onImportSearch(candidate.id)}><Icon name="search" />Prepare lyric search</button>
        <button type="button" onClick={() => onEdit(candidate.id, fields)}><Icon name="edit" />Edit details</button>
        <button type="button" aria-pressed={isSelected} onClick={() => onSelect(candidate.id)}><Icon name="supported" />{isSelected ? 'Suggestion selected' : 'Select suggestion'}</button>
        <button type="button" className="quiet" onClick={onDismiss}><Icon name="cancel" />Dismiss</button>
      </div>
      <p className="helper">Fills the LRCLIB search form. No search runs until you choose Search LRCLIB.</p>
    </article>
  )
}

export function LyricSuggestions({ state, companionStatus, onSelect, onEdit, onDismiss, onImportSearch }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dismiss = () => { onDismiss(); headingRef.current?.focus() }
  const candidates = state.candidates.slice(0, 3)
  return (
    <section className="rounded-2xl border border-blue-800/60 bg-blue-950/20 p-5 sm:p-7" aria-labelledby="lyric-suggestions-heading">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Metadata only</p>
      <h2 ref={headingRef} tabIndex={-1} id="lyric-suggestions-heading" className="mt-1 text-xl font-semibold text-white">Song suggestions</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Suggestions contain song details only. They do not replace your active lyrics.</p>
      {state.status === 'error' && <p role="alert" className="mt-3 text-sm text-red-200">{state.error}</p>}
      {state.status === 'dismissed' && <p role="status" className="mt-3 text-sm text-slate-300">Candidate dismissed.</p>}
      {candidates.length === 0 && state.status !== 'dismissed' && <p role="status" className="mt-3 text-sm text-slate-300">{companionMessage(companionStatus.status)}</p>}
      {candidates.length > 0 && (
        <div className="mt-4 grid gap-3" aria-label="Lyric candidates">
          {candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} state={state} onSelect={onSelect} onEdit={onEdit} onImportSearch={onImportSearch} onDismiss={dismiss} />)}
        </div>
      )}
      {state.status === 'suggested' && candidates.length > 0 && <p role="status" className="sr-only">Song suggestion available: {candidates[0].title || 'Untitled suggestion'}. Active lyrics remain unchanged.</p>}
    </section>
  )
}
