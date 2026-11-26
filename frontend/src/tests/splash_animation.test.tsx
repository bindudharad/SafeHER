import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { SplashProvider } from '../contexts/SplashContext'
import { SafeHERSplash } from '../components/common/SafeHERSplash'

describe('SafeHERSplash Cinematic Entrance', () => {
  it('renders centered SafeHER logo, brand title, and loading message on initial mount', () => {
    render(
      <AuthProvider>
        <SplashProvider>
          <SafeHERSplash />
        </SplashProvider>
      </AuthProvider>
    )

    expect(screen.getByRole('status', { name: /SafeHER application loading/i })).toBeInTheDocument()
    expect(screen.getByText('SAFEHER')).toBeInTheDocument()
    expect(screen.getByText(/Preparing your digital safety experience/i)).toBeInTheDocument()
    const logo = screen.getByAltText('SafeHER Official Shield Emblem') as HTMLImageElement
    expect(logo).toBeInTheDocument()
    expect(logo.getAttribute('src')).toBe('/assets/images/safeher-logo.png')
  })
})
