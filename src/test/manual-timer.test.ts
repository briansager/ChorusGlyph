import { describe, expect, it } from 'vitest'
import { ManualTimer } from '../domain/now-playing/manual-timer'

describe('ManualTimer', () => {
  it('plays, pauses, and reports elapsed time using an injected clock', () => {
    let now = 1000
    const timer = new ManualTimer(() => now)

    expect(timer.getCurrentTime()).toBe(0)
    timer.play()
    now += 1250
    expect(timer.getCurrentTime()).toBeCloseTo(1.25)
    expect(timer.isPlaying()).toBe(true)

    timer.pause()
    now += 5000
    expect(timer.getCurrentTime()).toBeCloseTo(1.25)
    expect(timer.isPlaying()).toBe(false)
  })

  it('supports seek, reset, and prevents negative time', () => {
    let now = 2000
    const timer = new ManualTimer(() => now)

    timer.seek(-10)
    expect(timer.getCurrentTime()).toBe(0)
    timer.seek(4.5)
    expect(timer.getCurrentTime()).toBe(4.5)

    timer.play()
    now += 500
    timer.seek(2)
    now += 500
    expect(timer.getCurrentTime()).toBeCloseTo(2.5)

    timer.reset()
    expect(timer.getCurrentTime()).toBe(0)
    expect(timer.isPlaying()).toBe(false)
  })
})
