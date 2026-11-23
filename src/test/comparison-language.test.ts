import { describe, expect, it } from 'vitest'
import { detectComparisonLanguage, resolveComparisonLanguage } from '../features/provider-comparison/comparison-language'

describe('comparison language detection', () => {
  it('detects Japanese with Hiragana', () => {
    expect(detectComparisonLanguage('青い朝が来る')).toBe('japanese')
  })

  it('detects Japanese with Katakana', () => {
    expect(detectComparisonLanguage('ブルーな朝')).toBe('japanese')
  })

  it('keeps mixed Japanese punctuation and numbers in the Japanese branch', () => {
    expect(detectComparisonLanguage('青い朝、12時に来る！')).toBe('japanese')
  })

  it('detects Korean and Thai without changing their existing provider behavior', () => {
    expect(detectComparisonLanguage('푸른 아침이 와요')).toBe('korean')
    expect(detectComparisonLanguage('สวัสดีตอนเช้า')).toBe('thai')
  })

  it('detects Han-only Chinese text and resolves it with an explicit language hint', () => {
    expect(detectComparisonLanguage('晨曦将至')).toBe('chinese')
    expect(resolveComparisonLanguage('晨曦将至', undefined)).toBe('ambiguous')
    expect(resolveComparisonLanguage('晨曦将至', 'chinese')).toBe('chinese')
  })

  it('returns an ambiguous result for Kanji-only text without a hint', () => {
    expect(resolveComparisonLanguage('東京', undefined)).toBe('ambiguous')
    expect(resolveComparisonLanguage('東京', 'japanese')).toBe('japanese')
  })

  it('returns unknown for empty input', () => {
    expect(detectComparisonLanguage('')).toBe('unknown')
  })
})
