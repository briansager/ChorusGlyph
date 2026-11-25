import type { LyricsDocument } from '../../domain/lyrics/lyrics-types'
import { Icon } from '../../shared/ui/Icon'
import { languageProviderLabel } from '../../shared/ui/provider-labels'
import { useEffect, useRef, useState } from 'react'
import type { LyricLine } from '../../domain/lyrics/lyric-types'
import { ManualTimer } from '../../domain/now-playing/manual-timer'
import { clampTimingOffset, MAX_TIMING_OFFSET, MIN_TIMING_OFFSET, TIMING_OFFSET_STEP } from '../../domain/now-playing/timing-offset'

type SyncedLyricsProps = {
  document?: LyricsDocument
  lines: LyricLine[]
  timer?: ManualTimer
  romanizedLines?: Record<string, string>
  editedLines?: Record<string, boolean>
  cachedLines?: Record<string, boolean>
  isRomanizing?: boolean
  romanizationError?: string
  onRomanize?: () => void
  romanizationProviderId?: string
  romanizationOptions?: Array<{ id: string; displayName: string; version?: string }>
  onRomanizationProviderChange?: (providerId: string) => void
  onReadingOverrideChange?: (lineId: string, readingText: string) => void | Promise<void>
  timingOffset?: number
  onTimingOffsetChange?: (offset: number) => void
}

function getActiveLineId(lines: LyricLine[], currentTime: number, timingOffset: number): string | undefined {
  const adjustedTime = currentTime - timingOffset
  return lines.find(
    (line) => adjustedTime >= line.startTime && (line.endTime === undefined || adjustedTime < line.endTime),
  )?.id
}

function isValidOffsetEntry(value: string): boolean {
  const number = Number(value)
  const steps = (number - MIN_TIMING_OFFSET) / TIMING_OFFSET_STEP
  return value.trim() !== '' && Number.isFinite(number) && number >= MIN_TIMING_OFFSET && number <= MAX_TIMING_OFFSET && Math.abs(steps - Math.round(steps)) < 0.00001
}

