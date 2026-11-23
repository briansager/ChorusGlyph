import { describe, expect, it } from 'vitest'
import {
  clampTimingOffset,
  loadTimingOffset,
  saveTimingOffset,
} from '../domain/now-playing/timing-offset'

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('timing offset persistence', () => {
  it('defaults to zero when no offset is stored', () => {
    expect(loadTimingOffset(createStorage())).toBe(0)
  })

  it('persists and restores an offset', () => {
    const storage = createStorage()
    saveTimingOffset(0.5, storage)

    expect(loadTimingOffset(storage)).toBe(0.5)
  })

  it('clamps offsets to the supported range', () => {
    expect(clampTimingOffset(8)).toBe(5)
    expect(clampTimingOffset(-8)).toBe(-5)
    expect(clampTimingOffset(Number.NaN)).toBe(0)
  })

  it('falls back safely when local storage is unavailable', () => {
    const unavailableStorage = {
      getItem: () => { throw new Error('Storage unavailable') },
      setItem: () => { throw new Error('Storage unavailable') },
    }

    expect(loadTimingOffset(unavailableStorage)).toBe(0)
    expect(() => saveTimingOffset(0.5, unavailableStorage)).not.toThrow()
  })
})
