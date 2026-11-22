import { pinyin } from 'pinyin-pro'
import type { RomanizationInput, RomanizationResult } from './romanization-types'
import type { RomanizerProvider } from './romanizer-provider'
import type { ChinesePinyinOptions } from './chinese-romanizer-types'

const hanCharacterPattern = /[\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{2a6df}]/u
const pinyinOptions: ChinesePinyinOptions = { toneType: 'symbol' }

export function containsHanCharacters(text: string): boolean {
  return hanCharacterPattern.test(text)
}
export class ChineseRomanizerProvider implements RomanizerProvider {
  readonly id = 'chinese-pinyin-pro'
  readonly displayName = 'Pinyin Pro'
  readonly version = '1.0.0'

  supports(input: RomanizationInput): boolean {
    return containsHanCharacters(input.text)
  }

  async romanize(input: RomanizationInput): Promise<RomanizationResult> {
    if (!this.supports(input)) {
      return {
        originalText: input.text,
        romanizedText: '',
        providerId: this.id,
        status: 'unavailable',
        generation: 'deterministic',
      }
    }

    try {
      return {
        originalText: input.text,
        romanizedText: pinyin(input.text, pinyinOptions),
        providerId: this.id,
        status: 'complete',
        generation: 'deterministic',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown conversion error.'
      throw new Error(`Chinese romanization failed: ${message}`)
    }
  }
}
