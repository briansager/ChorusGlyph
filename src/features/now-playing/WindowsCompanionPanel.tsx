import { useEffect, useState } from 'react'
import type { CompanionNowPlayingResponse, CompanionStatus } from '../../domain/now-playing/windows-companion-types'
import { WindowsCompanionSource } from '../../domain/now-playing/windows-companion-source'

type Props = {
  source: WindowsCompanionSource
  onStatusChange?: (status: CompanionStatus) => void
}

const statusLabels: Record<CompanionStatus['status'], string> = {
  disabled: 'Companion disabled',
  connecting: 'Connecting',
  'connected-playing': 'Connected — playing',
  'connected-paused': 'Connected — paused',
  'no-media': 'Connected — no current media',
  offline: 'Companion offline',
  'invalid-token': 'Invalid token',
  'media-access-unavailable': 'Media access unavailable',
  malformed: 'Malformed companion response',
}

export function WindowsCompanionPanel({ source, onStatusChange }: Props) {
  const [mode, setMode] = useState<'manual' | 'companion'>('manual')
  const [token, setToken] = useState(() => source.getStoredToken() ?? '')
  const [status, setStatus] = useState<CompanionStatus>(source.getStatus())

  useEffect(() => {
    const unsubscribe = source.subscribeStatus((nextStatus) => {
      setStatus(nextStatus)
      onStatusChange?.(nextStatus)
    })
    return unsubscribe
  }, [onStatusChange, source])

  const companionSelected = mode === 'companion'
  const media = status.media

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4" aria-labelledby="companion-heading">
      <h2 id="companion-heading" className="text-sm font-semibold text-blue-200">Song source</h2>
      <div className="mt-3 flex flex-wrap gap-4" role="radiogroup" aria-label="Song source mode">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="radio" name="song-source" value="manual" checked={!companionSelected} onChange={() => { source.disconnect(); setMode('manual') }} />
          Manual input
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="radio" name="song-source" value="companion" checked={companionSelected} onChange={() => setMode('companion')} />
          Windows companion
        </label>
      </div>

      {companionSelected && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-slate-300" htmlFor="companion-token">
            Companion token
            <input
              id="companion-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { void source.connect(token) }} disabled={status.status === 'connecting'} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50">
              {status.status === 'connecting' ? 'Connecting…' : 'Connect companion'}
            </button>
            <button type="button" onClick={() => source.disconnect()} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300">Disconnect</button>
            <button type="button" onClick={() => { source.clearStoredToken(); setToken(''); source.disconnect(true) }} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300">Clear saved token</button>
          </div>
          <p className="text-sm text-slate-300" role="status" aria-live="polite">
            Status: <span className="font-medium text-blue-200">{statusLabels[status.status]}</span>. {status.message}
          </p>
          {media?.available && (
            <div className="rounded-lg border border-blue-900/70 bg-blue-950/30 p-3 text-sm text-slate-300">
              <p>Detected: <span className="font-medium text-white">{media.title || 'Untitled media'}</span>{media.artist ? ` — ${media.artist}` : ''}</p>
              {media.album && <p className="mt-1 text-slate-400">Album: {media.album}</p>}
              {media.sourceApplication && <p className="mt-1 text-slate-400">Source: {media.sourceApplication}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
