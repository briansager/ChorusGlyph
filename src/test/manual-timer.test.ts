import { describe, expect, it } from 'vitest'
import { ManualTimer } from '../domain/now-playing/manual-timer'
import type { NowPlayingSource } from '../domain/now-playing/now-playing-source'

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

  it('satisfies the NowPlayingSource contract and notifies subscribers', () => {
    let now = 5000
    const timer = new ManualTimer(() => now, { title: 'Original demo', artist: 'ChorusGlyph' })
    const source: NowPlayingSource = timer
    const states = [] as ReturnType<NowPlayingSource['getState']>[]
    const unsubscribe = source.subscribe((state) => states.push(state))

    timer.play()
    now += 750
    timer.seek(3)
    timer.pause()
    timer.reset()

    expect(states.map((state) => state.playbackState)).toEqual(['playing', 'playing', 'paused', 'paused'])
    expect(states[0]).toMatchObject({ title: 'Original demo', artist: 'ChorusGlyph', position: 0 })
    expect(states[1].position).toBe(3)
    expect(source.getState()).toMatchObject({ playbackState: 'paused', position: 0 })

    unsubscribe()
    timer.play()
    expect(states).toHaveLength(4)
  })
})
