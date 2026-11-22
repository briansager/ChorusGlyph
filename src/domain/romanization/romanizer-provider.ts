import type { RomanizationInput, RomanizationResult } from './romanization-types'

export interface RomanizerProvider {
  id: string
  displayName: string
  version?: string
  manualSelectable?: boolean
  supports(input: RomanizationInput): boolean
  romanize(input: RomanizationInput): Promise<RomanizationResult>
}
