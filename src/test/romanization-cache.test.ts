import { describe, expect, it } from 'vitest'
import type { RomanizationCache, RomanizationCacheEntry } from '../domain/romanization/romanization-cache'
import { createRomanizationCacheKey } from '../domain/romanization/romanization-cache-key'

function key(overrides: Partial<Parameters<typeof createRomanizationCacheKey>[0]> = {}) {
  return createRomanizationCacheKey({
    sourceId: 'paste-text',
    title: 'Morning sketch',
    artist: 'ChorusGlyph demo',
    duration: 12,
    originalText: '蓝色的早晨来了',
    providerId: 'chinese-pinyin-pro',
    providerVersion: '1.0.0',
    ...overrides,
  })
}

const entry: RomanizationCacheEntry = {
  cacheKey: key(),
  sourceId: 'paste-text',
  title: 'Morning sketch',
  artist: 'ChorusGlyph demo',
  duration: 12,
  providerId: 'chinese-pinyin-pro',
  providerVersion: '1.0.0',
  originalText: '蓝色的早晨来了',
  romanizedText: 'lán sè de zǎo chén lái le',
  createdAt: 100,
  updatedAt: 100,
}

class MemoryRomanizationCache implements RomanizationCache {
  private readonly entries = new Map<string, RomanizationCacheEntry>()

  async get(cacheKey: string) {
    return this.entries.get(cacheKey)
  }

  async set(cacheKey: string, value: RomanizationCacheEntry) {
    this.entries.set(cacheKey, value)
  }

  async delete(cacheKey: string) {
    this.entries.delete(cacheKey)
  }

  async clear() {
    this.entries.clear()
  }
}

describe('romanization cache keys', () => {
  it('is stable for the same song and changes for identifying fields', () => {
    expect(key()).toBe(key())
    expect(key({ artist: 'Different demo' })).not.toBe(key())
    expect(key({ title: 'Different sketch' })).not.toBe(key())
    expect(key({ duration: 13 })).not.toBe(key())
    expect(key({ sourceId: 'local-file' })).not.toBe(key())
    expect(key({ originalText: '小小的光在闪烁' })).not.toBe(key())
    expect(key({ providerId: 'korean-local' })).not.toBe(key())
    expect(key({ providerVersion: '2.0.0' })).not.toBe(key())
  })
})

describe('RomanizationCache abstraction', () => {
  it('stores, retrieves, updates, deletes, clears, and handles missing entries', async () => {
    const cache = new MemoryRomanizationCache()

    await expect(cache.get(entry.cacheKey)).resolves.toBeUndefined()
    await cache.set(entry.cacheKey, entry)
    await expect(cache.get(entry.cacheKey)).resolves.toEqual(entry)
    await cache.set(entry.cacheKey, { ...entry, romanizedText: 'updated reading', updatedAt: 200 })
    await expect(cache.get(entry.cacheKey)).resolves.toMatchObject({ romanizedText: 'updated reading', updatedAt: 200 })
    await cache.delete(entry.cacheKey)
    await expect(cache.get(entry.cacheKey)).resolves.toBeUndefined()
    await cache.set(entry.cacheKey, entry)
    await cache.clear()
    await expect(cache.get(entry.cacheKey)).resolves.toBeUndefined()
  })
})
