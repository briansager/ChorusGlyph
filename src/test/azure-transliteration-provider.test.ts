import { describe, expect, it, vi } from 'vitest'
import { AzureTransliterationProvider } from '../domain/romanization/azure-transliteration-provider'

const profile = { language: 'th', fromScript: 'Thai', toScript: 'Latn' as const, displayName: 'Thai' }

describe('AzureTransliterationProvider', () => {
  it('calls only the configured Worker URL and normalizes the result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: 'sawasdi', providerId: 'azure-transliteration' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const provider = new AzureTransliterationProvider({ workerUrl: 'https://proxy.example.workers.dev', profile, fetchFn })

    await expect(provider.romanize({ text: 'สวัสดี', language: 'th' })).resolves.toEqual({
      originalText: 'สวัสดี',
      romanizedText: 'sawasdi',
      providerId: 'azure-transliteration',
      status: 'complete',
      generation: 'external',
    })
    const [url, init] = fetchFn.mock.calls[0]
    expect(String(url)).toBe('https://proxy.example.workers.dev/api/transliterate')
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ language: 'th', fromScript: 'Thai', toScript: 'Latn', text: 'สวัสดี' }),
    })
  })

  it('returns unsupported without a profile or for locally supported scripts', async () => {
    const fetchFn = vi.fn()
    const noProfile = new AzureTransliterationProvider({ workerUrl: 'https://proxy.example.workers.dev', fetchFn })
    const KoreanProfile = new AzureTransliterationProvider({
      workerUrl: 'https://proxy.example.workers.dev',
      profile: { language: 'ko', fromScript: 'Kore', toScript: 'Latn', displayName: 'Korean' },
      fetchFn,
    })

    await expect(noProfile.romanize({ text: 'สวัสดี' })).resolves.toMatchObject({ status: 'unavailable' })
    await expect(KoreanProfile.romanize({ text: '푸른 아침이 와요' })).resolves.toMatchObject({ status: 'unavailable' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it.each([400, 403, 429, 500])('reports proxy HTTP %s errors', async (status) => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'safe error' }), {
      status,
      headers: { 'Content-Type': 'application/json', ...(status === 429 ? { 'Retry-After': '8' } : {}) },
    }))
    const provider = new AzureTransliterationProvider({ workerUrl: 'https://proxy.example.workers.dev', profile, fetchFn })

    await expect(provider.romanize({ text: 'สวัสดี' })).rejects.toThrow(`HTTP ${status}`)
  })

  it('reports network and malformed proxy responses without using an Azure key', async () => {
    const networkProvider = new AzureTransliterationProvider({
      workerUrl: 'https://proxy.example.workers.dev',
      profile,
      fetchFn: vi.fn().mockRejectedValue(new Error('network failure')),
    })
    await expect(networkProvider.romanize({ text: 'สวัสดี' })).rejects.toThrow('could not be reached')

    const malformedProvider = new AzureTransliterationProvider({
      workerUrl: 'https://proxy.example.workers.dev',
      profile,
      fetchFn: vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })),
    })
    await expect(malformedProvider.romanize({ text: 'สวัสดี' })).rejects.toThrow('invalid result')
  })
})
