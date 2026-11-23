export type ComparisonLanguage = 'japanese' | 'chinese' | 'korean' | 'thai' | 'ambiguous' | 'unknown'
export type HanLanguageHint = 'japanese' | 'chinese' | undefined

const hiraganaOrKatakanaPattern = /[\u3040-\u309f\u30a0-\u30ff]/u
const hanPattern = /[\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{2a6df}]/u
const hangulPattern = /[\uac00-\ud7a3]/u
const thaiPattern = /[\u0e00-\u0e7f]/u

export function detectComparisonLanguage(text: string): ComparisonLanguage {
  const trimmedText = text.trim()
  if (!trimmedText) return 'unknown'
  if (hiraganaOrKatakanaPattern.test(trimmedText)) return 'japanese'
  if (hangulPattern.test(trimmedText)) return 'korean'
  if (thaiPattern.test(trimmedText)) return 'thai'
  if (hanPattern.test(trimmedText)) return 'chinese'
  return 'unknown'
}

export function resolveComparisonLanguage(text: string, hanLanguageHint: HanLanguageHint): ComparisonLanguage {
  const detectedLanguage = detectComparisonLanguage(text)
  if (detectedLanguage === 'chinese' && !hanLanguageHint) return 'ambiguous'
  if (detectedLanguage === 'chinese' && hanLanguageHint) return hanLanguageHint
  return detectedLanguage
}
