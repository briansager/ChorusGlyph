import { Icon } from '../../shared/ui/Icon'
import { useEffect, useRef, useState } from 'react'
import type { LyricsDocument } from '../../domain/lyrics/lyrics-types'
import type { LyricsSource } from '../../domain/lyrics/lyrics-source'
import { LrcFileLyricsSource } from '../../domain/lyrics/lrc-file-source'
import { LrclibError } from '../../domain/lyrics/lrclib-client'
import { LrclibLyricsSource } from '../../domain/lyrics/lrclib-source'
import { PasteTextLyricsSource } from '../../domain/lyrics/paste-text-source'

type LyricsSourcePanelProps = {
  onLoaded: (document: LyricsDocument) => void
  searchPrefill?: { title?: string; artist?: string }
  candidateSearchActive?: boolean
  onCandidateSearchCancel?: () => void
  lrclibSource?: Pick<LyricsSource, 'load'>
}

const pasteSource = new PasteTextLyricsSource()
const fileSource = new LrcFileLyricsSource()
const lrclibSource = new LrclibLyricsSource()

export function LyricsSourcePanel({ onLoaded, searchPrefill, candidateSearchActive = false, onCandidateSearchCancel, lrclibSource: configuredLrclibSource }: LyricsSourcePanelProps) {
  const [pastedText, setPastedText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | undefined>()
  const [error, setError] = useState<string>()
  const [lrclibTitle, setLrclibTitle] = useState('')
  const [lrclibArtist, setLrclibArtist] = useState('')
  const [lrclibDuration, setLrclibDuration] = useState('')
  const [lrclibError, setLrclibError] = useState<string>()
  const [lrclibStatus, setLrclibStatus] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [isLrclibLoading, setIsLrclibLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const searchRunRef = useRef(0)

  const focusPreparedSearch = useRef(false)
  useEffect(() => {
    searchRunRef.current += 1
    setIsLrclibLoading(false)
    setLrclibError(undefined)
    setLrclibStatus(undefined)
    if (searchPrefill?.title !== undefined) setLrclibTitle(searchPrefill.title)
    if (searchPrefill?.artist !== undefined) setLrclibArtist(searchPrefill.artist)
    if (candidateSearchActive) focusPreparedSearch.current = true
  }, [candidateSearchActive, searchPrefill])

  useEffect(() => {
    if (focusPreparedSearch.current && !isLoading && !isLrclibLoading) {
      searchButtonRef.current?.focus()
      focusPreparedSearch.current = false
    }
  })

  const loadDocument = async (load: () => Promise<LyricsDocument>) => {
    searchRunRef.current += 1
    setIsLrclibLoading(false)
    setError(undefined)
    setIsLoading(true)

    try {
      onLoaded(await load())
      setPastedText('')
      setSelectedFile(undefined)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load lyrics.')
    } finally {
      setIsLoading(false)
    }
  }

  const lookupLrclib = async () => {
    if (isLrclibLoading) return
    const searchRun = ++searchRunRef.current
    setLrclibError(undefined)
    setLrclibStatus(undefined)
    setIsLrclibLoading(true)

    try {
      const document = await (configuredLrclibSource ?? lrclibSource).load({
        title: lrclibTitle,
        artist: lrclibArtist,
        duration: Number(lrclibDuration),
      })
      if (searchRun !== searchRunRef.current) return
      onLoaded(document)
      setLrclibStatus(`Loaded ${document.title ?? 'track'} by ${document.artist ?? 'unknown artist'} from LRCLIB.`)
    } catch (caughtError) {
      if (searchRun !== searchRunRef.current) return
      if (caughtError instanceof LrclibError) {
        setLrclibError(caughtError.message)
      } else {
        setLrclibError(caughtError instanceof Error ? caughtError.message : 'Unable to look up lyrics.')
      }
    } finally {
      if (searchRun === searchRunRef.current) setIsLrclibLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-blue-800/60 bg-blue-950/30 p-5 sm:p-7" aria-label="Load local lyrics">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Local lyric sources</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Load your own timed lyrics</h2>
        <p className="mt-2 text-sm leading-6 text-blue-100/70">
          Paste timed LRC text or choose a local .lrc file. These two loading actions process lyrics on this device.
        </p>
      </div>

      <div className="local-load-grid">
        <div>
          <label className="text-sm font-medium text-slate-200" htmlFor="lrc-text">
            <Icon name="manual" />Timed LRC text
          </label>
          <textarea
            id="lrc-text"
            aria-describedby="lrc-format local-load-error"
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder="[00:00.00]Write your own timed line"
            rows={5}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
          />
          <p id="lrc-format" className="helper">Required for paste loading. Use timed LRC, for example <code>[00:04.50]Your lyric line</code>.</p>
          <button
            type="button"
            onClick={() => loadDocument(() => pasteSource.load({ text: pastedText }))}
            disabled={isLoading}
            className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <Icon name="manual" />Load pasted text
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-200" htmlFor="lrc-file">
            <Icon name="upload" />Local LRC file
          </label>
          <input
            ref={fileInputRef}
            id="lrc-file"
            aria-describedby="file-format local-load-error"
            type="file"
            accept=".lrc,text/plain"
            onChange={(event) => setSelectedFile(event.target.files?.[0])}
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-300 file:mr-3 file:border-0 file:bg-slate-800 file:px-3 file:py-3 file:text-sm file:font-medium file:text-blue-200 hover:file:bg-slate-700"
          />
          <p id="file-format" className="helper">Choose a .lrc text file, then select Load local file.</p>
          <button
            type="button"
            onClick={() => loadDocument(() => fileSource.load({ file: selectedFile }))}
            disabled={isLoading}
            className="mt-3 rounded-lg border border-blue-500/70 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <Icon name="upload" />Load local file
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-blue-800/50 pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">External lookup</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Find synchronized lyrics with LRCLIB</h2>
        <p className="mt-2 text-sm leading-6 text-blue-100/70">
          Search LRCLIB sends the song details below from your browser to LRCLIB. A successful result loads synchronized lyrics into your workspace.
        </p>
        {candidateSearchActive && <p role="status" className="prepared-notice">Search prepared from suggested song. Review the details, then search LRCLIB.</p>}
        <div className="search-fields">
          <label className="text-sm text-slate-200">
            Track title (required)
            <input
              aria-label="LRCLIB track title"
              aria-describedby="lrclib-error"
              value={lrclibTitle}
              onChange={(event) => setLrclibTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
            />
          </label>
          <label className="text-sm text-slate-200">
            Artist (optional)
            <input
              aria-label="LRCLIB artist"
              aria-describedby="lrclib-error"
              value={lrclibArtist}
              onChange={(event) => setLrclibArtist(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
            />
          </label>
          <label className="text-sm text-slate-200">
            Duration (seconds, required)
            <input
              aria-label="LRCLIB duration"
              aria-describedby="lrclib-error"
              type="number"
              min="1"
              step="0.1"
              value={lrclibDuration}
              onChange={(event) => setLrclibDuration(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
            />
          </label>
        </div>
        <button
          id="lrclib-search-button"
          ref={searchButtonRef}
          type="button"
          onClick={lookupLrclib}
          disabled={isLoading || isLrclibLoading}
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <Icon name={isLrclibLoading ? 'loading' : 'search'} />{isLrclibLoading ? 'Searching…' : 'Search LRCLIB'}
        </button>
        {candidateSearchActive && (
          <button
            type="button"
            onClick={() => {
              searchRunRef.current += 1
              setIsLrclibLoading(false)
              setLrclibTitle('')
              setLrclibArtist('')
              setLrclibDuration('')
              setLrclibError(undefined)
              setLrclibStatus(undefined)
              focusPreparedSearch.current = true
              onCandidateSearchCancel?.()
            }}
            className="ml-2 mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <Icon name="cancel" />Cancel candidate search
          </button>
        )}
        {lrclibStatus && <p className="mt-3 text-sm text-emerald-200" role="status">{lrclibStatus}</p>}
        {lrclibError && <p id="lrclib-error" className="mt-3 text-sm text-red-200" role="alert"><Icon name="error" /> {lrclibError}</p>}
      </div>

      {error && (
        <p id="local-load-error" role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          <Icon name="error" /> {error}
        </p>
      )}
    </section>
  )
}
