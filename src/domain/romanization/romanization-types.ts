export type RomanizationInput = {
  text: string
  language?: string
  words?: string[]
}

export type RomanizedWord = {
  originalText: string
  romanizedText: string
  startTime?: number
  endTime?: number
}

export type RomanizationStatus = 'complete' | 'unavailable' | 'error'

export type RomanizationResult = {
  originalText: string
  romanizedText: string
  providerId: string
  status: RomanizationStatus
  generation?: 'browser' | 'deterministic'
  confidence?: number
  words?: RomanizedWord[]
}
