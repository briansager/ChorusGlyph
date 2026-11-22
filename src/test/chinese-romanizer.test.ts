import { describe, expect, it, vi } from 'vitest'
import { ChineseRomanizerProvider, containsHanCharacters } from '../domain/romanization/chinese-romanizer'

describe('Chinese romanizer', () => {
  it('converts self-written Chinese text with tone marks', async () => {
    const provider = new ChineseRomanizerProvider()
    const result = await provider.romanize({ text: '蓝色的早晨来了', language: 'zh' })

    expect(result).toMatchObject({
      originalText: '蓝色的早晨来了',
      romanizedText: 'lán sè de zǎo chén lái le',
      providerId: 'chinese-pinyin-pro',
      status: 'complete',
      generation: 'deterministic',
    })
    expect(result.romanizedText).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/)
  })

  it('preserves the library output for punctuation, spaces, Latin text, numbers, and line breaks', async () => {
    const provider = new ChineseRomanizerProvider()
    const result = await provider.romanize({ text: 'Hello，中国 123\nABC' })

    expect(result.romanizedText).toBe('H e l l o ， zhōng guó   1 2 3 \n A B C')
  })

  it('detects Han characters and rejects empty or Latin-only text', async () => {
    const provider = new ChineseRomanizerProvider()

    expect(containsHanCharacters('蓝色')).toBe(true)
    expect(containsHanCharacters('   ')).toBe(false)
    expect(containsHanCharacters('English only')).toBe(false)
    expect(provider.supports({ text: '日本語' })).toBe(true)
    await expect(provider.romanize({ text: '' })).resolves.toMatchObject({ status: 'unavailable', romanizedText: '' })
    await expect(provider.romanize({ text: 'English only' })).resolves.toMatchObject({ status: 'unavailable' })
  })

  it('exposes provider metadata, preserves original text, and is deterministic', async () => {
    const provider = new ChineseRomanizerProvider()
    const input = '小小的光在闪烁'
    const first = await provider.romanize({ text: input })
    const second = await provider.romanize({ text: input })

    expect(first.originalText).toBe(input)
    expect(first.romanizedText).toBe('xiǎo xiǎo de guāng zài shǎn shuò')
    expect(second).toEqual(first)
    expect(provider.id).toBe('chinese-pinyin-pro')
    expect(provider.displayName).toBe('Pinyin Pro')
  })

  it('does not use a network request for conversion', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await new ChineseRomanizerProvider().romanize({ text: '今天的天空很明亮' })

    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
