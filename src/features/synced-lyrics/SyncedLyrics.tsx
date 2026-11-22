import { useEffect, useRef, useState } from 'react'
import type { LyricLine } from '../../domain/lyrics/lyric-types'
import { ManualTimer } from '../../domain/now-playing/manual-timer'

type SyncedLyricsProps = {
  lines: LyricLine[]
  timer?: ManualTimer
  romanizedLines?: Record<string, string>
  editedLines?: Record<string, boolean>
  cachedLines?: Record<string, boolean>
  isRomanizing?: boolean
  romanizationError?: string
  onRomanize?: () => void
  romanizationProviderId?: string
  romanizationOptions?: Array<{ id: string; displayName: string }>
  onRomanizationProviderChange?: (providerId: string) => void
  onReadingOverrideChange?: (lineId: string, readingText: string) => void | Promise<void>
}

function getActiveLineId(lines: LyricLine[], currentTime: number): string | undefined {
  return lines.find(
    (line) => currentTime >= line.startTime && (line.endTime === undefined || currentTime < line.endTime),
  )?.id
}

export function SyncedLyrics({
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
}: SyncedLyricsProps) {
  const timerRef = useRef<ManualTimer | null>(null)
  if (!timerRef.current) timerRef.current = timer ?? new ManualTimer()

  const [currentTime, setCurrentTime] = useState(() => timerRef.current?.getCurrentTime() ?? 0)
  const [playing, setPlaying] = useState(false)
  const [editingLineId, setEditingLineId] = useState<string>()
  const [draftReading, setDraftReading] = useState('')

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

  const activeLineId = getActiveLineId(lines, currentTime)

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
    <section className="rounded-2xl border border-blue-800/60 bg-slate-950/70 p-5 sm:p-7" aria-label="Synchronized lyrics">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Demo lyrics</p>
          <p className="mt-1 text-sm text-slate-400">Timed lines with optional local readings</p>
        </div>
        <output className="rounded-lg bg-slate-800 px-3 py-2 font-mono text-sm text-blue-200" aria-label="Current timer position">
          {currentTime.toFixed(2)}s
        </output>
      </div>

      <div className="mt-6 space-y-2">
        {lines.map((line) => {
          const isActive = line.id === activeLineId
          return (
            <div key={line.id}>
              <p
                className={`rounded-xl px-4 py-3 text-base transition sm:text-lg ${
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
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Reset
        </button>
        {onRomanize && (
          <>
            {onRomanizationProviderChange && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <span>Reading language</span>
                <select
                  aria-label="Reading language"
                  value={romanizationProviderId}
                  onChange={(event) => onRomanizationProviderChange(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                >
                  {romanizationOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.displayName}</option>
                  ))}
                </select>
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
          </>
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
