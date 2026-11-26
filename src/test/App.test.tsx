import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

describe('ChorusGlyph starter page', () => {
  it('introduces the compact lyric workspace', () => {
    render(<App />)

    expect(screen.getByText('ChorusGlyph')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lyric workspace', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/timed lines with optional local readings/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Reading language' })).toHaveValue('japanese-kuroshiro')
    expect(screen.getByRole('option', { name: 'Japanese — Kuroshiro + Kuromoji' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Korean — Korean Romanization' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Chinese — Pinyin Pro' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Thai — Azure Transliteration' })).toBeInTheDocument()
  })

  it('uses development demo metadata through the normal candidate flow', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Use demo now-playing data' }))

    expect(screen.getByText('Demo morning track')).toBeInTheDocument()
    expect(screen.getByText(/Self-written Demo Album/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Song suggestions' })).toBeInTheDocument()
  })
  it('preserves loaded lyrics and source across demo suggestion, preparation, mode selection, and cancellation', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Timed LRC text'), { target: { value: '[00:00.00]手書きの歌詞' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }))
    await screen.findByText('手書きの歌詞')
    const active = screen.getByRole('region', { name: 'Synchronized lyrics' })
    const unchanged = active.textContent
    fireEvent.click(screen.getByRole('button', { name: 'Use demo now-playing data' }))
    expect(within(active).queryByText('Demo morning track')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare lyric search' }))
    expect(screen.getByRole('button', { name: 'Search LRCLIB' })).toHaveFocus()
    expect(screen.getByLabelText('LRCLIB track title')).toHaveValue('Demo morning track')
    fireEvent.click(screen.getByRole('radio', { name: 'Windows companion · Optional' }))
    expect(active.textContent).toBe(unchanged)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel candidate search' }))
    expect(active.textContent).toBe(unchanged)
    expect(screen.getByRole('button', { name: 'Search LRCLIB' })).toHaveFocus()
  })

  it('returns focus to the suggestions heading when dismissal removes the trigger', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo now-playing data' }))
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    dismiss.focus()
    fireEvent.click(dismiss)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Song suggestions' })).toHaveFocus()
  })

  it('keeps actual active lyrics separate from detected-song results through preview and confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 21, trackName: 'Chosen original result', artistName: 'Chosen artist', duration: 120,
      instrumental: false, syncedLyrics: '[00:00.00]A newly confirmed original line',
    }]), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      render(<App />)
      fireEvent.change(screen.getByLabelText('Timed LRC text'), { target: { value: '[00:00.00]My already loaded line' } })
      fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }))
      await screen.findByText('My already loaded line')
      const active = screen.getByRole('region', { name: 'Synchronized lyrics' })
      fireEvent.click(screen.getByRole('button', { name: 'Use demo now-playing data' }))
      fireEvent.click(screen.getByRole('button', { name: 'Prepare lyric search' }))
      expect(fetchMock).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
      await screen.findByRole('article', { name: 'Lyric result: Chosen original result' })
      expect(within(active).getByText('My already loaded line')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Select lyrics' }))
      expect(within(active).getByText('My already loaded line')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Confirm replacement' }))
      expect(within(active).getByText('A newly confirmed original line')).toBeInTheDocument()
      expect(within(active).getByText('Source: LRCLIB')).toBeInTheDocument()
      expect(within(active).queryByText('My already loaded line')).not.toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally { vi.unstubAllGlobals() }
  })

})
