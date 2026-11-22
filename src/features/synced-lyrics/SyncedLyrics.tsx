import { useEffect, useRef, useState } from 'react'
import type { LyricLine } from '../../domain/lyrics/lyric-types'
import { ManualTimer } from '../../domain/now-playing/manual-timer'

type SyncedLyricsProps = {
  lines: LyricLine[]
  timer?: ManualTimer
  romanizedLines?: Record<string, string>
  isRomanizing?: boolean
  romanizationError?: string
  onRomanize?: () => void
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
  isRomanizing = false,
  romanizationError,
  onRomanize,
}: SyncedLyricsProps) {
  const timerRef = useRef<ManualTimer | null>(null)
  if (!timerRef.current) timerRef.current = timer ?? new ManualTimer()

  const [currentTime, setCurrentTime] = useState(() => timerRef.current?.getCurrentTime() ?? 0)
  const [playing, setPlaying] = useState(false)

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
          <p className="mt-1 text-sm text-slate-400">Timed lines with optional local Japanese readings</p>
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
                <p className="px-4 pb-2 text-sm italic text-blue-300/80 sm:text-base">
                  {romanizedLines[line.id]}
                </p>
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
          <button
            type="button"
            onClick={onRomanize}
            disabled={isRomanizing}
            className="rounded-lg border border-blue-500/70 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {isRomanizing ? 'Preparing Japanese readings…' : 'Romanize Japanese'}
          </button>
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
