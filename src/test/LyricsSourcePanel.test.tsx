import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LyricsDocument } from '../domain/lyrics/lyrics-types'
import { LyricsSourcePanel } from '../features/lyrics-source/LyricsSourcePanel'

const documentFixture: LyricsDocument = {
  lines: [{ id: 'line-1', text: 'Blue morning starts', startTime: 0 }],
  title: 'Example title',
  artist: 'Example artist',
  sourceId: 'lrclib',
}

describe('LyricsSourcePanel candidate search workflow', () => {
  it('prefills fields without requesting until Search is explicitly submitted', async () => {
    const load = vi.fn().mockResolvedValue(documentFixture)
    render(<LyricsSourcePanel onLoaded={vi.fn()} searchPrefill={{ title: 'Suggested title', artist: 'Suggested artist' }} candidateSearchActive lrclibSource={{ load }} />)

    expect(screen.getByRole('textbox', { name: 'LRCLIB track title' })).toHaveValue('Suggested title')
    expect(screen.getByRole('textbox', { name: 'LRCLIB artist' })).toHaveValue('Suggested artist')
    expect(load).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Search LRCLIB' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    await waitFor(() => expect(load).toHaveBeenCalledWith({ title: 'Suggested title', artist: 'Suggested artist', duration: 0 }))
  })

  it('uses edited fields and keeps missing artist editable for title-based workflow', async () => {
    const load = vi.fn().mockResolvedValue(documentFixture)
    render(<LyricsSourcePanel onLoaded={vi.fn()} searchPrefill={{ title: 'Suggested title' }} candidateSearchActive lrclibSource={{ load }} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'LRCLIB track title' }), { target: { value: 'Edited title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    await waitFor(() => expect(load).toHaveBeenCalledWith({ title: 'Edited title', artist: '', duration: 0 }))
  })

  it('shows request errors and preserves the active document by not calling onLoaded', async () => {
    const load = vi.fn().mockRejectedValue(new Error('No synchronized result found.'))
    const onLoaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={onLoaded} searchPrefill={{ title: 'Missing result', artist: 'Example artist' }} candidateSearchActive lrclibSource={{ load }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No synchronized result found.')
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('ignores a stale result after the candidate search is cancelled', async () => {
    let resolveSearch!: (value: LyricsDocument) => void
    const load = vi.fn().mockReturnValue(new Promise<LyricsDocument>((resolve) => { resolveSearch = resolve }))
    const onLoaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={onLoaded} searchPrefill={{ title: 'Stale title', artist: 'Example artist' }} candidateSearchActive lrclibSource={{ load }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    screen.getByRole('button', { name: 'Cancel candidate search' }).focus()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel candidate search' }))
    expect(screen.getByRole('button', { name: 'Search LRCLIB' })).toHaveFocus()
    resolveSearch(documentFixture)
    await waitFor(() => expect(onLoaded).not.toHaveBeenCalled())
  })
  it('invalidates an in-flight lookup on explicit new preparation and focuses the enabled search action', async () => {
    let resolveSearch!: (value: LyricsDocument) => void
    const load = vi.fn().mockReturnValue(new Promise<LyricsDocument>((resolve) => { resolveSearch = resolve }))
    const onLoaded = vi.fn()
    const { rerender } = render(<LyricsSourcePanel onLoaded={onLoaded} searchPrefill={{ title: 'Old' }} candidateSearchActive lrclibSource={{ load }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    rerender(<LyricsSourcePanel onLoaded={onLoaded} searchPrefill={{ title: 'New' }} candidateSearchActive lrclibSource={{ load }} />)
    expect(screen.getByRole('textbox', { name: 'LRCLIB track title' })).toHaveValue('New')
    expect(screen.getByRole('button', { name: 'Search LRCLIB' })).toHaveFocus()
    resolveSearch(documentFixture)
    await waitFor(() => expect(onLoaded).not.toHaveBeenCalled())
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loads local lyrics through the existing path and ignores an older remote result', async () => {
    let resolveSearch!: (value: LyricsDocument) => void
    const load = vi.fn().mockReturnValue(new Promise<LyricsDocument>((resolve) => { resolveSearch = resolve }))
    const onLoaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={onLoaded} lrclibSource={{ load }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    fireEvent.change(screen.getByLabelText('Timed LRC text'), { target: { value: '[00:00.00]Local lyric stays active' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }))
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ sourceId: 'paste-text' })))
    resolveSearch(documentFixture)
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1))
  })

  it('uses the existing successful external loading path', async () => {
    const onLoaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={onLoaded} lrclibSource={{ load: vi.fn().mockResolvedValue(documentFixture) }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search LRCLIB' }))
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(documentFixture))
    expect(screen.getByRole('status')).toHaveTextContent('Loaded Example title by Example artist from LRCLIB.')
  })

})
