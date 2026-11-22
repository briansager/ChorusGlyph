import { ChineseRomanizerProvider } from './chinese-romanizer'
import { JapaneseRomanizerProvider } from './japanese-romanizer'
import { KoreanRomanizerProvider } from './korean-romanizer'
import type { RomanizerProvider } from './romanizer-provider'
import { RomanizerChain } from './romanizer-chain'

export class RomanizerRegistry {
  readonly providers: readonly RomanizerProvider[]

  constructor(providers: RomanizerProvider[]) {
    this.providers = [...providers]
  }

  get(providerId: string): RomanizerProvider | undefined {
    return this.providers.find((provider) => provider.id === providerId)
  }

  createChain(): RomanizerChain {
    return new RomanizerChain([...this.providers])
  }
}

export function createLocalRomanizerRegistry(): RomanizerRegistry {
  return new RomanizerRegistry([
    new JapaneseRomanizerProvider(),
    new KoreanRomanizerProvider(),
    new ChineseRomanizerProvider(),
  ])
}
