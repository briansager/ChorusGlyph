import type { RomanizationInput, RomanizationResult } from './romanization-types'
import type { RomanizerProvider } from './romanizer-provider'
import type { KoreanSyllable } from './korean-romanizer-types'

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3

// These tables follow the basic Revised Romanization spellings. Compound final
// consonants use their common final-position spelling in this first subset.
const INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']

const LIAISON_PREFIXES: Record<number, string> = {
  3: 'k',
  5: 'n',
  6: 'n',
  9: 'l',
  11: 'l',
  12: 'l',
  13: 'l',
  14: 'l',
  15: 'l',
  18: 'p',
}
const finalToInitial: Record<number, number> = {
  1: 0,
  2: 1,
  3: 0,
  4: 2,
  5: 2,
  6: 2,
  7: 3,
  8: 5,
  9: 0,
  10: 6,
  11: 7,
  12: 9,
  13: 16,
  14: 17,
  15: 18,
  16: 6,
  17: 7,
  18: 9,
  19: 9,
  20: 10,
  21: 11,
  22: 12,
  23: 14,
  24: 15,
  25: 16,
  26: 17,
  27: 18,
}
function isHangulSyllable(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0
  return codePoint >= HANGUL_START && codePoint <= HANGUL_END
}

export function decomposeKoreanSyllable(character: string): KoreanSyllable | undefined {
  if (!isHangulSyllable(character)) return undefined

  const offset = character.codePointAt(0)! - HANGUL_START
  return {
    initial: Math.floor(offset / (21 * 28)),
    vowel: Math.floor((offset % (21 * 28)) / 28),
    final: offset % 28,
  }
}

/**
 * Deterministic approximation of basic Korean Revised Romanization.
 *
 * Implemented here: Hangul decomposition, official basic vowel/consonant
 * spellings, final consonant neutralization, common final-to-initial liaison
 * before silent ㅇ, and the common ㄹㄹ -> ll boundary. Complex sound-change
 * rules, proper-name exceptions, and every pronunciation exception are not
 * attempted silently.
 */
export function romanizeKoreanText(text: string): string {
  const characters = Array.from(text)
  const syllables = characters.map(decomposeKoreanSyllable)

  return characters
    .map((character, index) => {
      const syllable = syllables[index]
      if (!syllable) return character

      const previous = syllables[index - 1]
      const next = syllables[index + 1]
      const nextInitial = next?.initial
      const isLiaison = syllable.final !== 0 && nextInitial === 11
      const finalText = isLiaison ? LIAISON_PREFIXES[syllable.final] ?? '' : FINALS[syllable.final]
      let initialOverride: number | undefined
      let initialTextOverride: string | undefined

      if (previous?.final === 8 && syllable.initial === 5) initialTextOverride = 'l'
      if (previous?.final !== undefined && previous.final !== 0 && syllable.initial === 11) {
        initialOverride = finalToInitial[previous.final]
      }

      return `${initialTextOverride ?? INITIALS[initialOverride ?? syllable.initial]}${VOWELS[syllable.vowel]}${finalText}`
    })
    .join('')
}

export class KoreanRomanizerProvider implements RomanizerProvider {
  readonly id = 'korean-local'
  readonly displayName = 'Korean Romanization'
  readonly version = '1.0.0'

  supports(input: RomanizationInput): boolean {
    return Array.from(input.text).some(isHangulSyllable)
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

    return {
      originalText: input.text,
      romanizedText: romanizeKoreanText(input.text).toLowerCase(),
      providerId: this.id,
      status: 'complete',
      generation: 'deterministic',
    }
  }
}
