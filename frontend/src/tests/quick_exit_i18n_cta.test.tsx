import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { AuthProvider } from '../contexts/AuthContext'
import { SplashProvider } from '../contexts/SplashContext'
import {
  QuickExitButton,
  NEUTRAL_REDIRECT_URL,
  resetQuickExitLock,
} from '../components/layout/QuickExitButton'
import { LandingPage } from '../pages/LandingPage'
import { Sidebar } from '../components/layout/Sidebar'
import { LoginPage } from '../pages/auth/LoginPage'
import { DetectPage } from '../pages/detect/DetectPage'
import { getMissingTranslationKeys } from '../i18n'

describe('Quick Exit, Multilingual (EN/KN/HI) & Hero CTA Corrections', () => {
  const originalLocation = window.location

  beforeEach(() => {
    localStorage.clear()
    resetQuickExitLock()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        replace: vi.fn(),
        href: 'http://localhost:5173/',
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  describe('Part 1 — Quick Exit (Button & Alt + Q)', () => {
    it('navigates in the same tab via window.location.replace and never calls window.open', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      render(
        <I18nProvider>
          <QuickExitButton />
        </I18nProvider>
      )

      const btn = screen.getByTestId('quick-exit-button')
      fireEvent.click(btn)

      expect(window.location.replace).toHaveBeenCalledTimes(1)
      expect(window.location.replace).toHaveBeenCalledWith(NEUTRAL_REDIRECT_URL)
      expect(openSpy).not.toHaveBeenCalled()
    })

    it('handles Alt + Q consistently without duplicate triggers on repeat or multiple presses', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      render(
        <I18nProvider>
          <QuickExitButton />
        </I18nProvider>
      )

      // Simulated held key (repeat: true) must be ignored
      fireEvent.keyDown(window, { key: 'q', code: 'KeyQ', altKey: true, repeat: true })
      expect(window.location.replace).not.toHaveBeenCalled()

      // First genuine Alt + Q press
      fireEvent.keyDown(window, { key: 'q', code: 'KeyQ', altKey: true })
      // Immediate second press must be deduplicated
      fireEvent.keyDown(window, { key: 'Q', code: 'KeyQ', altKey: true })

      expect(window.location.replace).toHaveBeenCalledTimes(1)
      expect(window.location.replace).toHaveBeenCalledWith(NEUTRAL_REDIRECT_URL)
      expect(openSpy).not.toHaveBeenCalled()
    })
  })

  describe('Part 2 — Complete EN, KN, HI Internationalization', () => {
    it('has zero missing translation keys across en, kn, and hi locales', () => {
      expect(getMissingTranslationKeys('en')).toEqual([])
      expect(getMissingTranslationKeys('kn')).toEqual([])
      expect(getMissingTranslationKeys('hi')).toEqual([])
    })

    it('translates LandingPage hero, nav, and CTAs into Kannada and Hindi and persists selection', () => {
      const { unmount } = render(
        <MemoryRouter>
          <I18nProvider>
            <ToastProvider>
              <LandingPage />
            </ToastProvider>
          </I18nProvider>
        </MemoryRouter>
      )

      const select = screen.getByLabelText(/Select interface language/i) as HTMLSelectElement

      // Switch to Kannada (kn)
      fireEvent.change(select, { target: { value: 'kn' } })
      expect(document.documentElement.lang).toBe('kn')
      expect(localStorage.getItem('safeher_preferred_language')).toBe('kn')
      expect(screen.getAllByText(/ಮುಂದೆ ಸಾಗಿ/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/SafeHER ಅನ್ವೇಷಿಸಿ/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/ತ್ವರಿತ ನಿರ್ಗಮನ/i).length).toBeGreaterThan(0)

      // Switch to Hindi (hi)
      fireEvent.change(select, { target: { value: 'hi' } })
      expect(document.documentElement.lang).toBe('hi')
      expect(localStorage.getItem('safeher_preferred_language')).toBe('hi')
      expect(screen.getAllByText(/आगे बढ़ें/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/SafeHER देखें/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/त्वरित निकास/i).length).toBeGreaterThan(0)

      unmount()

      // Remounting (simulated refresh/route navigation) preserves Hindi across internal pages & auth
      render(
        <MemoryRouter>
          <I18nProvider>
            <ToastProvider>
              <AuthProvider>
                <SplashProvider>
                  <Sidebar />
                  <DetectPage />
                  <LoginPage />
                </SplashProvider>
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </MemoryRouter>
      )

      expect(document.documentElement.lang).toBe('hi')
      expect(screen.getAllByText(/साक्ष्य तिजोरी/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/संदिग्ध सामग्री की पहचान/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/SafeHER में आपका स्वागत है/i).length).toBeGreaterThan(0)
    })
  })

  describe('Part 3 — Non-Redundant Hero CTAs', () => {
    it('keeps Explore SafeHER, Verify Media AI, Experience the demo, and Open SafeHER nav CTA cleanly distinct', () => {
      render(
        <MemoryRouter>
          <I18nProvider>
            <ToastProvider>
              <LandingPage />
            </ToastProvider>
          </I18nProvider>
        </MemoryRouter>
      )

      const exploreLink = screen.getByRole('link', { name: /Explore SafeHER/i })
      expect(exploreLink).toHaveAttribute('href', '#experience')

      const verifyLink = screen.getByRole('link', { name: /Verify Media AI/i })
      expect(verifyLink).toHaveAttribute('href', '/detect')

      const demoLink = screen.getByRole('link', { name: /Experience the demo/i })
      expect(demoLink).toHaveAttribute('href', '#live-demo')

      const openSafeHER = screen.getByRole('link', { name: /Open SafeHER/i })
      expect(openSafeHER).toHaveAttribute('href', '/login')

      expect(screen.queryByText(/^TRY NOW$/i)).not.toBeInTheDocument()
    })
  })
})
