import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { HolographicWhitePaperCard } from '../components/3d/HolographicWhitePaperCard'

describe('HolographicWhitePaperCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders White Paper cover and handles pointer movement and unmount cleanly without WebGPU', () => {
    const { container, unmount } = render(<HolographicWhitePaperCard />)
    expect(screen.getByText('WHITE PAPER')).toBeTruthy()
    expect(screen.getByText('SH')).toBeTruthy()
    expect(screen.getByText('SAFEHER RESEARCH')).toBeTruthy()

    const card = container.firstChild as HTMLElement
    fireEvent.pointerMove(card, { clientX: 120, clientY: 160, isPrimary: true })
    fireEvent.pointerLeave(card)

    expect(() => unmount()).not.toThrow()
  })
})
