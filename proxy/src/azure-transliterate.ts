import type { TransliterationRequest } from './validation'

export type AzureEnv = {
  AZURE_TRANSLATOR_KEY?: string
  AZURE_TRANSLATOR_REGION?: string
  AZURE_TRANSLATOR_ENDPOINT?: string
}

export class AzureProxyError extends Error {
  constructor(readonly status: number, message: string, readonly retryAfter?: string) {
    super(message)
  }
}

export async function callAzureTransliterate(
  request: TransliterationRequest,
  env: AzureEnv,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  if (!env.AZURE_TRANSLATOR_KEY) throw new AzureProxyError(500, 'Azure Translator is not configured.')

  const endpoint = env.AZURE_TRANSLATOR_ENDPOINT ?? 'https://api.cognitive.microsofttranslator.com'
  const url = new URL('/transliterate', endpoint)
  url.searchParams.set('api-version', '3.0')
  url.searchParams.set('language', request.language)
  url.searchParams.set('fromScript', request.fromScript)
  url.searchParams.set('toScript', request.toScript)

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': env.AZURE_TRANSLATOR_KEY,
  })
  if (env.AZURE_TRANSLATOR_REGION) headers.set('Ocp-Apim-Subscription-Region', env.AZURE_TRANSLATOR_REGION)

  let response: Response
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ Text: request.text }]),
    })
  } catch {
    throw new AzureProxyError(502, 'Azure Translator could not be reached.')
  }

  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After') ?? undefined
    const statusMessage: Record<number, string> = {
      400: 'Azure rejected the transliteration request.',
      401: 'Azure Translator authentication failed.',
      403: 'Azure Translator denied the request.',
      408: 'Azure Translator timed out.',
      429: 'Azure Translator rate limit reached.',
      500: 'Azure Translator encountered an error.',
      503: 'Azure Translator is temporarily unavailable.',
    }
    throw new AzureProxyError(response.status, statusMessage[response.status] ?? 'Azure Translator request failed.', retryAfter)
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) throw new AzureProxyError(502, 'Azure returned an invalid response.')

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new AzureProxyError(502, 'Azure returned invalid JSON.')
  }

  if (!Array.isArray(payload) || typeof payload[0] !== 'object' || payload[0] === null || typeof (payload[0] as { text?: unknown }).text !== 'string') {
    throw new AzureProxyError(502, 'Azure returned an unexpected transliteration response.')
  }

  return (payload[0] as { text: string }).text
}
