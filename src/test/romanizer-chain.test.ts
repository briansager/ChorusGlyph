import { describe, expect, it, vi } from 'vitest'
import { RomanizerChain } from '../domain/romanization/romanizer-chain'
import type { RomanizerProvider } from '../domain/romanization/romanizer-provider'

function provider(id: string, supports: boolean, romanizedText: string): RomanizerProvider {
  return {
    id,
    displayName: id,
    version: '1.0.0',
    supports: vi.fn(() => supports),
    romanize: vi.fn(async (input) => ({
      originalText: input.text,
      romanizedText,
      providerId: id,
      status: 'complete' as const,
      generation: 'deterministic' as const,
    })),
  }
}

describe('RomanizerChain', () => {
  it('selects the first supporting provider and skips unsupported providers', async () => {
    const first = provider('first', false, 'unused')
    const second = provider('second', true, 'local reading')
    const third = provider('third', true, 'not reached')

    await expect(new RomanizerChain([first, second, third]).romanize({ text: '青い朝が来る' })).resolves.toMatchObject({
      originalText: '青い朝が来る',
      romanizedText: 'local reading',
      providerId: 'second',
      status: 'complete',
    })
    expect(first.romanize).not.toHaveBeenCalled()
    expect(second.romanize).toHaveBeenCalledOnce()
    expect(third.supports).not.toHaveBeenCalled()
    expect(third.romanize).not.toHaveBeenCalled()
  })

  it('keeps provider order deterministic and returns a clear unsupported result', async () => {
    const first = provider('first', true, 'first result')
    const second = provider('second', true, 'second result')
    const chain = new RomanizerChain([first, second])

    await expect(chain.romanize({ text: '푸른 아침이 와요' })).resolves.toMatchObject({ providerId: 'first' })

    const unsupported = await new RomanizerChain([provider('none', false, '')]).romanize({ text: 'Plain text' })
    expect(unsupported).toEqual({
      originalText: 'Plain text',
      romanizedText: '',
      providerId: 'none',
      status: 'unavailable',
      generation: 'deterministic',
    })
  })

  it('does not make network calls while selecting providers', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await new RomanizerChain([provider('local', true, 'local')]).romanize({ text: '蓝色的早晨来了' })

    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
