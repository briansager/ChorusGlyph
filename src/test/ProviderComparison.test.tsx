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
    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Japanese detected')
    expect(screen.getByText('Kuroshiro + Kuromoji')).toBeInTheDocument()
    expect(screen.getByText('japanese-kuroshiro · vtest-1.0.0')).toBeInTheDocument()
    expect(screen.getAllByText('Ready to compare')).toHaveLength(1)
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

    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Chinese selected · Han-only text')
    expect(screen.getByText('Pinyin Pro').parentElement?.parentElement).toHaveTextContent('Ready to compare')
    expect(screen.getByText('Kuroshiro + Kuromoji').closest('article')).toHaveTextContent('Not supported')
  })

  it('requires an accessible manual choice for Kanji-only text', () => {
    const providers = [
      provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '東京', 'tōkyō'),
      provider('chinese-pinyin-pro', 'Pinyin Pro', '東京', 'dōng jīng'),
    ]

    render(<ProviderComparison providers={providers} cache={new MemoryCache()} />)
    fireEvent.change(screen.getByLabelText('Original test text'), { target: { value: '東京' } })

    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Japanese or Chinese — please choose')
    expect(screen.getByRole('radio', { name: 'Choose Japanese' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Choose Chinese' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Compare providers' })).toBeDisabled()
    expect(screen.getAllByText(/· Not supported/)).toHaveLength(2)

    fireEvent.click(screen.getByRole('radio', { name: 'Choose Japanese' }))
    expect(screen.getByRole('radio', { name: 'Choose Japanese' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Compare providers' })).toBeEnabled()
  })

  it('clears stale results when switching between Japanese and Chinese', async () => {
    const providers = [
      provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '青い朝が来る', 'japanese result'),
      provider('chinese-pinyin-pro', 'Pinyin Pro', '蓝色的早晨来了', 'chinese result'),
    ]

    render(<ProviderComparison providers={providers} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(screen.getByText('japanese result')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Chinese' }))
    expect(screen.queryByText('japanese result')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Chinese selected · Han-only text')
    fireEvent.click(screen.getByRole('button', { name: 'Japanese' }))
    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Japanese detected')
    expect(screen.queryByText('chinese result')).not.toBeInTheDocument()
  })

  it('reports empty input and blocks comparison', () => {
    render(<ProviderComparison providers={[]} cache={new MemoryCache()} />)
    fireEvent.change(screen.getByLabelText('Original test text'), { target: { value: '' } })

    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Language not detected')
    expect(screen.getByRole('button', { name: 'Compare providers' })).toBeDisabled()
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
    expect(screen.getByText(/· Not supported/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(screen.getByText(/· Not supported/)).toBeInTheDocument())
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

  it('shows Loading while a supported provider is resolving', async () => {
    let resolveRomanization: ((value: { originalText: string; romanizedText: string; providerId: string; status: 'complete'; generation: 'deterministic' }) => void) | undefined
    const pending: RomanizerProvider = {
      id: 'japanese-kuroshiro',
      displayName: 'Kuroshiro + Kuromoji',
      supports: () => true,
      romanize: ({ text }) => new Promise<void>((resolve) => {
        resolveRomanization = () => resolve()
      }).then(() => ({
        originalText: text,
        romanizedText: 'pending result',
        providerId: 'japanese-kuroshiro',
        status: 'complete' as const,
        generation: 'deterministic' as const,
      })),
    }

    render(<ProviderComparison providers={[pending]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    expect(screen.getByText('Generating reading…')).toBeInTheDocument()

    await waitFor(() => expect(resolveRomanization).toBeDefined())
    resolveRomanization?.({
      originalText: '青い朝が来る',
      romanizedText: 'pending result',
      providerId: 'japanese-kuroshiro',
      status: 'complete',
      generation: 'deterministic',
    })
    await waitFor(() => expect(screen.getByText('pending result')).toBeInTheDocument())
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

  it('clears comparison results while preserving the original input and detected language', async () => {
    const local = provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '青い朝が来る', 'temporary reading')

    render(<ProviderComparison providers={[local]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(screen.getByText('temporary reading')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Clear comparison' }))

    expect(screen.getByDisplayValue('青い朝が来る')).toBeInTheDocument()
    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Japanese detected')
    expect(screen.queryByText('temporary reading')).not.toBeInTheDocument()
    expect(screen.getByText('Ready to compare')).toBeInTheDocument()
  })

  it('does not let a reset during loading repopulate the comparison', async () => {
    let resolveRomanization: (() => void) | undefined
    const pending: RomanizerProvider = {
      id: 'japanese-kuroshiro',
      displayName: 'Kuroshiro + Kuromoji',
      supports: () => true,
      romanize: ({ text }) => new Promise<void>((resolve) => {
        resolveRomanization = () => resolve()
      }).then(() => ({
        originalText: text,
        romanizedText: 'stale reading',
        providerId: 'japanese-kuroshiro',
        status: 'complete' as const,
        generation: 'deterministic' as const,
      })),
    }

    render(<ProviderComparison providers={[pending]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(resolveRomanization).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Clear comparison' }))
    resolveRomanization?.()

    await waitFor(() => expect(screen.getByText('Ready to compare')).toBeInTheDocument())
    expect(screen.queryByText('stale reading')).not.toBeInTheDocument()
  })

  it('retries only a failed provider and preserves successful results', async () => {
    const successful = provider('japanese-kuroshiro', 'Kuroshiro + Kuromoji', '青い朝が来る', 'successful reading')
    let attempts = 0
    const failing: RomanizerProvider = {
      id: 'failing-provider',
      displayName: 'Failing provider',
      supports: () => true,
      romanize: vi.fn(async ({ text }) => {
        attempts += 1
        if (attempts === 1) throw new Error('temporary failure')
        return {
          originalText: text,
          romanizedText: 'recovered reading',
          providerId: 'failing-provider',
          status: 'complete' as const,
          generation: 'deterministic' as const,
        }
      }),
    }

    render(<ProviderComparison providers={[successful, failing]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(screen.getByText('successful reading')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('temporary failure'))

    fireEvent.click(screen.getByRole('button', { name: 'Retry Failing provider' }))
    expect(screen.getByText('successful reading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('recovered reading')).toBeInTheDocument())
    expect(successful.romanize).toBeDefined()
    expect(failing.romanize).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate comparison requests while loading', async () => {
    let resolveRomanization: (() => void) | undefined
    const romanize = vi.fn(({ text }: { text: string }) => new Promise<void>((resolve) => {
      resolveRomanization = () => resolve()
    }).then(() => ({
      originalText: text,
      romanizedText: 'one request',
      providerId: 'japanese-kuroshiro',
      status: 'complete' as const,
      generation: 'deterministic' as const,
    })))
    const pending: RomanizerProvider = {
      id: 'japanese-kuroshiro',
      displayName: 'Kuroshiro + Kuromoji',
      supports: () => true,
      romanize,
    }

    render(<ProviderComparison providers={[pending]} cache={new MemoryCache()} />)
    const compareButton = screen.getByRole('button', { name: 'Compare providers' })
    fireEvent.click(compareButton)
    fireEvent.click(compareButton)

    await waitFor(() => expect(romanize).toHaveBeenCalledTimes(1))
    resolveRomanization?.()
    await waitFor(() => expect(screen.getByText('one request')).toBeInTheDocument())
  })

  it('ignores an old result after a new comparison starts', async () => {
    let resolveRomanization: (() => void) | undefined
    const oldProvider: RomanizerProvider = {
      id: 'japanese-kuroshiro',
      displayName: 'Kuroshiro + Kuromoji',
      supports: ({ text }) => text === '青い朝が来る',
      romanize: ({ text }) => new Promise<void>((resolve) => {
        resolveRomanization = () => resolve()
      }).then(() => ({
        originalText: text,
        romanizedText: 'old reading',
        providerId: 'japanese-kuroshiro',
        status: 'complete' as const,
        generation: 'deterministic' as const,
      })),
    }
    const chinese = provider('chinese-pinyin-pro', 'Pinyin Pro', '蓝色的早晨来了', 'new reading')

    render(<ProviderComparison providers={[oldProvider, chinese]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await waitFor(() => expect(resolveRomanization).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Chinese' }))
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    resolveRomanization?.()

    await waitFor(() => expect(screen.getByText('new reading')).toBeInTheDocument())
    expect(screen.queryByText('old reading')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Detected language')).toHaveTextContent('Chinese selected · Han-only text')
  })

  it('does not call an unsupported Azure provider for non-Thai input', async () => {
    const fetchFn = vi.fn()
    const azure = new AzureTransliterationProvider({
      workerUrl: 'https://proxy.example.workers.dev',
      profile: { language: 'th', fromScript: 'Thai', toScript: 'Latn', displayName: 'Thai' },
      fetchFn,
    })

    render(<ProviderComparison providers={[azure]} cache={new MemoryCache()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))

    await waitFor(() => expect(screen.getByText(/· Not supported/)).toBeInTheDocument())
    expect(fetchFn).not.toHaveBeenCalled()
  })
  it('explains an empty successful output and keeps unavailable providers in compact rows', async () => {
    const available = provider('japanese-kuroshiro', 'Japanese fixture', '青い朝が来る', '')
    const unavailable = provider('korean-local', 'Korean fixture', '푸른 아침이 와요', 'unrequested')
    render(<ProviderComparison providers={[unavailable, available]} cache={new MemoryCache()} />)
    expect(screen.getByRole('heading', { name: 'Unavailable for this text' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Korean fixture' }).closest('article')).toHaveClass('provider-unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Compare providers' }))
    await screen.findByText('No reading returned')
    expect(screen.getByText('Completed without a reading')).toBeInTheDocument()
  })

})
