import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WindowsCompanionPanel } from '../features/now-playing/WindowsCompanionPanel'
import { WindowsCompanionSource } from '../domain/now-playing/windows-companion-source'
import { healthyResponse, playingMedia } from './companion-fixtures'
import { demoNowPlayingMedia } from '../domain/now-playing/mock-now-playing-fixtures'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('WindowsCompanionPanel', () => {
  it('defaults to manual mode and makes no localhost request', () => {
    const fetchFn = vi.fn<typeof fetch>()
    const source = new WindowsCompanionSource({ fetchFn })
    render(<WindowsCompanionPanel source={source} />)
    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('requires an explicit connect action and exposes metadata without replacing context', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse(healthyResponse)).mockResolvedValueOnce(jsonResponse(playingMedia))
    const source = new WindowsCompanionSource({ fetchFn, intervalMs: 100000 })
    render(<WindowsCompanionPanel source={source} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Windows companion · Optional' }))
    fireEvent.change(screen.getByLabelText('Companion token'), { target: { value: 'run-token' } })
    expect(fetchFn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Connect companion' }))
    await screen.findByText('Connection: Connected.')
    expect(screen.getByText(/Example title/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use detected song context' })).not.toBeInTheDocument()
  })

  it('exposes the development-only demo path through the normal status callback', () => {
    const source = new WindowsCompanionSource({ fetchFn: vi.fn<typeof fetch>() })
    const onStatusChange = vi.fn()
    render(
      <WindowsCompanionPanel
        source={source}
        onStatusChange={onStatusChange}
        onUseDemoNowPlayingData={() => ({ status: 'connected-playing', message: 'Demo', media: demoNowPlayingMedia })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use demo now-playing data' }))
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ media: demoNowPlayingMedia }))
  })
  it('keeps demo metadata separate from native selection and live connection state', () => {
    const source = new WindowsCompanionSource({ fetchFn: vi.fn<typeof fetch>() })
    render(<WindowsCompanionPanel source={source} onUseDemoNowPlayingData={() => ({ status: 'connected-playing', message: 'Demo', media: demoNowPlayingMedia })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo now-playing data' }))
    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked()
    expect(screen.getByText('Connection: Not connected.')).toBeInTheDocument()
    expect(screen.queryByText(/Connection: Connected/)).not.toBeInTheDocument()
  })

  it('hides demo activation in production even if a callback is supplied', () => {
    vi.stubEnv('DEV', false)
    try {
      render(<WindowsCompanionPanel source={new WindowsCompanionSource({ fetchFn: vi.fn<typeof fetch>() })} onUseDemoNowPlayingData={vi.fn()} />)
      expect(screen.queryByRole('button', { name: 'Use demo now-playing data' })).not.toBeInTheDocument()
    } finally { vi.unstubAllEnvs() }
  })

})
