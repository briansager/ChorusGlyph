import { describe, expect, it } from 'vitest'
import type { ReadingOverride, ReadingOverrideStore } from '../domain/romanization/reading-override'
import { createReadingOverrideKey } from '../domain/romanization/reading-override-key'

class MemoryReadingOverrideStore implements ReadingOverrideStore {
  private readonly entries = new Map<string, ReadingOverride>()

  async get(key: string) {
    return this.entries.get(key)
  }

  async set(key: string, override: ReadingOverride) {
    this.entries.set(key, override)
  }

  async delete(key: string) {
    this.entries.delete(key)
  }
}

const override = (readingText: string): ReadingOverride => {
  const key = createReadingOverrideKey({
    sourceId: 'paste-text',
    lineId: 'thai',
    providerId: 'azure-transliteration',
    originalText: 'สวัสดีตอนเช้า',
  })
  return {
    key,
    sourceId: 'paste-text',
    lineId: 'thai',
    providerId: 'azure-transliteration',
    originalText: 'สวัสดีตอนเช้า',
    readingText,
    updatedAt: 1,
  }
}

describe('reading overrides', () => {
  it('saves and loads an edited reading without changing the original lyric', async () => {
    const store = new MemoryReadingOverrideStore()
    const entry = override('Sawasdi ton chao')

    await store.set(entry.key, entry)

    await expect(store.get(entry.key)).resolves.toEqual(entry)
    expect(entry.originalText).toBe('สวัสดีตอนเช้า')
  })

  it('clears an override so the provider reading can be used again', async () => {
    const store = new MemoryReadingOverrideStore()
    const entry = override('Sawasdi ton chao')

    await store.set(entry.key, entry)
    await store.delete(entry.key)

    await expect(store.get(entry.key)).resolves.toBeUndefined()
  })
})
