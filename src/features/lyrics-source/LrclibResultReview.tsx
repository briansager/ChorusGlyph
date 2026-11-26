import { useEffect, useRef } from 'react'
import type { LyricsDocument } from '../../domain/lyrics/lyrics-types'
import { Icon } from '../../shared/ui/Icon'
import type { LyricSearchReview, ReviewedLyricResult } from './lrclib-result-review'

function RecordDetails({ item }: { item: ReviewedLyricResult }) {
  const { record } = item
  return <>
    <h4>{record.trackName || 'Untitled result'}</h4>
    <p>{record.artistName?.trim() || 'Artist unavailable'}</p>
    {record.albumName?.trim() && <p className="helper">Album: {record.albumName}</p>}
    <p className="helper">Duration: {record.duration && record.duration > 0 ? record.duration.toFixed(1) + ' seconds' : 'unavailable'}</p>
    <p className="helper">Language: {record.language?.trim() || 'not provided'}</p>
    <p className="helper"><Icon name={item.document ? 'supported' : 'unsupported'} /> {item.document ? 'Synchronized lyrics' : record.syncedLyrics?.trim() ? 'Unusable timing data' : 'Unsynchronized / no timed lyrics'}</p>
    <p className="helper">Source: LRCLIB{record.id !== undefined ? ' · Record ' + record.id : ''}</p>
    <p className="result-match">{item.match.label}</p>
    <ul className="result-reasons">{item.match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    {item.match.languageMismatch && <p className="status-warning"><Icon name="warning" /> Check the language before loading this version.</p>}
    {item.duplicateCount > 1 && <p className="helper">{item.duplicateCount} identical records grouped.</p>}
  </>
}

function Preview({ item }: { item: ReviewedLyricResult }) {
  return <details className="result-preview">
    <summary>Preview details</summary>
    <p className="helper">Preview only. Your active lyrics remain unchanged.</p>
    <pre>{item.record.syncedLyrics?.trim() || item.record.plainLyrics?.trim() || 'No lyric text returned.'}</pre>
  </details>
}

type Props = {
  review: LyricSearchReview
  selectedKey?: string
  activeDocument?: LyricsDocument
  onSelect: (key?: string) => void
  onConfirm: () => void
}

export function LrclibResultReview({ review, selectedKey, activeDocument, onSelect, onConfirm }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const selectRefs = useRef(new Map<string, HTMLButtonElement>())
  const previousSelected = useRef<string | undefined>(undefined)
  const selected = review.results.find((item) => item.key === selectedKey)
  useEffect(() => {
    if (selected) headingRef.current?.focus()
    else if (previousSelected.current) selectRefs.current.get(previousSelected.current)?.focus()
    previousSelected.current = selected?.key
  }, [selected?.key])

  return <section className="lyric-result-review" aria-labelledby="lyric-result-heading">
    <h3 id="lyric-result-heading">Review lyric results</h3>
    <p role="status" className="helper">{review.results.length ? review.results.length + ' result' + (review.results.length === 1 ? '' : 's') + ' available for review.' : 'No results found. Edit the search details, use manual input, or import a local LRC file.'}</p>
    <p className="helper">Compared with {review.fromCandidate ? 'suggested song' : 'search details'}: {review.reference.title || 'Unknown title'}{review.reference.artist ? ' · ' + review.reference.artist : ''}.</p>
    <p className="helper">This compares metadata only; it does not verify lyric accuracy. Active lyrics remain unchanged until you confirm a replacement.</p>
    {review.duplicateCount > 0 && <p className="helper">{review.duplicateCount} duplicate result{review.duplicateCount === 1 ? '' : 's'} grouped; different lyric versions remain separate.</p>}
    {selected ? <section className="lyric-confirmation" aria-labelledby="lyric-confirm-heading">
      <h3 id="lyric-confirm-heading" ref={headingRef} tabIndex={-1}>Replace active lyrics?</h3>
      <p className="helper">Current: {activeDocument?.title || 'Current lyric document'}{activeDocument?.artist ? ' · ' + activeDocument.artist : ''} ({activeDocument?.sourceId || 'active source'}).</p>
      <p className="helper">Confirm replacement to load the following LRCLIB result. Your current lyrics and readings remain active until then.</p>
      <RecordDetails item={selected} />
      <Preview item={selected} />
      <div className="action-row">
        <button className="primary" type="button" onClick={onConfirm} disabled={!selected.document}>Confirm replacement</button>
        <button type="button" onClick={() => onSelect(undefined)}>Cancel</button>
      </div>
    </section> : <div className="lyric-result-grid">
      {review.results.map((item) => <article className="lyric-result-card" key={item.key} aria-label={'Lyric result: ' + (item.record.trackName || 'Untitled result')}>
        <RecordDetails item={item} />
        <Preview item={item} />
        {item.unavailableReason && <p className="helper">{item.unavailableReason} Use timed manual input or a local LRC file instead.</p>}
        <button type="button" className="result-select" disabled={!item.document} ref={(element) => { if (element) selectRefs.current.set(item.key, element); else selectRefs.current.delete(item.key) }} onClick={() => onSelect(item.key)}>Select lyrics</button>
      </article>)}
    </div>}
  </section>
}
