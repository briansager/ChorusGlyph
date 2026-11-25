import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WindowsCompanionPanel } from '../features/now-playing/WindowsCompanionPanel'
import { WindowsCompanionSource } from '../domain/now-playing/windows-companion-source'
import { healthyResponse, playingMedia } from './companion-fixtures'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('WindowsCompanionPanel', () => {
  it('defaults to manual mode and makes no localhost request', () => {
    const fetchFn = vi.fn<typeof fetch>()
    const source = new WindowsCompanionSource({ fetchFn })
    render(<WindowsCompanionPanel source={source} />)
    expect(screen.getByRole('radio', { name: 'Manual input' })).toBeChecked()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('requires an explicit connect action and allows explicit song-context use', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse(healthyResponse)).mockResolvedValueOnce(jsonResponse(playingMedia))
    const source = new WindowsCompanionSource({ fetchFn, intervalMs: 100000 })
    const onUseSongContext = vi.fn()
    render(<WindowsCompanionPanel source={source} onUseSongContext={onUseSongContext} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Windows companion' }))
    fireEvent.change(screen.getByLabelText('Companion token'), { target: { value: 'run-token' } })
    expect(fetchFn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Connect companion' }))
    await screen.findByText(/Connected — playing/)
    expect(screen.getByText(/Example title/)).toBeInTheDocument()
    expect(onUseSongContext).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use detected song context' }))
    expect(onUseSongContext).toHaveBeenCalledWith(playingMedia)
  })
})
