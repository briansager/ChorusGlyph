import { useState } from 'react'
import type { RomanizationCache } from '../../domain/romanization/romanization-cache'
import { createRomanizationCacheKey } from '../../domain/romanization/romanization-cache-key'
import type { RomanizerProvider } from '../../domain/romanization/romanizer-provider'
import { detectComparisonLanguage, resolveComparisonLanguage, type ComparisonLanguage, type HanLanguageHint } from './comparison-language'

type ComparisonStatus = 'supported' | 'unsupported' | 'loading' | 'complete' | 'cached' | 'error'

type ComparisonResult = {
  status: ComparisonStatus
  reading?: string
  error?: string
}

type ProviderComparisonProps = {
  providers: readonly RomanizerProvider[]
  cache: RomanizationCache
}

const examples = [
  { label: 'Japanese', text: '青い朝が来る' },
  { label: 'Korean', text: '푸른 아침이 와요' },
  { label: 'Chinese', text: '蓝色的早晨来了' },
  { label: 'Thai', text: 'สวัสดีตอนเช้า' },
]

function isNetworkProvider(provider: RomanizerProvider): boolean {
  return provider.id === 'azure-transliteration'
}

function statusLabel(status: ComparisonStatus): string {
  if (status === 'unsupported') return 'Not supported'
  if (status === 'loading') return 'Loading'
  if (status === 'cached') return 'Cached locally'
  if (status === 'error') return 'Error'
  return 'Supported'
}

