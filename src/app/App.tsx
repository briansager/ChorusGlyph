import { TimedGlyph } from '../shared/ui/TimedGlyph'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { LyricsDocument } from '../domain/lyrics/lyrics-types'
import { loadTimingOffset, saveTimingOffset } from '../domain/now-playing/timing-offset'
import { IndexedDbRomanizationCache } from '../domain/romanization/indexeddb-romanization-cache'
import { IndexedDbReadingOverrideStore } from '../domain/romanization/indexeddb-reading-override-store'
import { createRomanizationCacheKey } from '../domain/romanization/romanization-cache-key'
import { createReadingOverrideKey } from '../domain/romanization/reading-override-key'
import { createRomanizerRegistry } from '../domain/romanization/romanizer-registry'
import { LyricsSourcePanel } from '../features/lyrics-source/LyricsSourcePanel'
import { ProviderComparison } from '../features/provider-comparison/ProviderComparison'
import { SyncedLyrics } from '../features/synced-lyrics/SyncedLyrics'
import { WindowsCompanionPanel } from '../features/now-playing/WindowsCompanionPanel'
import { WindowsCompanionSource } from '../domain/now-playing/windows-companion-source'
import { getDemoNowPlayingStatus } from '../domain/now-playing/mock-now-playing-fixtures'
import type { CompanionStatus } from '../domain/now-playing/windows-companion-types'
import { createCandidateFromCompanionMedia } from '../domain/lyrics-candidates/companion-candidate'
import { LyricSuggestions } from '../features/lyric-suggestions/LyricSuggestions'
import { initialLyricSuggestionState, lyricSuggestionReducer } from '../features/lyric-suggestions/lyric-suggestion-state'
import { sampleLyricsDocument } from '../features/synced-lyrics/lyric-fixtures'

const romanizerRegistry = createRomanizerRegistry({
  azureWorkerUrl: import.meta.env.VITE_TRANSLITERATION_PROXY_URL,
  azureProfile: {
    language: 'th',
    fromScript: 'Thai',
    toScript: 'Latn',
    displayName: 'Thai',
  },
})
const romanizationCache = new IndexedDbRomanizationCache()
const readingOverrideStore = new IndexedDbReadingOverrideStore()
const romanizationOptions = romanizerRegistry.manualProviders.map(({ id, displayName, version }) => ({ id, displayName, version }))
const windowsCompanionSource = new WindowsCompanionSource()

