import { describe, expect, it } from 'vitest'
import { parseLrc } from '../domain/lyrics/lrc-parser'

describe('parseLrc', () => {
  it('parses normal timestamped lines and infers end times', () => {
    const lines = parseLrc('[00:01]First line\n[00:04]Second line\n[00:08]Final line')

    expect(lines).toEqual([
      { id: 'lyric-0-0', text: 'First line', startTime: 1, endTime: 4 },
      { id: 'lyric-1-0', text: 'Second line', startTime: 4, endTime: 8 },
      { id: 'lyric-2-0', text: 'Final line', startTime: 8 },
    ])
  })

  it('parses decimal timestamps with one to three decimal places', () => {
    const lines = parseLrc('[01:02.5]One\n[01:03.25]Two\n[01:04.125]Three')

    expect(lines.map((line) => line.startTime)).toEqual([62.5, 63.25, 64.125])
  })

  it('creates a line for every timestamp on one line', () => {
    const lines = parseLrc('[00:02][00:05]Repeated text')

    expect(lines.map(({ text, startTime }) => ({ text, startTime }))).toEqual([
      { text: 'Repeated text', startTime: 2 },
      { text: 'Repeated text', startTime: 5 },
    ])
  })

  it('ignores metadata tags and blank lines', () => {
    const lines = parseLrc('\n[ar:Someone]\n[ti:Demo title]\n[by:Someone else]\n[00:01]Visible line\n')

    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('Visible line')
  })

  it('skips malformed timestamps safely', () => {
    const lines = parseLrc('[bad]No time\n[00:99]Invalid seconds\n[00:01.1234]Too precise\n[00:03]Valid line')

    expect(lines.map((line) => line.text)).toEqual(['Valid line'])
  })

  it('sorts parsed lines by start time', () => {
    const lines = parseLrc('[00:10]Later\n[00:02]Earlier\n[00:06]Middle')

    expect(lines.map((line) => line.text)).toEqual(['Earlier', 'Middle', 'Later'])
  })
})
