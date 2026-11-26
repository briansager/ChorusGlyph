import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LyricsDocument } from '../domain/lyrics/lyrics-types'
import type { LrclibSearchResult } from '../domain/lyrics/lrclib-types'
import { LyricsSourcePanel } from '../features/lyrics-source/LyricsSourcePanel'

const result: LrclibSearchResult = {
  id: 1, trackName: 'Original morning', artistName: 'Demo artist', albumName: 'Demo album',
  duration: 120, language: 'ja', instrumental: false, syncedLyrics: '[00:00.00]青い朝が来る',
}
const active: LyricsDocument = {
  sourceId: 'paste-text', title: 'My current song', lines: [{ id: 'active', text: 'My current lyrics', startTime: 0 }],
}
const searchButton = () => screen.getByRole('button', { name: 'Search LRCLIB' })
const clickSearch = () => fireEvent.click(searchButton())
const card = (title = result.trackName) => screen.getByRole('article', { name: 'Lyric result: ' + title })
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(records: LrclibSearchResult[] = [result]) {
  const searchLyrics = vi.fn().mockResolvedValue(records)
  const onLoaded = vi.fn()
  render(<LyricsSourcePanel activeDocument={active} onLoaded={onLoaded} searchPrefill={{ title: result.trackName, artist: result.artistName!, album: result.albumName!, duration: 120, language: 'ja' }} candidateSearchActive lrclibClient={{ searchLyrics }} />)
  return { searchLyrics, onLoaded }
}

