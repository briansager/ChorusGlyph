export type RomanizationCacheKeyInput = {
  sourceId: string
  title?: string
  artist?: string
  duration?: number
  originalText: string
  providerId: string
  providerVersion: string
}

export function createRomanizationCacheKey(input: RomanizationCacheKeyInput): string {
  return `romanization:v1:${JSON.stringify([
    input.sourceId,
    input.title ?? null,
    input.artist ?? null,
    input.duration ?? null,
    input.originalText,
    input.providerId,
    input.providerVersion,
  ])}`
}
