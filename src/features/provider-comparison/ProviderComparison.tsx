import { Icon, type IconName } from '../../shared/ui/Icon'
import { useRef, useState } from 'react'
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
  { label: 'Japanese', badge: 'JA', text: '青い朝が来る' },
  { label: 'Korean', badge: 'KO', text: '푸른 아침이 와요' },
  { label: 'Chinese', badge: 'ZH', text: '蓝色的早晨来了' },
  { label: 'Thai', badge: 'TH', text: 'สวัสดีตอนเช้า' },
]

function isNetworkProvider(provider: RomanizerProvider): boolean {
  return provider.id === 'azure-transliteration'
}

function statusLabel(status: ComparisonStatus): string {
  if (status === 'unsupported') return 'Not supported'
  if (status === 'loading') return 'Generating reading…'
  if (status === 'cached') return 'Cached locally'
  if (status === 'error') return 'Error'
  if (status === 'complete') return 'Reading generated'
  return 'Ready to compare'
}

function statusIcon(status: ComparisonStatus): IconName {
  return ({ supported: 'supported', unsupported: 'unsupported', loading: 'loading', complete: 'supported', cached: 'cached', error: 'error' } as const)[status]
}

function languageStatusLabel(detectedLanguage: ComparisonLanguage, comparisonLanguage: ComparisonLanguage): string {
  if (detectedLanguage === 'chinese' && comparisonLanguage === 'ambiguous') return 'Japanese or Chinese — please choose'
  if (detectedLanguage === 'chinese') return `${comparisonLanguage === 'japanese' ? 'Japanese' : 'Chinese'} selected · Han-only text`
  if (comparisonLanguage === 'japanese') return 'Japanese detected'
  if (comparisonLanguage === 'chinese') return 'Chinese detected'
  if (comparisonLanguage === 'korean') return 'Korean detected'
  if (comparisonLanguage === 'thai') return 'Thai detected'
  return 'Language not detected'
}

