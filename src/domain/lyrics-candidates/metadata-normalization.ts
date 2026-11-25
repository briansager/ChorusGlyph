const dashVariants = /[\u2010-\u2015\u2212]/g
const apostropheVariants = /[\u2018\u2019\u201A\u201B]/g

export type NormalizedMetadata = {
  display: string
  comparison: string
  base: string
  qualifiers: string[]
}

export function normalizeMetadata(value?: string | null): NormalizedMetadata {
  const display = value?.trim().replace(/\s+/g, ' ') ?? ''
  const normalized = display.normalize('NFKC').replace(dashVariants, '-').replace(apostropheVariants, "'")
  const qualifiers: string[] = []
  const base = normalized
    .replace(/\s*[\[(]\s*(live|remix|instrumental|karaoke)\s*[\])]/gi, (_, qualifier: string) => {
      qualifiers.push(qualifier.toLowerCase())
      return ''
    })
    .replace(/\s+(?:feat\.?|featuring)\s+.+$/i, (feature) => {
      qualifiers.push(feature.trim().toLowerCase())
      return ''
    })
    .trim()
    .replace(/\s+/g, ' ')

  return { display, comparison: normalized.toLocaleLowerCase(), base, qualifiers }
}

export function normalizeForComparison(value?: string): string {
  return normalizeMetadata(value).comparison
}
