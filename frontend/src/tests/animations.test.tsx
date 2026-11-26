import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IntroModal } from '../components/landing/IntroModal'
import { ThreeDImageConveyor } from '../components/landing/ThreeDImageConveyor'
import { ConnectedSvgCurve } from '../components/landing/ConnectedSvgCurve'
import { RiskCoverageGrid } from '../components/landing/RiskCoverageGrid'
import { StackedCardCarousel } from '../components/landing/StackedCardCarousel'
import { CircularRevealManifesto } from '../components/landing/CircularRevealManifesto'
import { ButtonMarquee } from '../components/landing/ButtonMarquee'

describe('High-Fidelity Animation System & Interactive Components', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllTimers()
  })

  it('renders IntroModal on first session visit and allows dismissal via close button', () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <IntroModal />
      </MemoryRouter>
    )

    // Advance timer past initial delay inside act
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/WE'RE LIVE/i)).toBeInTheDocument()

    // Dismiss modal
    const closeBtn = screen.getByLabelText(/Close introductory popup/i)
    act(() => {
      fireEvent.click(closeBtn)
      vi.advanceTimersByTime(400)
    })

    expect(sessionStorage.getItem('safeher_intro_dismissed')).toBe('true')
    vi.useRealTimers()
  })

  it('renders ButtonMarquee with primary text and moving marquee duplicate layer', () => {
    render(
      <ButtonMarquee marqueeText="TEST MARQUEE HOVER">
        CLICK ME
      </ButtonMarquee>
    )

    expect(screen.getByText('CLICK ME')).toBeInTheDocument()
    expect(screen.getAllByText(/TEST MARQUEE HOVER/i).length).toBeGreaterThan(0)
  })

  it('renders ThreeDImageConveyor with dual opposing stream tracks and metrics', () => {
    render(
      <MemoryRouter>
        <ThreeDImageConveyor />
      </MemoryRouter>
    )

    expect(screen.getAllByText(/PROVEN/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/REAL-WORLD SPEED/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Incident Documentation/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Cryptographic Evidence Vault/i).length).toBeGreaterThan(0)
  })

  it('renders ConnectedSvgCurve with S-curve path and 3 numbered workflow stages', () => {
    render(
      <MemoryRouter>
        <ConnectedSvgCurve />
      </MemoryRouter>
    )

    expect(screen.getByText(/THE SAFEHER/i)).toBeInTheDocument()
    expect(screen.getByText(/RESPONSE CENTER/i)).toBeInTheDocument()
    expect(screen.getByText(/01 Intake & Secure Hash/i)).toBeInTheDocument()
    expect(screen.getByText(/02 Evidence Organization/i)).toBeInTheDocument()
    expect(screen.getByText(/03 Formatted Dossier & Legal Dispatch/i)).toBeInTheDocument()
  })

  it('renders RiskCoverageGrid with 5 technical vector categories and interactive hover state', () => {
    render(
      <MemoryRouter>
        <RiskCoverageGrid />
      </MemoryRouter>
    )

    expect(screen.getByText(/Online Harassment/i)).toBeInTheDocument()
    expect(screen.getByText(/Identity Impersonation/i)).toBeInTheDocument()
    expect(screen.getByText(/Image-Based Abuse/i)).toBeInTheDocument()
    expect(screen.getByText(/Threats & Blackmail/i)).toBeInTheDocument()
    expect(screen.getByText(/Digital Arrest Scams/i)).toBeInTheDocument()
  })

  it('renders StackedCardCarousel and supports Next/Previous card navigation', () => {
    render(<StackedCardCarousel />)

    expect(screen.getByText(/85,000\+ Pre-Registrations/i)).toBeInTheDocument()
    expect(screen.getByText(/01 \/ 04/i)).toBeInTheDocument()

    // Click Next
    const nextBtn = screen.getByLabelText(/Next article card/i)
    fireEvent.click(nextBtn)
    expect(screen.getByText(/02 \/ 04/i)).toBeInTheDocument()
    expect(screen.getByText(/Section 65B/i)).toBeInTheDocument()

    // Click Prev
    const prevBtn = screen.getByLabelText(/Previous article card/i)
    fireEvent.click(prevBtn)
    expect(screen.getByText(/01 \/ 04/i)).toBeInTheDocument()
  })

  it('renders CircularRevealManifesto with dual synchronized text layers and marquees', () => {
    render(<CircularRevealManifesto />)

    // Base and Inverted text layers both render the core statement
    expect(screen.getAllByText(/YOUR SAFETY/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/SHOULD NOT DEPEND/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/TAKE THE NEXT STEP/i).length).toBeGreaterThanOrEqual(2)
  })
})
