export type RomanizationCacheEntry = {
  cacheKey: string
  sourceId: string
  title?: string
  artist?: string
  duration?: number
  providerId: string
  providerVersion: string
  originalText: string
  romanizedText: string
  createdAt: number
  updatedAt: number
}

export interface RomanizationCache {
  get(key: string): Promise<RomanizationCacheEntry | undefined>
  set(key: string, entry: RomanizationCacheEntry): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}
