import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { SafeHERLogoLed3D } from '../components/3d/SafeHERLogoLed3D'

describe('SafeHERLogoLed3D', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders official SafeHER logo, background watermark, and SVG LED fallback cleanly when WebGPU is unavailable', () => {
    const { container, unmount } = render(<SafeHERLogoLed3D />)
    const img = screen.getByAltText('SafeHER Official Shield Emblem') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/assets/images/safeher-logo.png')
    expect(screen.getByText('SAFEHER')).toBeTruthy()

    const root = container.firstChild as HTMLElement
    fireEvent.pointerMove(root, { clientX: 160, clientY: 120, isPrimary: true })
    fireEvent.pointerLeave(root)

    expect(() => unmount()).not.toThrow()
  })
})
