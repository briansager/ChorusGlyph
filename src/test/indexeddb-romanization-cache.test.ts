import { describe, expect, it, vi } from 'vitest'
import { IndexedDbRomanizationCache } from '../domain/romanization/indexeddb-romanization-cache'

describe('IndexedDbRomanizationCache', () => {
  it('degrades gracefully when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const cache = new IndexedDbRomanizationCache()

    await expect(cache.get('missing')).resolves.toBeUndefined()
    await expect(cache.set('key', {
      cacheKey: 'key',
      sourceId: 'paste-text',
      providerId: 'local',
      providerVersion: '1.0.0',
      originalText: '푸른 아침이 와요',
      romanizedText: 'pureun achimi wayo',
      createdAt: 1,
      updatedAt: 1,
    })).resolves.toBeUndefined()
    await expect(cache.delete('key')).resolves.toBeUndefined()
    await expect(cache.clear()).resolves.toBeUndefined()
    vi.unstubAllGlobals()
  })
})
