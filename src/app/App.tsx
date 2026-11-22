import { useState } from 'react'
import type { LyricsDocument } from '../domain/lyrics/lyrics-types'
import { IndexedDbRomanizationCache } from '../domain/romanization/indexeddb-romanization-cache'
import { createRomanizationCacheKey } from '../domain/romanization/romanization-cache-key'
import { createRomanizerRegistry } from '../domain/romanization/romanizer-registry'
import { LyricsSourcePanel } from '../features/lyrics-source/LyricsSourcePanel'
import { SyncedLyrics } from '../features/synced-lyrics/SyncedLyrics'
import { sampleLyricsDocument } from '../features/synced-lyrics/lyric-fixtures'

const romanizerRegistry = createRomanizerRegistry({
  azureWorkerUrl: import.meta.env.VITE_TRANSLITERATION_WORKER_URL,
})
const romanizationCache = new IndexedDbRomanizationCache()
const romanizationOptions = romanizerRegistry.manualProviders.map(({ id, displayName }) => ({ id, displayName }))

export function App() {
  const [lyricsDocument, setLyricsDocument] = useState<LyricsDocument>(sampleLyricsDocument)
  const [romanizedLines, setRomanizedLines] = useState<Record<string, string>>({})
  const [cachedLines, setCachedLines] = useState<Record<string, boolean>>({})
  const [isRomanizing, setIsRomanizing] = useState(false)
  const [romanizationError, setRomanizationError] = useState<string>()
  const [romanizationProviderId, setRomanizationProviderId] = useState('japanese-kuroshiro')

  const romanizeSelectedLanguage = async () => {
    setRomanizationError(undefined)
    setIsRomanizing(true)

    try {
      const nextReadings = { ...romanizedLines }
      const nextCachedLines = { ...cachedLines }
      let convertedCount = 0
      const romanizer = romanizerRegistry.get(romanizationProviderId)
      if (!romanizer) throw new Error('The selected romanization provider is unavailable.')

      for (const line of lyricsDocument.lines) {
        if (!line.text.trim() || nextReadings[line.id] || !romanizer.supports({ text: line.text })) continue
        const providerVersion = romanizer.version ?? '1.0.0'
        const cacheKey = createRomanizationCacheKey({
          sourceId: lyricsDocument.sourceId,
          title: lyricsDocument.title,
          artist: lyricsDocument.artist,
          duration: lyricsDocument.duration,
          originalText: line.text,
          providerId: romanizer.id,
          providerVersion,
        })
        let cachedEntry
        try {
          cachedEntry = await romanizationCache.get(cacheKey)
        } catch {
          cachedEntry = undefined
        }

        if (cachedEntry?.originalText === line.text) {
          nextReadings[line.id] = cachedEntry.romanizedText
          nextCachedLines[line.id] = true
          convertedCount += 1
          continue
        }

        const result = await romanizer.romanize({ text: line.text })
        if (result.status === 'complete') {
          nextReadings[line.id] = result.romanizedText
          delete nextCachedLines[line.id]
          const now = Date.now()
          try {
            await romanizationCache.set(cacheKey, {
              cacheKey,
              sourceId: lyricsDocument.sourceId,
              title: lyricsDocument.title,
              artist: lyricsDocument.artist,
              duration: lyricsDocument.duration,
              providerId: romanizer.id,
              providerVersion,
              originalText: line.text,
              romanizedText: result.romanizedText,
              createdAt: now,
              updatedAt: now,
            })
          } catch {
            // Local storage is an optimization; conversion remains usable without it.
          }
          convertedCount += 1
        }
      }

      setRomanizedLines(nextReadings)
      setCachedLines(nextCachedLines)
      if (convertedCount === 0 && Object.keys(nextReadings).length === 0) {
        setRomanizationError('No lines supported by the selected romanizer were found.')
      }
    } catch (error) {
      setRomanizationError(error instanceof Error ? error.message : 'Romanization failed.')
    } finally {
      setIsRomanizing(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col overflow-hidden rounded-3xl border border-blue-900/60 bg-slate-900 shadow-2xl shadow-blue-950/30 sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-5 sm:px-10">
          <p className="text-lg font-semibold tracking-tight text-blue-300">ChorusGlyph</p>
          <span className="rounded-full border border-blue-800/70 bg-blue-950/50 px-3 py-1 text-xs font-medium text-blue-200">
            Milestone 6B
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center px-6 py-16 sm:px-16 lg:px-24">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
              Sing together, understand every line
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              A multilingual sing-along app.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              ChorusGlyph is a privacy-conscious app for exploring songs with readable,
              editable romanized readings across languages.
            </p>
            <div className="mt-10 space-y-5">
              <LyricsSourcePanel
                onLoaded={(document) => {
                  setLyricsDocument(document)
                  setRomanizedLines({})
                  setCachedLines({})
                  setRomanizationError(undefined)
                }}
              />
              <p className="text-sm text-slate-400">
                Loaded source: <span className="font-medium text-blue-200">{lyricsDocument.sourceId}</span>
                {lyricsDocument.title && <> · {lyricsDocument.title}</>}
                {lyricsDocument.artist && <> by {lyricsDocument.artist}</>}
              </p>
              <SyncedLyrics
                lines={lyricsDocument.lines}
                romanizedLines={romanizedLines}
                cachedLines={cachedLines}
                isRomanizing={isRomanizing}
                romanizationError={romanizationError}
                onRomanize={romanizeSelectedLanguage}
                romanizationProviderId={romanizationProviderId}
                romanizationOptions={romanizationOptions}
                onRomanizationProviderChange={(providerId) => {
                  setRomanizationProviderId(providerId)
                  setRomanizedLines({})
                  setCachedLines({})
                  setRomanizationError(undefined)
                }}
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-800 px-6 py-5 text-sm text-slate-500 sm:px-10">
          Built as an independent portfolio project by Brian Sager.
        </footer>
      </div>
    </main>
  )
}
