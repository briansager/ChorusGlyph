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

  get manualProviders(): readonly RomanizerProvider[] {
    return this.providers.filter((provider) => provider.manualSelectable !== false)
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
import { AzureTransliterationProvider, type AzureTransliterationProfile } from './azure-transliteration-provider'

export function createRomanizerRegistry(options: {
  azureWorkerUrl?: string
  azureProfile?: AzureTransliterationProfile
} = {}): RomanizerRegistry {
  return new RomanizerRegistry([
    new JapaneseRomanizerProvider(),
    new KoreanRomanizerProvider(),
    new ChineseRomanizerProvider(),
    new AzureTransliterationProvider({ workerUrl: options.azureWorkerUrl, profile: options.azureProfile }),
  ])
}
