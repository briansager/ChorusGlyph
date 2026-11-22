export type TransliterationRequest = {
  language: string
  fromScript: string
  toScript: 'Latn'
  text: string
}
export const ALLOWED_TRANSLITERATION_PAIRS = [
  { language: 'ar', fromScript: 'Arab', toScript: 'Latn' },
  { language: 'bn', fromScript: 'Beng', toScript: 'Latn' },
  { language: 'zh-Hans', fromScript: 'Hans', toScript: 'Latn' },
  { language: 'zh-Hant', fromScript: 'Hant', toScript: 'Latn' },
  { language: 'ja', fromScript: 'Jpan', toScript: 'Latn' },
  { language: 'ko', fromScript: 'Kore', toScript: 'Latn' },
  { language: 'th', fromScript: 'Thai', toScript: 'Latn' },
  { language: 'hi', fromScript: 'Deva', toScript: 'Latn' },
] as const

const MAX_TEXT_LENGTH = 1000

export function validateTransliterationRequest(value: unknown): { ok: true; value: TransliterationRequest } | { ok: false; message: string } {
  if (!value || typeof value !== 'object') return { ok: false, message: 'Request body must be a JSON object.' }

  const body = value as Record<string, unknown>
  if (typeof body.language !== 'string' || typeof body.fromScript !== 'string' || body.toScript !== 'Latn' || typeof body.text !== 'string') {
    return { ok: false, message: 'language, fromScript, toScript, and text are required.' }
  }
  if (!body.text.trim()) return { ok: false, message: 'text must not be empty.' }
  if (body.text.length > MAX_TEXT_LENGTH) return { ok: false, message: `text must be at most ${MAX_TEXT_LENGTH} characters.` }

  const supported = ALLOWED_TRANSLITERATION_PAIRS.some(
    (pair) => pair.language === body.language && pair.fromScript === body.fromScript && pair.toScript === body.toScript,
  )
  if (!supported) return { ok: false, message: 'The requested transliteration pair is not supported.' }

  return {
    ok: true,
    value: {
      language: body.language,
      fromScript: body.fromScript,
      toScript: 'Latn',
      text: body.text,
    },
  }
}
