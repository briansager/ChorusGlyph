import { describe, expect, it } from 'vitest'
import { LrcFileLyricsSource } from '../domain/lyrics/lrc-file-source'

describe('LrcFileLyricsSource', () => {
  const source = new LrcFileLyricsSource()

  it('reads and parses a valid local File', async () => {
    const file = new File(['[00:02]Original file line'], 'demo.lrc', { type: 'text/plain' })
    const document = await source.load({ file })

    expect(document.sourceId).toBe('lrc-file')
    expect(document.lines[0].text).toBe('Original file line')
  })

  it('rejects an empty file', async () => {
    const file = new File([''], 'empty.lrc', { type: 'text/plain' })

    await expect(source.load({ file })).rejects.toThrow('file is empty')
  })

  it('rejects invalid LRC content', async () => {
    const file = new File(['This is not timed lyric content.'], 'invalid.txt', { type: 'text/plain' })

    await expect(source.load({ file })).rejects.toThrow('valid timed LRC lines')
  })
})
