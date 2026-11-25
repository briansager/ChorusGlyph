import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createCandidateFromCompanionMedia } from '../domain/lyrics-candidates/companion-candidate'
import { LyricSuggestions } from '../features/lyric-suggestions/LyricSuggestions'
import { initialLyricSuggestionState, lyricSuggestionReducer } from '../features/lyric-suggestions/lyric-suggestion-state'
import { playingMedia } from './companion-fixtures'

describe('LyricSuggestions', () => {
  it('shows a candidate and requires explicit actions', () => {
    const candidate = createCandidateFromCompanionMedia(playingMedia, 1).candidate!
    const state = lyricSuggestionReducer(initialLyricSuggestionState, { type: 'suggest', candidates: [candidate] })
    const onSelect = vi.fn()
    const onImportSearch = vi.fn()
    render(<LyricSuggestions state={state} companionStatus={{ status: 'connected-playing', message: 'Connected', media: playingMedia }} onSelect={onSelect} onEdit={vi.fn()} onDismiss={vi.fn()} onImportSearch={onImportSearch} />)
    expect(screen.getByText('Example title')).toBeInTheDocument()
    expect(screen.getByText(/Source: Windows companion/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select suggestion' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare lyric search' }))
    expect(onSelect).toHaveBeenCalledWith(candidate.id)
    expect(onImportSearch).toHaveBeenCalledWith(candidate.id)
  })

  it('preserves a no-media message and supports dismissal', () => {
    const onDismiss = vi.fn()
    render(<LyricSuggestions state={initialLyricSuggestionState} companionStatus={{ status: 'no-media', message: 'No media' }} onSelect={vi.fn()} onEdit={vi.fn()} onDismiss={onDismiss} onImportSearch={vi.fn()} />)
    expect(screen.getByText('No active media session was detected.')).toBeInTheDocument()
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
