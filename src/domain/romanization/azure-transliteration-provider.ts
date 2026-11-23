import type { RomanizationInput, RomanizationResult } from './romanization-types'
import type { RomanizerProvider } from './romanizer-provider'

export type AzureTransliterationProfile = {
  language: string
  fromScript: string
  toScript: 'Latn'
  displayName: string
}
export type AzureTransliterationProviderOptions = {
  workerUrl?: string
  profile?: AzureTransliterationProfile
  fetchFn?: typeof fetch
}

const japanesePattern = /[\u3040-\u30ff]/u
const koreanPattern = /[\uac00-\ud7a3]/u
const hanPattern = /[\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{2a6df}]/u
const thaiPattern = /[\u0e00-\u0e7f]/u

export class AzureTransliterationProvider implements RomanizerProvider {
  readonly id = 'azure-transliteration'
  readonly version = '1.0.0'
  readonly manualSelectable = true
  private readonly workerUrl?: string
  private readonly profile?: AzureTransliterationProfile
  private readonly fetchFn: typeof fetch

  constructor(options: AzureTransliterationProviderOptions = {}) {
    this.workerUrl = options.workerUrl?.trim() || undefined
    this.profile = options.profile
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis)
  }

  get displayName(): string {
    return this.profile ? `Azure Transliteration — ${this.profile.displayName}` : 'Azure Transliteration'
  }

  supports(input: RomanizationInput): boolean {
    if (!this.workerUrl || !this.profile || !input.text.trim()) return false
    if (this.profile.language === 'ja' && japanesePattern.test(input.text)) return false
    if (this.profile.language === 'ko' && koreanPattern.test(input.text)) return false
    if ((this.profile.language === 'zh-Hans' || this.profile.language === 'zh-Hant') && hanPattern.test(input.text)) return false
    if (this.profile.language === 'th' && !thaiPattern.test(input.text)) return false
    return true
  }

  async romanize(input: RomanizationInput): Promise<RomanizationResult> {
    if (!this.supports(input) || !this.profile || !this.workerUrl) {
      return {
        originalText: input.text,
        romanizedText: '',
        providerId: this.id,
        status: 'unavailable',
        generation: 'external',
      }
    }

    let response: Response
    try {
      const requestUrl = new URL('/api/transliterate', this.workerUrl)
      response = await this.fetchFn(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: this.profile.language,
          fromScript: this.profile.fromScript,
          toScript: this.profile.toScript,
          text: input.text,
        }),
      })
    } catch {
      throw new Error('Azure transliteration proxy could not be reached.')
    }

    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After')
      const suffix = retryAfter ? ` Try again in ${retryAfter} seconds.` : ''
      throw new Error(`Azure transliteration proxy returned HTTP ${response.status}.${suffix}`)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new Error('Azure transliteration proxy returned invalid JSON.')
    }
    if (!payload || typeof payload !== 'object' || typeof (payload as { text?: unknown }).text !== 'string') {
      throw new Error('Azure transliteration proxy returned an invalid result.')
    }

    return {
      originalText: input.text,
      romanizedText: (payload as { text: string }).text,
      providerId: this.id,
      status: 'complete',
      generation: 'external',
    }
  }
}
