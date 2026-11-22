import { useRef, useState } from 'react'
import type { LyricsDocument } from '../../domain/lyrics/lyrics-types'
import { LrcFileLyricsSource } from '../../domain/lyrics/lrc-file-source'
import { PasteTextLyricsSource } from '../../domain/lyrics/paste-text-source'

type LyricsSourcePanelProps = {
  onLoaded: (document: LyricsDocument) => void
}

const pasteSource = new PasteTextLyricsSource()
const fileSource = new LrcFileLyricsSource()

export function LyricsSourcePanel({ onLoaded }: LyricsSourcePanelProps) {
  const [pastedText, setPastedText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | undefined>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocument = async (load: () => Promise<LyricsDocument>) => {
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

  return (
    <section className="rounded-2xl border border-blue-800/60 bg-blue-950/30 p-5 sm:p-7" aria-label="Load local lyrics">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Local lyric sources</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Load your own timed lyrics</h2>
        <p className="mt-2 text-sm leading-6 text-blue-100/70">
          Paste timed LRC text or choose a local .lrc file. Nothing is uploaded.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <label className="text-sm font-medium text-slate-200" htmlFor="lrc-text">
            Timed LRC text
          </label>
          <textarea
            id="lrc-text"
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder="[00:00.00]Write your own timed line"
            rows={5}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
          />
          <button
            type="button"
            onClick={() => loadDocument(() => pasteSource.load({ text: pastedText }))}
            disabled={isLoading}
            className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Load pasted text
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-200" htmlFor="lrc-file">
            Local LRC file
          </label>
          <input
            ref={fileInputRef}
            id="lrc-file"
            type="file"
            accept=".lrc,text/plain"
            onChange={(event) => setSelectedFile(event.target.files?.[0])}
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-300 file:mr-3 file:border-0 file:bg-slate-800 file:px-3 file:py-3 file:text-sm file:font-medium file:text-blue-200 hover:file:bg-slate-700"
          />
          <button
            type="button"
            onClick={() => loadDocument(() => fileSource.load({ file: selectedFile }))}
            disabled={isLoading}
            className="mt-3 rounded-lg border border-blue-500/70 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Load local file
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
  )
}
