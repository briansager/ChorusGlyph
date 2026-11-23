import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RomanizationCache, RomanizationCacheEntry } from '../domain/romanization/romanization-cache'
import { AzureTransliterationProvider } from '../domain/romanization/azure-transliteration-provider'
import type { RomanizerProvider } from '../domain/romanization/romanizer-provider'
import { ProviderComparison } from '../features/provider-comparison/ProviderComparison'

class MemoryCache implements RomanizationCache {
  private readonly entries = new Map<string, RomanizationCacheEntry>()

  async get(key: string) {
    return this.entries.get(key)
  }

  async set(key: string, entry: RomanizationCacheEntry) {
    this.entries.set(key, entry)
  }

  async delete(key: string) {
    this.entries.delete(key)
  }

  async clear() {
    this.entries.clear()
  }
}

function provider(id: string, displayName: string, supportedText: string, reading: string): RomanizerProvider {
  return {
    id,
    displayName,
    version: 'test-1.0.0',
    supports: ({ text }) => text === supportedText,
    romanize: async ({ text }) => ({
      originalText: text,
      romanizedText: reading,
      providerId: id,
      status: 'complete',
      generation: 'deterministic',
    }),
  }
}

describe('ProviderComparison', () => {
  it('renders original input and provider metadata with supported states', () => {
    const providers = [
      provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '青い朝が来る', 'aoiasagakuru'),
      provider('korean-local', 'Korean Romanization', '푸른 아침이 와요', 'pureun achimi wayo'),
    ]

    render(<ProviderComparison providers={providers} cache={new MemoryCache()} />)

    expect(screen.getByDisplayValue('青い朝が来る')).toBeInTheDocument()
    expect(screen.getByText('Kuroshiro + Kuromoji')).toBeInTheDocument()
    expect(screen.getByText('japanese-kuroshiro · vtest-1.0.0')).toBeInTheDocument()
    expect(screen.getAllByText('Supported')).toHaveLength(1)
    expect(screen.getByText('Korean Romanization')).toBeInTheDocument()
  })

  it('shows supported results and leaves the original input unchanged', async () => {
    const providers = [provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '青い朝が来る', 'aoiasagakuru')]

    render(<ProviderComparison providers={providers} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))

    await waitFor(() => expect(screen.getByText('aoiasagakuru')).toBeInTheDocument())
    expect(screen.getByDisplayValue('青い朝が来る')).toBeInTheDocument()
  })

  it('selects only the Chinese provider for the Chinese preset', () => {
    const providers = [
      provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '青い朝が来る', 'aoiasagakuru'),
      provider('chinese-pinyin-pro', 'Pinyin Pro', '蓝色的早晨来了', 'lán sè de zǎo chén lái le'),
    ]

    render(<ProviderComparison providers={providers} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chinese' }))

    expect(screen.getByText('Pinyin Pro').parentElement?.parentElement).toHaveTextContent('Supported')
    expect(screen.getByText('Kuroshiro + Kuromoji').parentElement?.parentElement).toHaveTextContent('Not supported')
  })

  it('requires a manual choice for Kanji-only text', () => {
    const providers = [
      provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '東京', 'tōkyō'),
      provider('chinese-pinyin-pro', 'Pinyin Pro', '東京', 'dōng jīng'),
    ]

    render(<ProviderComparison providers={providers} cache={new MemoryCache()} />)
    fireEvent.change(screen.getByLabelText('Original test text'), { target: { value: '東京' } })

    expect(screen.getByLabelText('Han-only language hint')).toHaveValue('auto')
    expect(screen.getAllByText('Not supported')).toHaveLength(2)
  })

  it('shows a clear unsupported state and never calls that provider', async () => {
    const romanize = vi.fn()
    const unsupported: RomanizerProvider = {
      id: 'unsupported',
      displayName: 'Unsupported provider',
      supports: () => false,
      romanize,
    }

    render(<ProviderComparison providers={[unsupported]} cache={new MemoryCache()} />)
    expect(screen.getByText('Not supported')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(screen.getByText('Not supported')).toBeInTheDocument())
    expect(romanize).not.toHaveBeenCalled()
  })

  it('uses the Worker URL for Azure and displays safe errors', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: 'Sawatdi' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const azure = new AzureTransliterationProvider({
      workerUrl: 'https://proxy.example.workers.dev',
      profile: { language: 'th', fromScript: 'Thai', toScript: 'Latn', displayName: 'Thai' },
      fetchFn,
    })

    render(<ProviderComparison providers={[azure]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thai' }))
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))

    await waitFor(() => expect(screen.getByText('Sawatdi')).toBeInTheDocument())
    expect(fetchFn).toHaveBeenCalledOnce()
    expect(String(fetchFn.mock.calls[0][0])).toBe('https://proxy.example.workers.dev/api/transliterate')
    expect(screen.getByText('Network-generated through the configured Worker')).toBeInTheDocument()
    expect(screen.queryByText(/azure.*key/i)).not.toBeInTheDocument()
  })

  it('renders provider errors without exposing raw details', async () => {
    const failing: RomanizerProvider = {
      id: 'failing-provider',
      displayName: 'Failing provider',
      supports: () => true,
      romanize: async () => { throw new Error('Provider failed safely.') },
    }

    render(<ProviderComparison providers={[failing]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Provider failed safely.'))
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('shows a cached local result on a repeated comparison', async () => {
    const cache = new MemoryCache()
    const local = provider('local-test', 'Local test provider', '青い朝が来る', 'cached reading')

    render(<ProviderComparison providers={[local]} cache={cache} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(screen.getByText('cached reading')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))

    await waitFor(() => expect(screen.getByText('Cached locally')).toBeInTheDocument())
  })
})
