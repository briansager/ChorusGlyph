import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji/dist/kuroshiro-analyzer-kuromoji.js'
import type { RomanizationInput, RomanizationResult } from './romanization-types'
import type { RomanizerProvider } from './romanizer-provider'
import type {
  JapaneseKuroshiroConverter,
  JapaneseKuromojiAnalyzer,
  JapaneseRomanizerDependencies,
} from './japanese-romanizer-types'

const japaneseCharacterPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/

export class JapaneseRomanizerProvider implements RomanizerProvider {
  readonly id = 'japanese-kuroshiro'
  readonly displayName = 'Kuroshiro + Kuromoji'
  readonly version = '1.0.0'
  private readonly createConverter: () => JapaneseKuroshiroConverter
  private readonly createAnalyzer: (options: { dictPath: string }) => JapaneseKuromojiAnalyzer
  private readonly dictPath: string
  private converter: JapaneseKuroshiroConverter | undefined
  private initialization: Promise<void> | undefined

  constructor(dependencies: JapaneseRomanizerDependencies = {}) {
    this.createConverter = dependencies.createConverter ?? (() => new Kuroshiro())
    this.createAnalyzer = dependencies.createAnalyzer ?? ((options) => new KuromojiAnalyzer(options))
    this.dictPath = dependencies.dictPath ?? `${import.meta.env.BASE_URL}dict/`
  }

  supports(input: RomanizationInput): boolean {
    return japaneseCharacterPattern.test(input.text.trim())
  }

  async romanize(input: RomanizationInput): Promise<RomanizationResult> {
    if (!this.supports(input)) {
      return {
        originalText: input.text,
        romanizedText: '',
        providerId: this.id,
        status: 'unavailable',
        generation: 'browser',
      }
    }

    try {
      await this.ensureInitialized()
      const romanizedText = await this.converter!.convert(input.text, {
        to: 'romaji',
        romajiSystem: 'hepburn',
      })

      return {
        originalText: input.text,
        romanizedText,
        providerId: this.id,
        status: 'complete',
        generation: 'browser',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown conversion error.'
      throw new Error(`Japanese romanization failed: ${message}`)
    }
  }

  private ensureInitialized(): Promise<void> {
    if (this.initialization) return this.initialization

    this.initialization = (async () => {
      const converter = this.createConverter()
      const analyzer = this.createAnalyzer({ dictPath: this.dictPath })
      await converter.init(analyzer)
      this.converter = converter
    })().catch((error) => {
      this.initialization = undefined
      const message = error instanceof Error ? error.message : 'Unknown initialization error.'
      throw new Error(`Japanese romanization initialization failed: ${message}`)
    })

    return this.initialization
  }
}
