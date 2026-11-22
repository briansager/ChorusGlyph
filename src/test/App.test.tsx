import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../app/App'

describe('ChorusGlyph starter page', () => {
  it('introduces the app and its next milestone', () => {
    render(<App />)

    expect(screen.getByText('ChorusGlyph')).toBeInTheDocument()
    expect(screen.getByText(/multilingual sing-along app/i)).toBeInTheDocument()
    expect(screen.getByText(/timed lines with optional local readings/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Reading language' })).toHaveValue('japanese-kuroshiro')
    expect(screen.getByRole('option', { name: 'Kuroshiro + Kuromoji' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Korean Romanization' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Pinyin Pro' })).toBeInTheDocument()
  })
})
