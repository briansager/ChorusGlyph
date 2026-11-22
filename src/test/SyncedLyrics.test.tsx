import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ManualTimer } from '../domain/now-playing/manual-timer'
import { SyncedLyrics } from '../features/synced-lyrics/SyncedLyrics'

const lines = [
  { id: 'one', text: 'First original line', startTime: 0, endTime: 2 },
  { id: 'two', text: 'Second original line', startTime: 2 },
]

describe('SyncedLyrics', () => {
  it('renders all lines and highlights the active line', () => {
    const timer = new ManualTimer(() => 0)
    timer.seek(2.25)

    render(<SyncedLyrics lines={lines} timer={timer} />)

    expect(screen.getByText('First original line')).toBeInTheDocument()
    expect(screen.getByText('Second original line')).toBeInTheDocument()
    expect(screen.getByText('Second original line')).toHaveAttribute('data-active', 'true')
    expect(screen.getByLabelText('Current timer position')).toHaveTextContent('2.25s')
  })

  it('provides play, pause, and reset controls', () => {
    render(<SyncedLyrics lines={lines} timer={new ManualTimer(() => 0)} />)

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })
})
