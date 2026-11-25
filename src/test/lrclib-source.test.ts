import { describe, expect, it, vi } from 'vitest'
import type { LrclibResponse } from '../domain/lyrics/lrclib-types'
import { LrclibLyricsSource } from '../domain/lyrics/lrclib-source'

const syncedResponse: LrclibResponse = {
  trackName: 'Original demo track',
  artistName: 'ChorusGlyph Demo',
  duration: 12,
  instrumental: false,
  syncedLyrics: '[00:00.00]Blue morning starts\n[00:03.00]Small lights cross the sky',
}

describe('LrclibLyricsSource', () => {
  it('loads synced lyrics into a LyricsDocument', async () => {
    const client = { getLyrics: vi.fn().mockResolvedValue(syncedResponse) }
    const source = new LrclibLyricsSource(client)

    const document = await source.load({ title: 'Search title', artist: 'Search artist', duration: 12 })

    expect(client.getLyrics).toHaveBeenCalledWith({ trackName: 'Search title', artistName: 'Search artist', duration: 12 })
    expect(document).toMatchObject({
      sourceId: 'lrclib',
      title: 'Original demo track',
      artist: 'ChorusGlyph Demo',
      duration: 12,
    })
    expect(document.lines.map((line) => line.text)).toEqual(['Blue morning starts', 'Small lights cross the sky'])
  })

  it.each([
    [{ artist: 'Artist', duration: 10 }, 'track title'],
    [{ title: 'Title', artist: 'Artist', duration: 0 }, 'positive duration'],
  ])('rejects missing or invalid %s', async (request, message) => {
    const source = new LrclibLyricsSource({ getLyrics: vi.fn() })

    await expect(source.load(request)).rejects.toThrow(message)
  })

  it('allows a title-only lookup when artist metadata is missing', async () => {
    const client = { getLyrics: vi.fn().mockResolvedValue(syncedResponse) }
    const source = new LrclibLyricsSource(client)

    await source.load({ title: 'Title', duration: 10 })

    expect(client.getLyrics).toHaveBeenCalledWith({ trackName: 'Title', artistName: undefined, duration: 10 })
  })

  it('rejects plain lyrics when synchronized lyrics are unavailable', async () => {
    const source = new LrclibLyricsSource({
      getLyrics: vi.fn().mockResolvedValue({ ...syncedResponse, syncedLyrics: null, plainLyrics: 'Untimed original text' }),
    })

    await expect(source.load({ title: 'Title', artist: 'Artist', duration: 10 })).rejects.toThrow(
      'untimed lyrics cannot yet be synchronized',
    )
  })

  it('rejects responses without usable synchronized lyrics', async () => {
    const source = new LrclibLyricsSource({
      getLyrics: vi.fn().mockResolvedValue({ ...syncedResponse, syncedLyrics: null }),
    })

    await expect(source.load({ title: 'Title', artist: 'Artist', duration: 10 })).rejects.toThrow(
      'did not return synchronized lyrics',
    )
  })
})