describe('LyricsSourcePanel explicit LRCLIB review', () => {
  it('prepares metadata and focuses Search without requesting; one result waits for selection AND confirmation', async () => {
    const { searchLyrics, onLoaded } = setup()
    expect(searchLyrics).not.toHaveBeenCalled()
    expect(searchButton()).toHaveFocus()
    expect(screen.getByLabelText('LRCLIB duration')).toHaveValue(120)
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: ' + result.trackName })
    expect(searchLyrics).toHaveBeenCalledExactlyOnceWith({ trackName: result.trackName, artistName: result.artistName })
    expect(onLoaded).not.toHaveBeenCalled()
    expect(within(card()).getByText('Album: Demo album')).toBeInTheDocument()
    expect(within(card()).getByText('Language: ja')).toBeInTheDocument()
    expect(within(card()).getByText('Source: LRCLIB · Record 1')).toBeInTheDocument()
    fireEvent.click(within(card()).getByText('Preview details'))
    expect(within(card()).getByText('青い朝が来る', { exact: false })).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
    fireEvent.click(within(card()).getByRole('button', { name: 'Select lyrics' }))
    expect(screen.getByRole('heading', { name: 'Replace active lyrics?' })).toHaveFocus()
    expect(screen.getByText(/Current: My current song/)).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm replacement' }))
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      sourceId: 'lrclib', title: result.trackName, artist: result.artistName,
      album: result.albumName, language: 'ja', duration: 120,
      lines: [expect.objectContaining({ text: '青い朝が来る', startTime: 0 })],
    }))
    expect(searchLyrics).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('heading', { name: 'Replace active lyrics?' })).not.toBeInTheDocument()
    expect(searchButton()).toHaveFocus()
  })

  it('allows choosing a specific result from multiple versions and loads only that result', async () => {
    const { onLoaded } = setup([result, { ...result, id: 2, trackName: 'Original morning (Live)', syncedLyrics: '[00:00.00]A self-written live line' }])
    clickSearch()
    await screen.findByText('2 results available for review.')
    fireEvent.click(within(card('Original morning (Live)')).getByRole('button', { name: 'Select lyrics' }))
    expect(onLoaded).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm replacement' }))
    expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ title: 'Original morning (Live)', lines: [expect.objectContaining({ text: 'A self-written live line' })] }))
  })

  it('cancels confirmation back to selectable results, then closes review without replacing active lyrics', async () => {
    const { onLoaded, searchLyrics } = setup()
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: ' + result.trackName })
    fireEvent.click(within(card()).getByRole('button', { name: 'Select lyrics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(within(card()).getByRole('button', { name: 'Select lyrics' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(searchButton()).toHaveFocus()
    expect(onLoaded).not.toHaveBeenCalled()
    expect(searchLyrics).toHaveBeenCalledTimes(1)
  })

  it('groups exact duplicate content but preserves distinct timings and translations', async () => {
    setup([result, { ...result }, { ...result, id: 2 }, { ...result, id: 3, syncedLyrics: '[00:01.00]青い朝が来る' }])
    clickSearch()
    await screen.findByText('2 results available for review.')
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('3 identical records grouped.')).toBeInTheDocument()
  })

  it('supports missing artist, album, duration, and language without inventing metadata', async () => {
    const { onLoaded } = setup([{ ...result, artistName: null, albumName: undefined, duration: undefined, language: undefined }])
    fireEvent.change(screen.getByLabelText('LRCLIB artist'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('LRCLIB duration'), { target: { value: '' } })
    clickSearch()
    await screen.findByText('Artist unavailable')
    expect(screen.getByText('Duration: unavailable')).toBeInTheDocument()
    expect(screen.getByText('Language: not provided')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select lyrics' })).toBeEnabled()
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('shows a wrong-language warning and requires deliberate confirmation without claiming certainty', async () => {
    const { onLoaded } = setup([{ ...result, language: 'zh' }])
    clickSearch()
    await screen.findByText('Language differs: expected ja, result zh.')
    expect(screen.getByText('Check the language before loading this version.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select lyrics' }))
    expect(onLoaded).not.toHaveBeenCalled()
    expect(screen.getByText('Language differs: expected ja, result zh.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm replacement' }))
    expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ language: 'zh' }))
  })

  it.each([
    { ...result, syncedLyrics: null, plainLyrics: 'Original untimed line' },
    { ...result, syncedLyrics: 'invalid LRC', plainLyrics: null },
    { ...result, syncedLyrics: null, plainLyrics: null, instrumental: true },
  ])('explains preview-only or unusable lyrics instead of loading them', async (record) => {
    const { onLoaded } = setup([record])
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: ' + result.trackName })
    expect(screen.getByRole('button', { name: 'Select lyrics' })).toBeDisabled()
    fireEvent.click(screen.getByText('Preview details'))
    expect(screen.getByText(/Use timed manual input or a local LRC file instead/)).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('offers correction actions when no results are returned; Search again only focuses the editable form', async () => {
    const { searchLyrics, onLoaded } = setup([])
    clickSearch()
    await screen.findByText(/No results found/)
    fireEvent.click(screen.getByRole('button', { name: 'Search again' }))
    expect(screen.getByLabelText('LRCLIB track title')).toHaveFocus()
    expect(screen.getByLabelText('LRCLIB track title')).toHaveValue(result.trackName)
    expect(searchLyrics).toHaveBeenCalledTimes(1)
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('reports LRCLIB errors and keeps entered values and active lyrics', async () => {
    const failed = vi.fn().mockRejectedValue(new Error('LRCLIB is temporarily unavailable. Try again later.'))
    const loaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={loaded} searchPrefill={{ title: 'Keep title' }} lrclibClient={{ searchLyrics: failed }} />)
    clickSearch()
    expect(await screen.findByRole('alert')).toHaveTextContent('LRCLIB is temporarily unavailable.')
    expect(screen.getByLabelText('LRCLIB track title')).toHaveValue('Keep title')
    expect(loaded).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Use manual input' })).toBeInTheDocument()
  })

  it('ignores stale success from an older search after an edited new search completes', async () => {
    const old = deferred<LrclibSearchResult[]>()
    const searchLyrics = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ ...result, trackName: 'New result' }])
    const loaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={loaded} searchPrefill={{ title: 'Old query' }} lrclibClient={{ searchLyrics }} />)
    clickSearch()
    fireEvent.change(screen.getByLabelText('LRCLIB track title'), { target: { value: 'New query' } })
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: New result' })
    await act(async () => old.resolve([result]))
    expect(screen.queryByRole('article', { name: 'Lyric result: ' + result.trackName })).not.toBeInTheDocument()
    expect(loaded).not.toHaveBeenCalled()
  })

  it('ignores stale rejection and restores focus when a pending candidate search is canceled', async () => {
    const old = deferred<LrclibSearchResult[]>()
    const loaded = vi.fn(), cancel = vi.fn()
    render(<LyricsSourcePanel onLoaded={loaded} onCandidateSearchCancel={cancel} candidateSearchActive searchPrefill={{ title: 'Canceled' }} lrclibClient={{ searchLyrics: vi.fn().mockReturnValue(old.promise) }} />)
    clickSearch()
    screen.getByRole('button', { name: 'Cancel candidate search' }).focus()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel candidate search' }))
    expect(searchButton()).toHaveFocus()
    await act(async () => old.reject(new Error('late error')))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(loaded).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('invalidates a pending request after a new explicit preparation', async () => {
    const old = deferred<LrclibSearchResult[]>()
    const loaded = vi.fn(), client = { searchLyrics: vi.fn().mockReturnValue(old.promise) }
    const { rerender } = render(<LyricsSourcePanel onLoaded={loaded} searchPrefill={{ title: 'Old' }} candidateSearchActive lrclibClient={client} />)
    clickSearch()
    rerender(<LyricsSourcePanel onLoaded={loaded} searchPrefill={{ title: 'New', artist: undefined }} candidateSearchActive lrclibClient={client} />)
    expect(screen.getByLabelText('LRCLIB track title')).toHaveValue('New')
    expect(screen.getByLabelText('LRCLIB artist')).toHaveValue('')
    expect(searchButton()).toHaveFocus()
    await act(async () => old.resolve([result]))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(loaded).not.toHaveBeenCalled()
  })

  it('invalidates a pending request on generic Cancel and never restores canceled results', async () => {
    const old = deferred<LrclibSearchResult[]>()
    const loaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={loaded} searchPrefill={{ title: 'Cancel me' }} lrclibClient={{ searchLyrics: vi.fn().mockReturnValue(old.promise) }} />)
    clickSearch()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await act(async () => old.resolve([result]))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(loaded).not.toHaveBeenCalled()
  })

  it('preserves manual loading while abandoning a remote request', async () => {
    const old = deferred<LrclibSearchResult[]>()
    const loaded = vi.fn()
    render(<LyricsSourcePanel onLoaded={loaded} searchPrefill={{ title: 'Remote' }} lrclibClient={{ searchLyrics: vi.fn().mockReturnValue(old.promise) }} />)
    clickSearch()
    fireEvent.click(screen.getByRole('button', { name: 'Use manual input' }))
    expect(screen.getByLabelText('Timed LRC text')).toHaveFocus()
    fireEvent.change(screen.getByLabelText('Timed LRC text'), { target: { value: '[00:00.00]My local original line' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }))
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(expect.objectContaining({ sourceId: 'paste-text' })))
    await act(async () => old.resolve([result]))
    expect(loaded).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('preserves local LRC loading and keeps a file until explicit loading', async () => {
    const { onLoaded } = setup([])
    clickSearch()
    await screen.findByText(/No results found/)
    fireEvent.click(screen.getByRole('button', { name: 'Import local LRC' }))
    const input = screen.getByLabelText('Local LRC file')
    expect(input).toHaveFocus()
    const file = new File(['[00:00.00]My file lyric'], 'original.lrc', { type: 'text/plain' })
    Object.defineProperty(file, 'text', { value: async () => '[00:00.00]My file lyric' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onLoaded).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Load local file' }))
    await waitFor(() => expect(onLoaded).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      sourceId: 'lrc-file', lines: [expect.objectContaining({ text: 'My file lyric' })],
    })))
  })

  it('rejects invalid duration without searching and allows a missing duration', async () => {
    const { searchLyrics } = setup()
    fireEvent.change(screen.getByLabelText('LRCLIB duration'), { target: { value: '-3' } })
    clickSearch()
    expect(screen.getByRole('alert')).toHaveTextContent('positive duration')
    expect(searchLyrics).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('LRCLIB duration'), { target: { value: '' } })
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: ' + result.trackName })
    expect(searchLyrics).toHaveBeenCalledOnce()
  })

  it('clears a pending confirmation when fields change, requiring a new explicit search', async () => {
    const { onLoaded, searchLyrics } = setup()
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: ' + result.trackName })
    fireEvent.click(within(card()).getByRole('button', { name: 'Select lyrics' }))
    fireEvent.change(screen.getByLabelText('LRCLIB artist'), { target: { value: 'Corrected artist' } })
    expect(screen.queryByRole('button', { name: 'Confirm replacement' })).not.toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
    expect(searchLyrics).toHaveBeenCalledTimes(1)
  })

  it('keeps the real active document and readings until confirmation, through the existing onLoaded callback', async () => {
    const client = { searchLyrics: vi.fn().mockResolvedValue([result]) }
    function Harness() {
      const [document, setDocument] = useState(active)
      return <><output aria-label="Active document">{document.lines.map((line) => line.text).join(' ')}</output>
        <LyricsSourcePanel activeDocument={document} onLoaded={setDocument} searchPrefill={{ title: result.trackName }} lrclibClient={client} /></>
    }
    render(<Harness />)
    clickSearch()
    await screen.findByRole('article', { name: 'Lyric result: ' + result.trackName })
    expect(screen.getByLabelText('Active document')).toHaveTextContent('My current lyrics')
    fireEvent.click(within(card()).getByRole('button', { name: 'Select lyrics' }))
    expect(screen.getByLabelText('Active document')).toHaveTextContent('My current lyrics')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm replacement' }))
    expect(screen.getByLabelText('Active document')).toHaveTextContent('青い朝が来る')
  })
  it('uses a corrected duration locally while retaining the original prepared metadata snapshot', async () => {
    const reference = { title: result.trackName, artist: result.artistName!, duration: 120 }
    const client = { searchLyrics: vi.fn().mockResolvedValue([result]) }
    render(<LyricsSourcePanel onLoaded={vi.fn()} searchPrefill={reference} candidateSearchActive lrclibClient={client} />)
    fireEvent.change(screen.getByLabelText('LRCLIB duration'), { target: { value: '130' } })
    clickSearch()
    await screen.findByText('Duration differs by more than 2 seconds (10.0s difference).')
    expect(reference.duration).toBe(120)
    expect(client.searchLyrics).toHaveBeenCalledExactlyOnceWith({ trackName: result.trackName, artistName: result.artistName })
  })

})