export function ProviderComparison({ providers, cache }: ProviderComparisonProps) {
  const [inputText, setInputText] = useState(examples[0].text)
  const [hanLanguageHint, setHanLanguageHint] = useState<HanLanguageHint>('japanese')
  const [results, setResults] = useState<Record<string, ComparisonResult>>({})
  const [isComparing, setIsComparing] = useState(false)
  const runIdRef = useRef(0)

  const invalidateCurrentRun = () => {
    runIdRef.current += 1
    setIsComparing(false)
  }

  const updateInputText = (text: string, nextHanLanguageHint?: HanLanguageHint) => {
    invalidateCurrentRun()
    setInputText(text)
    setHanLanguageHint(nextHanLanguageHint)
    setResults({})
  }

  const detectedLanguage = detectComparisonLanguage(inputText)
  const comparisonLanguage = resolveComparisonLanguage(inputText, hanLanguageHint)
  const isComparisonBlocked = !inputText.trim() || comparisonLanguage === 'ambiguous'

  const providerMatchesCurrentLanguage = (provider: RomanizerProvider): boolean => {
    return comparisonLanguage !== 'ambiguous' && providerMatchesLanguage(provider, comparisonLanguage)
  }

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

  const runProvider = async (provider: RomanizerProvider, text: string, runId: number) => {
    const isCurrentRun = () => runIdRef.current === runId
    if (!isCurrentRun()) return

    setResults((current) => ({ ...current, [provider.id]: { status: 'loading' } }))
    const providerVersion = provider.version ?? '1.0.0'
    const cacheKey = createRomanizationCacheKey({
      sourceId: 'provider-comparison',
      originalText: text,
      providerId: provider.id,
      providerVersion,
    })

    try {
      const cachedEntry = await cache.get(cacheKey)
      if (!isCurrentRun()) return
      if (cachedEntry?.originalText === text) {
        setResults((current) => ({
          ...current,
          [provider.id]: { status: 'cached', reading: cachedEntry.romanizedText },
        }))
        return
      }

      const result = await provider.romanize({ text })
      if (!isCurrentRun()) return
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
      if (!isCurrentRun()) return
      setResults((current) => ({ ...current, [provider.id]: { status: 'complete', reading: result.romanizedText } }))
    } catch (error) {
      if (!isCurrentRun()) return
      setResults((current) => ({
        ...current,
        [provider.id]: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Provider comparison failed safely.',
        },
      }))
    }
  }

  const compareProviders = async () => {
    if (isComparing || isComparisonBlocked) return

    const text = inputText
    const runId = ++runIdRef.current
    const supportedProviders = providers.filter((provider) => Boolean(text.trim()) && providerMatchesCurrentLanguage(provider))

    setIsComparing(true)
    setResults(Object.fromEntries(providers.map((provider) => [
      provider.id,
      { status: supportedProviders.includes(provider) ? 'loading' : 'unsupported' },
    ])))

    await Promise.all(supportedProviders.map((provider) => runProvider(provider, text, runId)))

    if (runIdRef.current === runId) setIsComparing(false)
  }

  const retryProvider = async (provider: RomanizerProvider) => {
    if (isComparing || results[provider.id]?.status === 'loading' || !providerMatchesCurrentLanguage(provider)) return

    const runId = ++runIdRef.current
    await runProvider(provider, inputText, runId)
  }

  const clearComparison = () => {
    invalidateCurrentRun()
    setResults({})
  }

  return (
    <section id="comparison" className="rounded-2xl border border-blue-800/60 bg-slate-950/70 p-5 sm:p-7" aria-label="Provider comparison">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">Provider comparison</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Compare readings</h2>
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
        <div className="flex flex-wrap gap-2" role="group" aria-label="Try sample text">
          {examples.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => updateInputText(example.text, example.label === 'Japanese' ? 'japanese' : example.label === 'Chinese' ? 'chinese' : undefined)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-200"
            >
              <span className="language-badge" aria-hidden="true">{example.badge}</span>{example.label}
            </button>
          ))}
        </div>
        <div className="action-row"><button
          type="button"
          onClick={() => void compareProviders()}
          disabled={isComparing || isComparisonBlocked}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <Icon name={isComparing ? 'loading' : 'compare'} />{isComparing ? 'Comparing providers…' : 'Compare providers'}
        </button>
        <button
          type="button"
          onClick={clearComparison}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <Icon name="clear" />Clear comparison
        </button></div>
        {detectedLanguage === 'chinese' && (
          <fieldset className="han-language-choice" aria-label="Han-only language choice">
            <legend className={comparisonLanguage === 'ambiguous' ? 'status-warning' : ''}>{comparisonLanguage === 'ambiguous' ? <><Icon name="warning" />Japanese or Chinese — choose one</> : 'Language for Han-only text'}</legend>
            <div className="flex flex-wrap gap-2">
              {(['japanese', 'chinese'] as const).map((language) => {
                const isActive = hanLanguageHint === language
                const label = language === 'japanese' ? 'Choose Japanese' : 'Choose Chinese'
                return (
                  <label
                    key={language}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-amber-300 ${
                      isActive
                        ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="han-only-language"
                      value={language}
                      aria-label={label}
                      checked={isActive}
                      onChange={() => {
                        invalidateCurrentRun()
                        setHanLanguageHint(language)
                        setResults({})
                      }}
                      className="sr-only"
                    />
                    {language === 'japanese' ? 'Japanese' : 'Chinese'}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}
      </div>

      <p
        className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
        aria-live="polite"
        aria-label="Detected language"
      >
        <Icon name="detection" /> {languageStatusLabel(detectedLanguage, comparisonLanguage)}
      </p>

      <p role="status" className="sr-only">{isComparing ? 'Generating available readings.' : Object.keys(results).length ? 'Comparison updated.' : ''}</p>
      <div className="provider-results">
        {providers.filter((provider) => getInitialStatus(provider) !== 'unsupported').map((provider) => {
          const result = results[provider.id]
          const status = result?.status ?? getInitialStatus(provider)
          return (
            <article key={provider.id} className="provider-card">
              <div className="provider-heading">
                <div>
                  <h3>{provider.displayName}</h3>
                  <p className="helper">{isNetworkProvider(provider) ? 'Online processing' : 'Local processing'} · Supports this language</p>
                </div>
                <span className={`status-chip status-${status}`}><Icon name={statusIcon(status)} />{status === 'complete' && !result?.reading?.trim() ? 'Completed without a reading' : statusLabel(status)}</span>
              </div>
              {status === 'unsupported' && <p className="helper">This provider returned no supported reading for this text.</p>}
              {(status === 'complete' || status === 'cached') && <p className="reading-output">{result?.reading?.trim() ? result.reading : 'No reading returned'}</p>}
              {status === 'cached' && <p className="helper">Loaded from this device’s cache.</p>}
              {result?.error && <p role="alert" className="status-error"><Icon name="error" />{result.error}</p>}
              {result?.status === 'error' && (
                <button type="button" onClick={() => void retryProvider(provider)} disabled={isComparing} className="quiet">
                  <Icon name="retry" />Retry {provider.displayName}
                </button>
              )}
              <details className="provider-details"><summary>Provider details</summary><p>{provider.id} · v{provider.version ?? 'unspecified'}</p>{isNetworkProvider(provider) && <p>Network-generated through the configured Worker</p>}</details>
            </article>
          )
        })}
      </div>
      {providers.some((provider) => getInitialStatus(provider) === 'unsupported') && <div className="unavailable-providers">
        <h3>Unavailable for this text</h3>
        {providers.filter((provider) => getInitialStatus(provider) === 'unsupported').map((provider) => (
          <article key={provider.id} className="provider-unavailable">
            <Icon name="unsupported" />
            <div><h4>{provider.displayName}</h4><p className="helper">{isNetworkProvider(provider) ? 'Online processing' : 'Local processing'} · Not supported</p>
              <p className="helper">{comparisonLanguage === 'ambiguous' ? 'Choose Japanese or Chinese before processing Han-only text.' : comparisonLanguage === 'unknown' || !inputText.trim() ? 'Enter text in a supported language to compare readings.' : `This provider does not support the selected ${comparisonLanguage} text.`}</p>
              <details className="provider-details"><summary>Provider details</summary><p>{provider.id} · v{provider.version ?? 'unspecified'}</p></details>
            </div>
          </article>
        ))}
      </div>}
    </section>
  )
}
