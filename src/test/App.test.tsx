import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../app/App'

describe('ChorusGlyph starter page', () => {
  it('introduces the app and its next milestone', () => {
    render(<App />)

    expect(screen.getByText('ChorusGlyph')).toBeInTheDocument()
    expect(screen.getByText(/multilingual sing-along app/i)).toBeInTheDocument()
    expect(screen.getByText(/timed lines with optional local japanese readings/i)).toBeInTheDocument()
  })
})
