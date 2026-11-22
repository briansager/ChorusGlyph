import { AzureProxyError, callAzureTransliterate, type AzureEnv } from './azure-transliterate'
import { isAllowedOrigin, jsonResponse, corsHeaders, type CorsEnv } from './cors'
import { InMemoryRateLimiter } from './rate-limit'
import { validateTransliterationRequest } from './validation'

export type Env = AzureEnv & CorsEnv

const rateLimiter = new InMemoryRateLimiter()
let languageCache: { expiresAt: number; value: unknown } | undefined
const LANGUAGE_CACHE_MS = 5 * 60_000

type HandlerDependencies = { fetchFn?: typeof fetch; rateLimiter?: InMemoryRateLimiter; now?: () => number }

export function clearLanguageMetadataCache(): void {
  languageCache = undefined
}

export async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext, dependencies: HandlerDependencies = {}): Promise<Response> {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') {
    return isAllowedOrigin(origin, env) ? new Response(null, { status: 204, headers: corsHeaders(origin) }) : jsonResponse({ error: 'Origin is not allowed.' }, 403)
  }
  if (!isAllowedOrigin(origin, env)) return jsonResponse({ error: 'Origin is not allowed.' }, 403)

  if (url.pathname === '/api/transliterate') {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin)
    if (!(request.headers.get('Content-Type') ?? '').toLowerCase().includes('application/json')) {
      return jsonResponse({ error: 'Content-Type must be application/json.' }, 415, origin)
    }

    const limiter = dependencies.rateLimiter ?? rateLimiter
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown-client'
    const limited = limiter.check(ip, dependencies.now?.())
    if (!limited.allowed) {
      const response = jsonResponse({ error: 'Rate limit exceeded.' }, 429, origin)
      response.headers.set('Retry-After', String(limited.retryAfter))
      return response
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, origin)
    }
    const validation = validateTransliterationRequest(body)
    if (!validation.ok) return jsonResponse({ error: validation.message }, 400, origin)

    try {
      const text = await callAzureTransliterate(validation.value, env, dependencies.fetchFn ?? globalThis.fetch.bind(globalThis))
      return jsonResponse({ text, providerId: 'azure-transliteration' }, 200, origin)
    } catch (error) {
      if (error instanceof AzureProxyError) {
        const response = jsonResponse({ error: error.message }, error.status, origin)
        if (error.retryAfter) response.headers.set('Retry-After', error.retryAfter)
        return response
      }
      return jsonResponse({ error: 'Transliteration failed.' }, 502, origin)
    }
  }

  if (url.pathname === '/api/transliteration-languages') {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed.' }, 405, origin)
    try {
      const now = dependencies.now?.() ?? Date.now()
      if (languageCache && languageCache.expiresAt > now) return jsonResponse(languageCache.value, 200, origin)

      const languageUrl = new URL('/languages', env.AZURE_TRANSLATOR_ENDPOINT ?? 'https://api.cognitive.microsofttranslator.com')
      languageUrl.searchParams.set('api-version', '3.0')
      languageUrl.searchParams.set('scope', 'transliteration')
      const response = await (dependencies.fetchFn ?? globalThis.fetch.bind(globalThis))(languageUrl)
      if (!response.ok) return jsonResponse({ error: 'Azure language metadata is unavailable.' }, 502, origin)
      const contentType = response.headers.get('Content-Type') ?? ''
      if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ error: 'Azure returned invalid language metadata.' }, 502, origin)
      const payload = await response.json() as { transliteration?: unknown }
      const value = { transliteration: payload.transliteration ?? {} }
      languageCache = { expiresAt: now + LANGUAGE_CACHE_MS, value }
      return jsonResponse(value, 200, origin)
    } catch {
      return jsonResponse({ error: 'Azure language metadata could not be loaded.' }, 502, origin)
    }
  }

  return jsonResponse({ error: 'Not found.' }, 404, origin)
}

export default { fetch: handleRequest }
