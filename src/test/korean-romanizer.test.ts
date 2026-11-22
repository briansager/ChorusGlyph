import { describe, expect, it } from 'vitest'
import {
  decomposeKoreanSyllable,
  KoreanRomanizerProvider,
  romanizeKoreanText,
} from '../domain/romanization/korean-romanizer'

describe('Korean romanizer', () => {
  it('decomposes a precomposed Hangul syllable', () => {
    expect(decomposeKoreanSyllable('한')).toEqual({ initial: 18, vowel: 0, final: 4 })
    expect(decomposeKoreanSyllable('A')).toBeUndefined()
  })

  it('maps the official basic vowels', () => {
    expect(romanizeKoreanText('가 개 갸 걔 거 게 겨 계 고 과 괘 괴 교 구 궈 궤 귀 규 그 의 기')).toBe(
      'ga gae gya gyae geo ge gyeo gye go gwa gwae goe gyo gu gwo gwe gwi gyu geu ui gi',
    )
  })

  it('maps initial consonants', () => {
    expect(romanizeKoreanText('가 까 나 다 따 라 마 바 빠 사 싸 아 자 짜 차 카 타 파 하')).toBe(
      'ga kka na da tta ra ma ba ppa sa ssa a ja jja cha ka ta pa ha',
    )
  })

  it('maps final consonants with neutralized final spellings', () => {
    expect(romanizeKoreanText('각 갂 갃 간 갅 갆 갇 갈 갉 갊 갋 갌 갍 갎 갏 감 갑 값 갓 갔 강 갖 갗 갘 같 갚 갛')).toBe(
      'gak gak gak gan gan gan gat gal gak gam gap gal gal gap gal gam gap gap gat gat gang gat gat gak gat gap gat',
    )
  })

  it('handles ㄹ, silent ㅇ, liaison, and the common ㄹㄹ boundary', () => {
    expect(romanizeKoreanText('라 랄 말 라라 물어')).toBe('ra ral mal rara mureo')
    expect(romanizeKoreanText('할아버지')).toBe('harabeoji')
    expect(romanizeKoreanText('설레')).toBe('seolle')
  })

  it('preserves spaces, punctuation, line breaks, numbers, and Latin text', () => {
    expect(romanizeKoreanText('오늘! 123\nHello, 맑아요.')).toBe('oneul! 123\nHello, malgayo.')
  })

  it('returns unsupported for empty and non-Hangul text', async () => {
    const provider = new KoreanRomanizerProvider()

    expect(provider.supports({ text: '   English only' })).toBe(false)
    await expect(provider.romanize({ text: '' })).resolves.toMatchObject({
      romanizedText: '',
      status: 'unavailable',
      generation: 'deterministic',
    })
    await expect(provider.romanize({ text: 'English only' })).resolves.toMatchObject({ status: 'unavailable' })
  })

  it('returns provider metadata, preserves original text, and is deterministic', async () => {
    const provider = new KoreanRomanizerProvider()
    const input = '푸른 아침이 와요'
    const first = await provider.romanize({ text: input, language: 'ko' })
    const second = await provider.romanize({ text: input, language: 'ko' })

    expect(first).toEqual({
      originalText: input,
      romanizedText: 'pureun achimi wayo',
      providerId: 'korean-local',
      status: 'complete',
      generation: 'deterministic',
    })
    expect(second).toEqual(first)
    expect(provider.id).toBe('korean-local')
    expect(provider.displayName).toBe('Korean Romanization')
  })
})
