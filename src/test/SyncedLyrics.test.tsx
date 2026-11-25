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

  it('delays line activation with a positive offset without changing timer position', () => {
    const timer = new ManualTimer(() => 0)
    timer.seek(2.25)

    render(<SyncedLyrics lines={lines} timer={timer} timingOffset={0.5} />)

    expect(screen.getByText('First original line')).toHaveAttribute('data-active', 'true')
    expect(screen.getByLabelText('Current timer position')).toHaveTextContent('2.25s')
  })

  it('advances line activation with a negative offset', () => {
    const timer = new ManualTimer(() => 0)
    timer.seek(1.75)

    render(<SyncedLyrics lines={lines} timer={timer} timingOffset={-0.5} />)

    expect(screen.getByText('Second original line')).toHaveAttribute('data-active', 'true')
  })

  it('resets the timing offset to zero', () => {
    const onTimingOffsetChange = vi.fn()

    render(
      <SyncedLyrics
        lines={lines}
        timingOffset={0.5}
        onTimingOffsetChange={onTimingOffsetChange}
      />,
    )

    expect(screen.getByLabelText('Timing offset')).toHaveValue('0.5')
    expect(screen.getByLabelText('Timing offset').closest('div')).toHaveTextContent('+0.50s')
    fireEvent.click(screen.getByRole('button', { name: 'Reset offset' }))
    expect(onTimingOffsetChange).toHaveBeenCalledWith(0)
  })

  it('provides play, pause, and reset controls', () => {
    render(<SyncedLyrics lines={lines} timer={new ManualTimer(() => 0)} />)

    expect(screen.getByRole('button', { name: 'Start lyric preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart preview' })).toBeInTheDocument()
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
    expect(screen.getByRole('option', { name: 'Thai — Azure Transliteration' })).toBeInTheDocument()
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
  it('synchronizes valid numeric offsets and rejects incomplete, out-of-range, and off-step entry', () => {
    const change = vi.fn()
    const { rerender } = render(<SyncedLyrics lines={lines} timingOffset={0.5} onTimingOffsetChange={change} />)
    const numeric = screen.getByRole('spinbutton', { name: 'Offset (seconds)' })
    fireEvent.change(numeric, { target: { value: '-1.25' } })
    expect(change).toHaveBeenLastCalledWith(-1.25)
    change.mockClear()
    for (const value of ['', '6', '0.333', '0.03']) {
      fireEvent.change(numeric, { target: { value } })
      expect(numeric).toHaveAttribute('aria-invalid', 'true')
      expect(change).not.toHaveBeenCalled()
    }
    fireEvent.blur(numeric)
    expect(numeric).toHaveValue(0.5)
    rerender(<SyncedLyrics lines={lines} timingOffset={1.15} onTimingOffsetChange={change} />)
    expect(numeric).toHaveValue(1.15)
    expect(screen.getByRole('slider')).toHaveValue('1.15')
  })

  it('keeps the timestamp out of live announcements and describes preview effects', () => {
    render(<SyncedLyrics lines={lines} timer={new ManualTimer(() => 0)} />)
    expect(screen.getByLabelText('Current timer position')).toHaveAttribute('aria-live', 'off')
    fireEvent.click(screen.getByRole('button', { name: 'Start lyric preview' }))
    expect(screen.getByRole('button', { name: 'Pause lyric preview' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restart preview' }))
    expect(screen.getByRole('button', { name: 'Start lyric preview' })).toBeInTheDocument()
  })

})
