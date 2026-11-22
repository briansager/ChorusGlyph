import type { LyricLine } from './lyric-types'

type ParsedLine = Omit<LyricLine, 'endTime'> & { sourceOrder: number }

const timestampLinePattern = /^(?<timestamps>(?:\[\d+:\d{2}(?:\.\d{1,3})?\])+)(?<text>.*)$/
const timestampPattern = /\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g

function timestampToSeconds(minutes: string, seconds: string, fraction = ''): number | undefined {
  const minuteValue = Number(minutes)
  const secondValue = Number(seconds)

  if (!Number.isSafeInteger(minuteValue) || secondValue > 59) {
    return undefined
  }

  const fractionValue = fraction ? Number(`0.${fraction}`) : 0
  const result = minuteValue * 60 + secondValue + fractionValue

  return Number.isFinite(result) && result >= 0 ? result : undefined
}

export function parseLrc(input: string): LyricLine[] {
  const parsedLines: ParsedLine[] = []

  input.split(/\r?\n/).forEach((rawLine, sourceOrder) => {
    const line = rawLine.trim()
    if (!line) return

    const match = timestampLinePattern.exec(line)
    if (!match?.groups) return

    const text = match.groups.text.trim()
    if (!text) return

    const timestamps = [...match.groups.timestamps.matchAll(timestampPattern)]
    const times = timestamps.map((timestamp) =>
      timestampToSeconds(timestamp[1], timestamp[2], timestamp[3]),
    )

    if (!times.length || times.some((time) => time === undefined)) return

    times.forEach((startTime, timestampIndex) => {
      if (startTime === undefined) return

      parsedLines.push({
        id: `lyric-${sourceOrder}-${timestampIndex}`,
        text,
        startTime,
        sourceOrder,
      })
    })
  })

  parsedLines.sort((left, right) => left.startTime - right.startTime || left.sourceOrder - right.sourceOrder)

  return parsedLines.map(({ sourceOrder: _sourceOrder, ...line }, index, lines) => ({
    ...line,
    ...(index < lines.length - 1 ? { endTime: lines[index + 1].startTime } : {}),
  }))
}