export function App() {
  const [lyricsDocument, setLyricsDocument] = useState<LyricsDocument>(sampleLyricsDocument)
  const [romanizedLines, setRomanizedLines] = useState<Record<string, string>>({})
  const [providerRomanizedLines, setProviderRomanizedLines] = useState<Record<string, string>>({})
  const [editedLines, setEditedLines] = useState<Record<string, boolean>>({})
  const [cachedLines, setCachedLines] = useState<Record<string, boolean>>({})
  const [isRomanizing, setIsRomanizing] = useState(false)
  const [romanizationError, setRomanizationError] = useState<string>()
  const [romanizationProviderId, setRomanizationProviderId] = useState('japanese-kuroshiro')
  const [timingOffset, setTimingOffset] = useState(loadTimingOffset)
  const [companionStatus, setCompanionStatus] = useState<CompanionStatus>(() => windowsCompanionSource.getStatus())
  const [suggestionState, dispatchSuggestion] = useReducer(lyricSuggestionReducer, initialLyricSuggestionState)
  const lastCompanionIdentity = useRef<string | undefined>(undefined)

  const updateTimingOffset = (nextOffset: number) => {
    setTimingOffset(nextOffset)
    saveTimingOffset(nextOffset)
  }

  const handleCompanionStatus = useCallback((status: CompanionStatus) => {
    setCompanionStatus(status)
    if (status.status === 'disabled' || status.status === 'no-media') {
      lastCompanionIdentity.current = undefined
      dispatchSuggestion({ type: 'suggest', candidates: [] })
      return
    }
    if (!status.media) return
    const result = createCandidateFromCompanionMedia(status.media)
    if (result.identity === lastCompanionIdentity.current) return
    if (!result.identity) return
    lastCompanionIdentity.current = result.identity
    if (result.candidate) dispatchSuggestion({ type: 'suggest', candidates: [result.candidate] })
    else if (result.reason === 'missing-title') dispatchSuggestion({ type: 'error', message: 'Media was detected, but it did not include a usable title.' })
  }, [])

  const restoreReadingOverrides = async (document: LyricsDocument, providerId: string) => {
    const restoredReadings: Record<string, string> = {}
    const restoredEditedLines: Record<string, boolean> = {}

    for (const line of document.lines) {
      const key = createReadingOverrideKey({
        sourceId: document.sourceId,
        lineId: line.id,
        providerId,
        originalText: line.text,
      })
      const override = await readingOverrideStore.get(key)
      if (override?.originalText === line.text && override.readingText.trim()) {
        restoredReadings[line.id] = override.readingText
        restoredEditedLines[line.id] = true
      }
    }

    setRomanizedLines(restoredReadings)
    setEditedLines(restoredEditedLines)
  }

  useEffect(() => {
    void restoreReadingOverrides(sampleLyricsDocument, romanizationProviderId)
  }, [])

  const romanizeSelectedLanguage = async () => {
    setRomanizationError(undefined)
    setIsRomanizing(true)

    try {
      const nextReadings = { ...romanizedLines }
      const nextProviderReadings = { ...providerRomanizedLines }
      const nextCachedLines = { ...cachedLines }
      let convertedCount = 0
      const romanizer = romanizerRegistry.get(romanizationProviderId)
      if (!romanizer) throw new Error('The selected romanization provider is unavailable.')

      for (const line of lyricsDocument.lines) {
        const supported = romanizer.supports({ text: line.text })
        if (!line.text.trim() || nextReadings[line.id] || !supported) continue
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
          nextProviderReadings[line.id] = cachedEntry.romanizedText
          if (!editedLines[line.id]) nextReadings[line.id] = cachedEntry.romanizedText
          nextCachedLines[line.id] = true
          convertedCount += 1
          continue
        }

        const result = await romanizer.romanize({ text: line.text })
        if (result.status === 'complete') {
          nextProviderReadings[line.id] = result.romanizedText
          if (!editedLines[line.id]) nextReadings[line.id] = result.romanizedText
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
      setProviderRomanizedLines(nextProviderReadings)
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

  const updateReadingOverride = async (lineId: string, readingText: string) => {
    const line = lyricsDocument.lines.find((candidate) => candidate.id === lineId)
    if (!line) return

    const key = createReadingOverrideKey({
      sourceId: lyricsDocument.sourceId,
      lineId,
      providerId: romanizationProviderId,
      originalText: line.text,
    })

    if (!readingText.trim()) {
      await readingOverrideStore.delete(key)
      setEditedLines((current) => {
        const next = { ...current }
        delete next[lineId]
        return next
      })
      setRomanizedLines((current) => {
        const next = { ...current }
        if (providerRomanizedLines[lineId]) next[lineId] = providerRomanizedLines[lineId]
        else delete next[lineId]
        return next
      })
      return
    }

    await readingOverrideStore.set(key, {
      key,
      sourceId: lyricsDocument.sourceId,
      lineId,
      providerId: romanizationProviderId,
      originalText: line.text,
      readingText,
      updatedAt: Date.now(),
    })
    setEditedLines((current) => ({ ...current, [lineId]: true }))
    setRomanizedLines((current) => ({ ...current, [lineId]: readingText }))
  }

  return (
    <main className="workspace-shell">
      <header className="app-header">
        <a className="brand" href="#workspace"><TimedGlyph /><span>ChorusGlyph</span></a>
        <nav aria-label="Page sections"><a href="#workspace">Workspace</a><a href="#comparison">Compare readings</a></nav>
      </header>
      <section className="introduction" id="workspace">
        <h1>Lyric workspace</h1>
        <p>Load timed lyrics, adjust their timing, and explore readings across languages.</p>
      </section>
      <div className="workspace-sections">
        <WindowsCompanionPanel
          source={windowsCompanionSource}
          onStatusChange={handleCompanionStatus}
          onUseDemoNowPlayingData={import.meta.env.DEV ? getDemoNowPlayingStatus : undefined}
        />
        {(suggestionState.candidates.length > 0 || suggestionState.status === 'dismissed' || suggestionState.status === 'error' || companionStatus.status !== 'disabled') && <LyricSuggestions
          state={suggestionState}
          companionStatus={companionStatus}
          onSelect={(candidateId) => dispatchSuggestion({ type: 'select', candidateId })}
          onEdit={(candidateId, fields) => dispatchSuggestion({ type: 'edit', candidateId, fields })}
          onDismiss={() => dispatchSuggestion({ type: 'dismiss' })}
          onImportSearch={(candidateId) => dispatchSuggestion({ type: 'request-import-search', candidateId })}
        />}
        <LyricsSourcePanel
          activeDocument={lyricsDocument}
          searchPrefill={suggestionState.preparedSearch}
          candidateSearchActive={Boolean(suggestionState.preparedSearch)}
          onCandidateSearchCancel={() => dispatchSuggestion({ type: 'cancel-import-search' })}
          onLoaded={(document) => {
            setLyricsDocument(document)
            setRomanizedLines({})
            setProviderRomanizedLines({})
            setEditedLines({})
            setCachedLines({})
            setRomanizationError(undefined)
            void restoreReadingOverrides(document, romanizationProviderId)
          }}
        />
        <SyncedLyrics
          document={lyricsDocument}
          lines={lyricsDocument.lines}
          romanizedLines={romanizedLines}
          editedLines={editedLines}
          cachedLines={cachedLines}
          isRomanizing={isRomanizing}
          romanizationError={romanizationError}
          onRomanize={romanizeSelectedLanguage}
          romanizationProviderId={romanizationProviderId}
          romanizationOptions={romanizationOptions}
          onRomanizationProviderChange={(providerId) => {
            setRomanizationProviderId(providerId)
            setRomanizedLines({})
            setProviderRomanizedLines({})
            setEditedLines({})
            setCachedLines({})
            setRomanizationError(undefined)
            void restoreReadingOverrides(lyricsDocument, providerId)
          }}
          onReadingOverrideChange={updateReadingOverride}
          timingOffset={timingOffset}
          onTimingOffsetChange={updateTimingOffset}
        />
        <ProviderComparison providers={romanizerRegistry.providers} cache={romanizationCache} />
      </div>
      <footer className="app-footer">Built as an independent portfolio project by Brian Sager.</footer>
    </main>
  )
}
