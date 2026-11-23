export const TIMING_OFFSET_STORAGE_KEY = 'chorusglyph-timing-offset'
export const MIN_TIMING_OFFSET = -5
export const MAX_TIMING_OFFSET = 5
export const TIMING_OFFSET_STEP = 0.05

export type TimingOffsetStorage = Pick<Storage, 'getItem' | 'setItem'>

export function clampTimingOffset(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_TIMING_OFFSET, Math.max(MIN_TIMING_OFFSET, value))
}

export function loadTimingOffset(storage: TimingOffsetStorage | undefined = getLocalStorage()): number {
  if (!storage) return 0

  try {
    const storedValue = Number(storage.getItem(TIMING_OFFSET_STORAGE_KEY))
    return Number.isFinite(storedValue) ? clampTimingOffset(storedValue) : 0
  } catch {
    return 0
  }
}

export function saveTimingOffset(value: number, storage: TimingOffsetStorage | undefined = getLocalStorage()): void {
  if (!storage) return

  try {
    storage.setItem(TIMING_OFFSET_STORAGE_KEY, String(clampTimingOffset(value)))
  } catch {
    // Local persistence is optional; timing adjustment remains usable without it.
  }
}

function getLocalStorage(): TimingOffsetStorage | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
