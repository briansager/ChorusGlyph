import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLanguageMetadataCache, handleRequest, type Env } from '../src/index'
import { InMemoryRateLimiter } from '../src/rate-limit'

const env: Env = {
  AZURE_TRANSLATOR_KEY: 'test-secret-key',
  AZURE_TRANSLATOR_REGION: 'eastus',
  AZURE_TRANSLATOR_ENDPOINT: 'https://api.cognitive.microsofttranslator.com',
  ALLOWED_ORIGINS: 'https://app.example',
}

function makeRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://proxy.example${path}`, {
    ...init,
    headers: {
      Origin: 'https://app.example',
      ...(init.headers ?? {}),
    },
  })
}

function azureSuccess(text = 'sawasdi') {
  return new Response(JSON.stringify([{ text, script: 'Latn' }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('transliteration worker', () => {
  beforeEach(() => clearLanguageMetadataCache())

  it('allows a configured origin and normalizes a successful Azure response', async () => {
    const fetchFn = vi.fn().mockResolvedValue(azureSuccess())
    const request = makeRequest('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' },
      body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: 'สวัสดี' }),
    })

    const response = await handleRequest(request, env, {} as ExecutionContext, { fetchFn })
    expect(response.status).toBe(200)
    const responseBody = await response.text()
    expect(JSON.parse(responseBody)).toEqual({ text: 'sawasdi', providerId: 'azure-transliteration' })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
    expect(responseBody).not.toContain('test-secret-key')
  })

  it('rejects disallowed origins and handles preflight only for allowed origins', async () => {
    const disallowed = new Request('https://proxy.example/api/transliterate', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    })
    expect((await handleRequest(disallowed, env, {} as ExecutionContext)).status).toBe(403)

    const allowed = makeRequest('/api/transliterate', { method: 'OPTIONS' })
    const response = await handleRequest(allowed, env, {} as ExecutionContext)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
  })

  it('validates content type, required fields, text length, and supported pairs', async () => {
    const cases = [
      makeRequest('/api/transliterate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: '' }) }),
      makeRequest('/api/transliterate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: 'x'.repeat(1001) }) }),
      makeRequest('/api/transliterate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'xx', fromScript: 'Xxxx', toScript: 'Latn', text: 'hello' }) }),
    ]

    expect((await handleRequest(new Request('https://proxy.example/api/transliterate', { method: 'POST', headers: { Origin: 'https://app.example' }, body: '{}' }), env, {} as ExecutionContext)).status).toBe(415)
    for (const request of cases) {
      expect((await handleRequest(request, env, {} as ExecutionContext)).status).toBe(400)
    }
  })

  it('creates the expected Azure URL, query parameters, headers, and body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(azureSuccess())
    await handleRequest(makeRequest('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'ko', fromScript: 'Kore', toScript: 'Latn', text: '푸른 아침이 와요' }),
    }), env, {} as ExecutionContext, { fetchFn })

    const [url, init] = fetchFn.mock.calls[0]
    expect(String(url)).toBe('https://api.cognitive.microsofttranslator.com/transliterate?api-version=3.0&language=ko&fromScript=Kore&toScript=Latn')
    expect((init as RequestInit).method).toBe('POST')
    const sentHeaders = new Headers((init as RequestInit).headers)
    expect(sentHeaders.get('Ocp-Apim-Subscription-Key')).toBe('test-secret-key')
    expect(sentHeaders.get('Ocp-Apim-Subscription-Region')).toBe('eastus')
    expect(sentHeaders.get('Content-Type')).toBe('application/json')
    expect((init as RequestInit).body).toBe(JSON.stringify([{ Text: '푸른 아침이 와요' }]))
  })

  it.each([400, 401, 403, 408, 429, 500, 503])('maps Azure %s to a safe error', async (status) => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', {
      status,
      headers: { 'Content-Type': 'application/json', ...(status === 429 ? { 'Retry-After': '9' } : {}) },
    }))
    const response = await handleRequest(makeRequest('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: 'สวัสดี' }),
    }), env, {} as ExecutionContext, { fetchFn })
    expect(response.status).toBe(status)
    expect(await response.text()).not.toContain('test-secret-key')
    if (status === 429) expect(response.headers.get('Retry-After')).toBe('9')
  })

  it('handles network and malformed Azure responses', async () => {
    const network = vi.fn().mockRejectedValue(new Error('network failure'))
    const malformed = vi.fn().mockResolvedValue(new Response('{"unexpected":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const request = () => makeRequest('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: 'สวัสดี' }),
    })
    expect((await handleRequest(request(), env, {} as ExecutionContext, { fetchFn: network })).status).toBe(502)
    expect((await handleRequest(request(), env, {} as ExecutionContext, { fetchFn: malformed })).status).toBe(502)
  })

  it('enforces the best-effort per-IP rate limit and Retry-After', async () => {
    const limiter = new InMemoryRateLimiter(1, 60_000)
    const fetchFn = vi.fn().mockResolvedValue(azureSuccess())
    const request = () => makeRequest('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.50' },
      body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: 'สวัสดี' }),
    })

    expect((await handleRequest(request(), env, {} as ExecutionContext, { fetchFn, rateLimiter: limiter, now: () => 1000 })).status).toBe(200)
    const limited = await handleRequest(request(), env, {} as ExecutionContext, { fetchFn, rateLimiter: limiter, now: () => 2000 })
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('59')
  })

  it('retrieves transliteration metadata with scope and exposes Korean support data', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      transliteration: { ko: { scripts: [{ code: 'Kore', toScripts: [{ code: 'Latn' }] }] } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const response = await handleRequest(makeRequest('/api/transliteration-languages', { method: 'GET' }), env, {} as ExecutionContext, { fetchFn })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ transliteration: { ko: { scripts: [{ code: 'Kore' }] } } })
    expect(String(fetchFn.mock.calls[0][0])).toBe('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=transliteration')
  })
})
