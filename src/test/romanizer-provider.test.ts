import { describe, expect, it } from 'vitest'
import type { RomanizerProvider } from '../domain/romanization/romanizer-provider'

describe('RomanizerProvider contract', () => {
  it('can be implemented without selecting a provider', async () => {
    const provider: RomanizerProvider = {
      id: 'test-provider',
      displayName: 'Test provider',
      supports: (input) => input.text.length > 0,
      romanize: async (input) => ({
        originalText: input.text,
        romanizedText: input.text,
        providerId: 'test-provider',
        status: 'unavailable',
      }),
    }

    expect(provider.supports({ text: 'Original text' })).toBe(true)
    await expect(provider.romanize({ text: 'Original text' })).resolves.toMatchObject({
      status: 'unavailable',
    })
  })
})
