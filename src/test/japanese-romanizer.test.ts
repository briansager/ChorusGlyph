import { describe, expect, it, vi } from 'vitest'
import { JapaneseRomanizerProvider } from '../domain/romanization/japanese-romanizer'

function createMockProvider(convertedText = 'asa no hikari') {
  const converter = {
    init: vi.fn().mockResolvedValue(undefined),
    convert: vi.fn().mockResolvedValue(convertedText),
  }
  const analyzer = {
    init: vi.fn().mockResolvedValue(undefined),
    parse: vi.fn().mockResolvedValue([]),
  }
  const createAnalyzer = vi.fn().mockReturnValue(analyzer)
  const provider = new JapaneseRomanizerProvider({
    createConverter: () => converter,
    createAnalyzer,
    dictPath: '/dict/',
  })

  return { provider, converter, analyzer, createAnalyzer }
}

describe('JapaneseRomanizerProvider', () => {
  it('identifies Japanese text and rejects empty or Latin-only text', () => {
    const { provider } = createMockProvider()

    expect(provider.supports({ text: '朝のひかり' })).toBe(true)
    expect(provider.supports({ text: 'カタカナ' })).toBe(true)
    expect(provider.supports({ text: 'English only' })).toBe(false)
    expect(provider.supports({ text: '   ' })).toBe(false)
  })

  it('exposes provider metadata and performs Hepburn conversion', async () => {
    const { provider, converter, createAnalyzer } = createMockProvider()

    const result = await provider.romanize({ text: '朝のひかり', language: 'ja' })

    expect(provider.id).toBe('japanese-kuroshiro')
    expect(provider.displayName).toBe('Kuroshiro + Kuromoji')
    expect(result).toMatchObject({
      originalText: '朝のひかり',
      romanizedText: 'asa no hikari',
      providerId: 'japanese-kuroshiro',
      status: 'complete',
      generation: 'browser',
    })
    expect(createAnalyzer).toHaveBeenCalledWith({ dictPath: '/dict/' })
    expect(converter.convert).toHaveBeenCalledWith('朝のひかり', {
      to: 'romaji',
      romajiSystem: 'hepburn',
    })
  })

  it('initializes the analyzer once and reuses it for multiple lines', async () => {
    const { provider, converter, analyzer, createAnalyzer } = createMockProvider()

    await provider.romanize({ text: '朝' })
    await provider.romanize({ text: '夜' })

    expect(createAnalyzer).toHaveBeenCalledOnce()
    expect(converter.init).toHaveBeenCalledOnce()
    expect(analyzer.init).not.toHaveBeenCalled()
    expect(converter.convert).toHaveBeenCalledTimes(2)
  })

  it('returns an unsupported result for non-Japanese text without initializing', async () => {
    const { provider, createAnalyzer } = createMockProvider()

    await expect(provider.romanize({ text: 'English only' })).resolves.toMatchObject({
      originalText: 'English only',
      romanizedText: '',
      status: 'unavailable',
    })
    expect(createAnalyzer).not.toHaveBeenCalled()
  })

  it('reports conversion failures clearly', async () => {
    const { provider, converter } = createMockProvider()
    converter.convert.mockRejectedValue(new Error('converter failed'))

    await expect(provider.romanize({ text: '朝' })).rejects.toThrow('Japanese romanization failed: converter failed')
  })

  it('reports initialization failures clearly', async () => {
    const { provider, converter } = createMockProvider()
    converter.init.mockRejectedValue(new Error('dictionary failed'))

    await expect(provider.romanize({ text: '朝' })).rejects.toThrow(
      'Japanese romanization initialization failed: dictionary failed',
    )
  })
})
