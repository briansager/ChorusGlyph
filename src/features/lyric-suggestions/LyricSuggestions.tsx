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
  if (status === 'disabled') return 'Connect the Windows companion to suggest lyrics.'
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
  const isEditing = state.status === 'edited' && state.selectedCandidateId === candidate.id
  const fields = state.searchFields ?? { title: candidate.title, artist: candidate.artist }
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-blue-100">{candidate.title || 'Untitled candidate'}</h3>
          <p className="mt-1 text-sm text-slate-300">{candidate.artist || 'Artist unavailable'}</p>
          {candidate.album && <p className="mt-1 text-xs text-slate-500">Album: {candidate.album}</p>}
        </div>
        <span className="rounded-full border border-blue-700/70 px-2 py-1 text-xs text-blue-200">
          {Math.round((candidate.matchScore ?? 0) * 100)}% confidence
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-400">Source: {candidate.sourceName}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
        {candidate.matchingReasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      {isEditing && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-300">Title<input aria-label="Edit candidate title" value={fields.title ?? ''} onChange={(event) => onEdit(candidate.id, { ...fields, title: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
          <label className="text-xs text-slate-300">Artist<input aria-label="Edit candidate artist" value={fields.artist ?? ''} onChange={(event) => onEdit(candidate.id, { ...fields, artist: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSelect(candidate.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-300">Use candidate</button>
        <button type="button" onClick={() => onEdit(candidate.id, fields)} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300">Edit details</button>
        <button type="button" onClick={() => onImportSearch(candidate.id)} className="rounded-lg border border-blue-700 px-3 py-2 text-xs text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300">Import/Search</button>
        <button type="button" onClick={onDismiss} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300">Dismiss</button>
      </div>
    </article>
  )
}

export function LyricSuggestions({ state, companionStatus, onSelect, onEdit, onDismiss, onImportSearch }: Props) {
  const candidates = state.candidates.slice(0, 3)
  return (
    <section className="rounded-2xl border border-blue-800/60 bg-blue-950/20 p-5 sm:p-7" aria-labelledby="lyric-suggestions-heading">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Metadata only</p>
      <h2 id="lyric-suggestions-heading" className="mt-1 text-xl font-semibold text-white">Lyric suggestions</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Suggestions contain song metadata only. They never replace your lyrics automatically.</p>
      {state.status === 'error' && <p role="alert" className="mt-3 text-sm text-red-200">{state.error}</p>}
      {state.status === 'dismissed' && <p role="status" className="mt-3 text-sm text-slate-300">Candidate dismissed.</p>}
      {candidates.length === 0 && state.status !== 'dismissed' && <p role="status" className="mt-3 text-sm text-slate-300">{companionMessage(companionStatus.status)}</p>}
      {candidates.length > 0 && (
        <div className="mt-4 grid gap-3" aria-label="Lyric candidates">
          {candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} state={state} onSelect={onSelect} onEdit={onEdit} onImportSearch={onImportSearch} onDismiss={onDismiss} />)}
        </div>
      )}
      {state.status === 'import-search-requested' && <p role="status" className="mt-3 text-sm text-blue-200">Search fields populated. Review them and press the existing Search LRCLIB button if you want to continue.</p>}
    </section>
  )
}
