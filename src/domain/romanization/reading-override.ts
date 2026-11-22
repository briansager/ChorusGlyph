export type ReadingOverride = {
  key: string
  sourceId: string
  lineId: string
  providerId: string
  originalText: string
  readingText: string
  updatedAt: number
}

export interface ReadingOverrideStore {
  get(key: string): Promise<ReadingOverride | undefined>
  set(key: string, override: ReadingOverride): Promise<void>
  delete(key: string): Promise<void>
}
