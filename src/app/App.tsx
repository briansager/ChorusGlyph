import { useState } from 'react'
import type { LyricsDocument } from '../domain/lyrics/lyrics-types'
import { JapaneseRomanizerProvider } from '../domain/romanization/japanese-romanizer'
import { KoreanRomanizerProvider } from '../domain/romanization/korean-romanizer'
import { ChineseRomanizerProvider } from '../domain/romanization/chinese-romanizer'
import { LyricsSourcePanel } from '../features/lyrics-source/LyricsSourcePanel'
import { SyncedLyrics } from '../features/synced-lyrics/SyncedLyrics'
import { sampleLyricsDocument } from '../features/synced-lyrics/lyric-fixtures'

const japaneseRomanizer = new JapaneseRomanizerProvider()
const koreanRomanizer = new KoreanRomanizerProvider()
const chineseRomanizer = new ChineseRomanizerProvider()

export function App() {
  const [lyricsDocument, setLyricsDocument] = useState<LyricsDocument>(sampleLyricsDocument)
  const [romanizedLines, setRomanizedLines] = useState<Record<string, string>>({})
  const [isRomanizing, setIsRomanizing] = useState(false)
  const [romanizationError, setRomanizationError] = useState<string>()
  const [romanizationLanguage, setRomanizationLanguage] = useState<'japanese' | 'korean' | 'chinese'>('japanese')

  const romanizeSelectedLanguage = async () => {
    setRomanizationError(undefined)
    setIsRomanizing(true)

    try {
      const nextReadings = { ...romanizedLines }
      let convertedCount = 0
      const romanizer = romanizationLanguage === 'korean'
        ? koreanRomanizer
        : romanizationLanguage === 'chinese'
          ? chineseRomanizer
          : japaneseRomanizer

      for (const line of lyricsDocument.lines) {
        if (!line.text.trim() || nextReadings[line.id] || !romanizer.supports({ text: line.text })) continue
        const result = await romanizer.romanize({
          text: line.text,
          language: romanizationLanguage === 'korean' ? 'ko' : romanizationLanguage === 'chinese' ? 'zh' : 'ja',
        })
        if (result.status === 'complete') {
          nextReadings[line.id] = result.romanizedText
          convertedCount += 1
        }
      }

      setRomanizedLines(nextReadings)
      if (convertedCount === 0 && Object.keys(nextReadings).length === 0) {
        const languageName = romanizationLanguage === 'korean' ? 'Korean' : romanizationLanguage === 'chinese' ? 'Chinese' : 'Japanese'
        setRomanizationError(`No ${languageName} lines were found to romanize.`)
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
                isRomanizing={isRomanizing}
                romanizationError={romanizationError}
                onRomanize={romanizeSelectedLanguage}
                romanizationLanguage={romanizationLanguage}
                onRomanizationLanguageChange={setRomanizationLanguage}
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
