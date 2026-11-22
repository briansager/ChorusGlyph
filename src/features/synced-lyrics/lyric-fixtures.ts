import { parseLrc } from '../../domain/lyrics/lrc-parser'

// These lines are original placeholder text written for the ChorusGlyph demo.
export const sampleLrc = `[00:00.00]Morning light fills the room
[00:04.50]Small blue sparks begin to glow
[00:09.00]We follow every gentle beat
[00:13.75]And make the quiet moment sing`

export const sampleLyrics = parseLrc(sampleLrc)