export function ProviderComparison({ providers, cache }: ProviderComparisonProps) {
  const [inputText, setInputText] = useState(examples[0].text)
  const [hanLanguageHint, setHanLanguageHint] = useState<HanLanguageHint>('japanese')
  const [results, setResults] = useState<Record<string, ComparisonResult>>({})
  const [isComparing, setIsComparing] = useState(false)

  const updateInputText = (text: string, nextHanLanguageHint?: HanLanguageHint) => {
    setInputText(text)
    setHanLanguageHint(nextHanLanguageHint)
    setResults({})
  }

  const detectedLanguage = detectComparisonLanguage(inputText)
  const comparisonLanguage = resolveComparisonLanguage(inputText, hanLanguageHint)

  const providerMatchesLanguage = (provider: RomanizerProvider, language: ComparisonLanguage): boolean => {
    if (language === 'japanese' && provider.id === 'chinese-pinyin-pro') return false
    if (language === 'japanese' && provider.id === 'japanese-kuroshiro') return true
    if (language === 'chinese' && provider.id === 'japanese-kuroshiro') return false
    if (language === 'chinese' && provider.id === 'chinese-pinyin-pro') return true
    if (language === 'korean') return provider.id === 'korean-local'
    if (language === 'thai') return provider.id === 'azure-transliteration'
    if (language === 'ambiguous' && (provider.id === 'japanese-kuroshiro' || provider.id === 'chinese-pinyin-pro')) return false
    try {
      return provider.supports({ text: inputText })
    } catch {
      return false
    }
  }

  const getInitialStatus = (provider: RomanizerProvider): ComparisonStatus => {
    if (!inputText.trim() || comparisonLanguage === 'unknown') return 'unsupported'
    if (comparisonLanguage === 'ambiguous' && (provider.id === 'japanese-kuroshiro' || provider.id === 'chinese-pinyin-pro')) {
      return 'unsupported'
    }
    return providerMatchesLanguage(provider, comparisonLanguage) ? 'supported' : 'unsupported'
  }

  const compareProviders = async () => {
    const text = inputText
    const language = comparisonLanguage
    const supportedProviders = providers.filter((provider) => {
      return Boolean(text.trim()) && language !== 'ambiguous' && providerMatchesLanguage(provider, language)
    })

    setIsComparing(true)
    setResults(Object.fromEntries(providers.map((provider) => [
      provider.id,
      { status: supportedProviders.includes(provider) ? 'loading' : 'unsupported' },
    ])))

    await Promise.all(supportedProviders.map(async (provider) => {
      const providerVersion = provider.version ?? '1.0.0'
      const cacheKey = createRomanizationCacheKey({
        sourceId: 'provider-comparison',
        originalText: text,
        providerId: provider.id,
        providerVersion,
      })

      try {
        const cachedEntry = await cache.get(cacheKey)
        if (cachedEntry?.originalText === text) {
          setResults((current) => ({
            ...current,
            [provider.id]: { status: 'cached', reading: cachedEntry.romanizedText },
          }))
          return
        }

        const result = await provider.romanize({ text })
        if (result.status !== 'complete') {
          setResults((current) => ({ ...current, [provider.id]: { status: 'unsupported' } }))
          return
        }

        const now = Date.now()
        try {
          await cache.set(cacheKey, {
            cacheKey,
            sourceId: 'provider-comparison',
            providerId: provider.id,
            providerVersion,
            originalText: text,
            romanizedText: result.romanizedText,
            createdAt: now,
            updatedAt: now,
          })
        } catch {
          // Comparison remains usable when IndexedDB is unavailable.
        }
        setResults((current) => ({ ...current, [provider.id]: { status: 'complete', reading: result.romanizedText } }))
      } catch (error) {
        setResults((current) => ({
          ...current,
          [provider.id]: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Provider comparison failed safely.',
          },
        }))
      }
    }))

    setIsComparing(false)
  }

  return (
    <section className="rounded-2xl border border-blue-800/60 bg-slate-950/70 p-5 sm:p-7" aria-label="Provider comparison">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Provider comparison</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Compare local readings</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Use self-written test lines to compare available romanizers. Unsupported lines are never sent to Azure.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <label htmlFor="provider-comparison-input" className="block text-sm font-medium text-slate-300">
          Original test text
        </label>
        <textarea
          id="provider-comparison-input"
          aria-label="Original test text"
          value={inputText}
          onChange={(event) => updateInputText(event.target.value)}
          rows={2}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
        />
        <div className="flex flex-wrap gap-2" aria-label="Self-written examples">
          {examples.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => updateInputText(example.text, example.label === 'Japanese' ? 'japanese' : example.label === 'Chinese' ? 'chinese' : undefined)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-200"
            >
              {example.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void compareProviders()}
          disabled={isComparing}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {isComparing ? 'Comparing providers…' : 'Compare providers'}
        </button>
        {detectedLanguage === 'chinese' && comparisonLanguage === 'ambiguous' && (
          <label htmlFor="comparison-language-hint" className="flex flex-wrap items-center gap-2 text-sm text-amber-200">
            <span>Han-only text is ambiguous; choose a language</span>
            <select
              id="comparison-language-hint"
              aria-label="Han-only language hint"
              value={hanLanguageHint ?? 'auto'}
              onChange={(event) => {
                const value = event.target.value
                setHanLanguageHint(value === 'japanese' || value === 'chinese' ? value : undefined)
                setResults({})
              }}
              className="rounded-lg border border-amber-700/70 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            >
              <option value="auto">Auto (ambiguous)</option>
              <option value="japanese">Japanese</option>
              <option value="chinese">Chinese</option>
            </select>
          </label>
        )}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {providers.map((provider) => {
          const result = results[provider.id]
          const status = result?.status ?? getInitialStatus(provider)
          return (
            <article key={provider.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-blue-100">{provider.displayName}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {provider.id} · v{provider.version ?? 'unspecified'}
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
                  {statusLabel(status)}
                </span>
              </div>
              {isNetworkProvider(provider) && (
                <p className="mt-3 text-xs text-amber-200">Network-generated through the configured Worker</p>
              )}
              {result?.reading && (
                <p className="mt-3 rounded-lg bg-slate-950 px-3 py-2 text-sm italic text-slate-200">{result.reading}</p>
              )}
              {result?.error && <p role="alert" className="mt-3 text-sm text-red-200">{result.error}</p>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
