import { describe, expect, it } from 'vitest'
import { PasteTextLyricsSource } from '../domain/lyrics/paste-text-source'

describe('PasteTextLyricsSource', () => {
  const source = new PasteTextLyricsSource()

  it('parses valid timed pasted text', async () => {
    const document = await source.load({ text: '[00:01]Original first line\n[00:03]Original second line' })

    expect(document.sourceId).toBe('paste-text')
    expect(document.lines.map((line) => line.text)).toEqual(['Original first line', 'Original second line'])
  })

  it('rejects empty input', async () => {
    await expect(source.load({ text: '  ' })).rejects.toThrow('Paste timed LRC text')
  })

  it('rejects untimed text', async () => {
    await expect(source.load({ text: 'This original line has no timestamp.' })).rejects.toThrow(
      'valid timed LRC lines',
    )
  })
})