export function SyncedLyrics({
  document,
  lines,
  timer,
  romanizedLines = {},
  editedLines = {},
  cachedLines = {},
  isRomanizing = false,
  romanizationError,
  onRomanize,
  romanizationProviderId = '',
  romanizationOptions = [],
  onRomanizationProviderChange,
  onReadingOverrideChange,
  timingOffset = 0,
  onTimingOffsetChange,
}: SyncedLyricsProps) {
  const timerRef = useRef<ManualTimer | null>(null)
  if (!timerRef.current) timerRef.current = timer ?? new ManualTimer()

  const [currentTime, setCurrentTime] = useState(() => timerRef.current?.getCurrentTime() ?? 0)
  const [playing, setPlaying] = useState(false)
  const [editingLineId, setEditingLineId] = useState<string>()
  const [draftReading, setDraftReading] = useState('')
  const [offsetDraft, setOffsetDraft] = useState(timingOffset.toFixed(2))
  useEffect(() => setOffsetDraft(timingOffset.toFixed(2)), [timingOffset])
  const offsetValid = isValidOffsetEntry(offsetDraft)

  useEffect(() => {
    let frameId: number | undefined

    const update = () => {
      setCurrentTime(timerRef.current?.getCurrentTime() ?? 0)
      if (timerRef.current?.isPlaying()) {
        frameId = requestAnimationFrame(update)
      }
    }

    if (playing) frameId = requestAnimationFrame(update)

    return () => {
      if (frameId !== undefined) cancelAnimationFrame(frameId)
    }
  }, [playing])

  const activeLineId = getActiveLineId(lines, currentTime, timingOffset)

  const togglePlayback = () => {
    if (timerRef.current?.isPlaying()) {
      timerRef.current.pause()
      setCurrentTime(timerRef.current.getCurrentTime())
      setPlaying(false)
    } else {
      timerRef.current?.play()
      setPlaying(true)
    }
  }

  const reset = () => {
    timerRef.current?.reset()
    setCurrentTime(0)
    setPlaying(false)
  }

  return (
    <section id="active-lyrics" className="rounded-2xl border border-blue-800/60 bg-slate-950/70 p-5 sm:p-7" aria-label="Synchronized lyrics">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2><Icon name="lyrics" />Active lyrics</h2>
          <p className="active-title">{document?.title}{document?.artist ? ` · ${document.artist}` : ''}</p>
          <p className="helper">Source: {({ sample: 'Sample · Original demo lyrics', 'paste-text': 'Pasted text', 'lrc-file': 'Local LRC file', lrclib: 'LRCLIB' } as Record<string, string>)[document?.sourceId ?? 'sample'] ?? document?.sourceId}</p>
          <p className="mt-1 text-sm text-slate-400">Timed lines with optional local readings</p>
        </div>
        <output className="rounded-lg bg-slate-800 px-3 py-2 font-mono text-sm text-blue-200" aria-label="Current timer position" aria-live="off" role="timer">
          {currentTime.toFixed(2)}s
        </output>
      </div>

      <div className="mt-6 space-y-2">
        {lines.map((line) => {
          const isActive = line.id === activeLineId
          return (
            <div key={line.id}>
              <p
                className={`lyric-line ${
                isActive
                  ? 'bg-blue-600/30 font-semibold text-blue-100 ring-1 ring-blue-400/60'
                  : 'text-slate-400'
                }`}
                data-active={isActive}
              >
                {line.text}
              </p>
              {romanizedLines[line.id] && (
                <div className="px-4 pb-2">
                  {editingLineId === line.id ? (
                    <div className="space-y-2">
                      <input
                        aria-label={`Edit reading for ${line.text}`}
                        value={draftReading}
                        onChange={(event) => setDraftReading(event.target.value)}
                        className="w-full rounded-lg border border-blue-500/70 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void onReadingOverrideChange?.(line.id, draftReading)
                            setEditingLineId(undefined)
                          }}
                          className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-400"
                        >
                          Save reading
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void onReadingOverrideChange?.(line.id, '')
                            setEditingLineId(undefined)
                          }}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-blue-500"
                        >
                          Clear edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLineId(undefined)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm italic text-blue-300/80 sm:text-base">{romanizedLines[line.id]}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {editedLines[line.id] && <span>Edited locally</span>}
                        {cachedLines[line.id] && !editedLines[line.id] && <span>Cached locally</span>}
                        {onReadingOverrideChange && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLineId(line.id)
                              setDraftReading(romanizedLines[line.id])
                            }}
                            className="text-blue-300 hover:text-blue-200"
                          >
                            Edit reading
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pause lyric preview' : 'Start lyric preview'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <Icon name="retry" />Restart preview
        </button>
        {onTimingOffsetChange && (
          <div className="timing-controls">
            <label htmlFor="timing-offset" className="text-sm text-slate-300">
              Timing offset: <span className="font-mono text-blue-200">{timingOffset >= 0 ? '+' : ''}{timingOffset.toFixed(2)}s</span>
            </label>
            <input
              id="timing-offset"
              aria-label="Timing offset"
              type="range"
              min={MIN_TIMING_OFFSET}
              max={MAX_TIMING_OFFSET}
              step={TIMING_OFFSET_STEP}
              value={timingOffset}
              onChange={(event) => onTimingOffsetChange(clampTimingOffset(Number(event.target.value)))}
              className="min-w-40 flex-1 accent-blue-500"
            />
            <label htmlFor="timing-offset-number">Offset (seconds)
              <input id="timing-offset-number" type="number" min={MIN_TIMING_OFFSET} max={MAX_TIMING_OFFSET} step={TIMING_OFFSET_STEP} value={offsetDraft}
                aria-invalid={!offsetValid} aria-describedby="offset-help"
                onChange={(event) => {
                  const value = event.target.value
                  setOffsetDraft(value)
                  if (isValidOffsetEntry(value)) onTimingOffsetChange(Number(value))
                }}
                onBlur={() => { if (!offsetValid) setOffsetDraft(timingOffset.toFixed(2)) }} />
            </label>
            <button
              type="button"
              onClick={() => { setOffsetDraft('0.00'); onTimingOffsetChange(0) }}
              className="text-xs font-semibold text-blue-300 hover:text-blue-200"
            >
              Reset offset
            </button>
            <p id="offset-help" className="helper">Positive offsets delay lyrics; negative offsets show them earlier. Use −5 to +5 seconds in steps of 0.05. Invalid entries leave timing unchanged until corrected; leaving the field restores the applied value.</p>
          </div>
        )}
        {onRomanize && (
          <div className="reading-controls">
            {onRomanizationProviderChange && (
              <label className="reading-language">
                <span>Reading language</span>
                <select
                  aria-label="Reading language"
                  value={romanizationProviderId}
                  onChange={(event) => onRomanizationProviderChange(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                >
                  {romanizationOptions.map((option) => (
                    <option key={option.id} value={option.id}>{languageProviderLabel(option.id, option.displayName)}</option>
                  ))}
                </select>
                <span className="helper engine-details">Engine: {romanizationOptions.find((option) => option.id === romanizationProviderId)?.displayName} · {romanizationOptions.find((option) => option.id === romanizationProviderId)?.version ?? 'Version unspecified'}</span>
              </label>
            )}
            <button
              type="button"
              onClick={onRomanize}
              disabled={isRomanizing}
              className="rounded-lg border border-blue-500/70 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {isRomanizing ? 'Preparing reading…' : 'Romanize selected language'}
            </button>
          </div>
        )}
      </div>
      {romanizationError && (
        <p role="alert" className="mt-4 text-sm text-red-200">
          {romanizationError}
        </p>
      )}
    </section>
  )
}
