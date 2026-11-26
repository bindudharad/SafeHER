import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { SpiralGalaxyHeroBackground } from '../components/3d/SpiralGalaxyHeroBackground'

describe('SpiralGalaxyHeroBackground', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders lightweight Midnight Aurora fallback gracefully when WebGPU is unavailable', () => {
    // jsdom does not provide navigator.gpu by default
    const { container, unmount } = render(<SpiralGalaxyHeroBackground />)
    expect(container.firstChild).toBeTruthy()
    // Should not render a WebGPU canvas when navigator.gpu is absent
    expect(screen.queryByLabelText('Interactive Midnight Aurora Spiral Galaxy background')).toBeNull()
    expect(() => unmount()).not.toThrow()
  })
})
