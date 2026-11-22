import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('allows selecting Azure Thai and shows conversion errors clearly', () => {
    const onProviderChange = vi.fn()
    render(
      <SyncedLyrics
        lines={[{ id: 'thai', text: 'สวัสดีตอนเช้า', startTime: 0 }]}
        romanizationProviderId="japanese-kuroshiro"
        romanizationOptions={[
          { id: 'japanese-kuroshiro', displayName: 'Kuroshiro + Kuromoji' },
          { id: 'azure-transliteration', displayName: 'Azure Transliteration — Thai' },
        ]}
        onRomanizationProviderChange={onProviderChange}
        onRomanize={() => undefined}
        romanizationError="Azure transliteration proxy returned HTTP 403."
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Reading language' }), {
      target: { value: 'azure-transliteration' },
    })
    expect(onProviderChange).toHaveBeenCalledWith('azure-transliteration')
    expect(screen.getByRole('option', { name: 'Azure Transliteration — Thai' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 403')
  })

  it('edits, saves, clears, and preserves a reading separately from the original lyric', async () => {
    const onOverrideChange = vi.fn()
    render(
      <SyncedLyrics
        lines={[{ id: 'thai', text: 'สวัสดีตอนเช้า', startTime: 0 }]}
        romanizedLines={{ thai: 'Sawatdi ton chao' }}
        onReadingOverrideChange={onOverrideChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit reading' }))
    const input = screen.getByRole('textbox', { name: 'Edit reading for สวัสดีตอนเช้า' })
    fireEvent.change(input, { target: { value: 'Sawasdi ton chao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save reading' }))

    expect(onOverrideChange).toHaveBeenCalledWith('thai', 'Sawasdi ton chao')
    expect(screen.getByText('สวัสดีตอนเช้า')).toBeInTheDocument()
    expect(screen.getByText('Sawatdi ton chao')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit reading' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear edit' }))
    expect(onOverrideChange).toHaveBeenLastCalledWith('thai', '')
  })
})
