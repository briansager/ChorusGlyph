import type { RomanizationInput, RomanizationResult } from './romanization-types'
import type { RomanizerProvider } from './romanizer-provider'

export class RomanizerChain {
  private readonly providers: RomanizerProvider[]

  constructor(providers: RomanizerProvider[]) {
    this.providers = [...providers]
  }

  async romanize(input: RomanizationInput): Promise<RomanizationResult> {
    for (const provider of this.providers) {
      if (!provider.supports(input)) continue

      const result = await provider.romanize(input)
      return { ...result, originalText: input.text }
    }

    return {
      originalText: input.text,
      romanizedText: '',
      providerId: 'none',
      status: 'unavailable',
      generation: 'deterministic',
    }
  }
}
