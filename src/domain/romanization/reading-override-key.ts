export function createReadingOverrideKey(input: {
  sourceId: string
  lineId: string
  providerId: string
  originalText: string
}): string {
  return [input.sourceId, input.lineId, input.providerId, input.originalText].join('::')
}
