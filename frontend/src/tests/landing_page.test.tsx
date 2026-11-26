import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { LandingPage } from '../pages/LandingPage'

describe('ZSure-Inspired SafeHER Single-Page Website (LandingPage)', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <LandingPage />
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )
  }

  it('renders top navigation bar with logo, links, and Open SafeHER CTA', () => {
    renderLandingPage()

    expect(screen.getAllByText(/SAFEHER/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/OPEN SAFEHER/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/QUICK EXIT/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/REALITY TRUST CENTER/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/MEDIA VERIFIER/i).length).toBeGreaterThan(0)
  })

  it('renders Section 1: Cinematic Hero with typography, primary CTAs, and Meera video', () => {
    renderLandingPage()

    expect(screen.getAllByText(/YOUR DIGITAL/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/SAFETY/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Your Evidence. Your Voice./i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Get Started/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Watch Intro/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Explore SafeHER/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/^TRY NOW$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Meera/i).length).toBeGreaterThan(0)
  })

  it('renders Section 2: PROVEN At SCALE with image conveyor and metrics', () => {
    renderLandingPage()

    expect(screen.getAllByText(/PROVEN/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/SCALE/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/100%/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/96.2%/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/TEST YOUR MEDIA/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/OPEN EVIDENCE VAULT/i).length).toBeGreaterThan(0)
  })

  it('renders Section 3: What We Do (Three-point connected Response Center)', () => {
    renderLandingPage()

    expect(screen.getAllByText(/what we do/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Evidence Vault™/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Threat Intelligence/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Legal Dossier Hub/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/01/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/02/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/03/i).length).toBeGreaterThan(0)
  })

  it('renders Section 4: 003 / CORE RISK Coverage 5-column grid', () => {
    renderLandingPage()

    expect(screen.getAllByText(/003 \//i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/CORE RISK/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Coverage/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Deepfake Threats/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Synthetic Identities/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Fake KYC Fraud/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Voice Cloning/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Digital Arrest Scams/i).length).toBeGreaterThan(0)
  })

  it('renders Section 5: Recognized by / Endorsed compliance section with partner logos', () => {
    renderLandingPage()

    expect(screen.getAllByText(/Recognized by/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ENDORSED/i).length).toBeGreaterThan(0)
    expect(screen.getByTitle(/Amazon Web Services/i)).toBeInTheDocument()
    expect(screen.getByTitle(/NVIDIA Inception/i)).toBeInTheDocument()
    expect(screen.getByTitle(/DPIIT #startupindia/i)).toBeInTheDocument()
    expect(screen.getByTitle(/DPDP Act 2023/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Ministry of MSME/i)).toBeInTheDocument()
  })

  it('renders Section 6: Press & Media Coverage 3D editorial card swap stack', () => {
    renderLandingPage()

    expect(screen.getAllByText(/PRESS/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/MEDIA COVERAGE/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/120\+/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Hindustan Metro/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Next coverage card/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Previous coverage card/i)).toBeInTheDocument()
  })

  it('renders Section 7: Large Typographic Manifesto Statement with continuous marquees', () => {
    renderLandingPage()

    expect(screen.getAllByText(/YOUR SAFETY/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/SHOULD NOT DEPEND/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ON WHAT YOU REMEMBER\./i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/A CLEAR RECORD CAN HELP\./i).length).toBeGreaterThan(0)
  })

  it('renders Section 8: Technical White Paper document briefing', () => {
    renderLandingPage()

    expect(screen.getAllByText(/WHITE PAPER/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/TECHNICAL RESEARCH/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/INSIDE THE SAFEHER ENGINE/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Three-Model Ensemble/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Download the Paper/i).length).toBeGreaterThan(0)
  })

  it('renders Section 9: Site Footer with official emergency helplines 1930 and 112', () => {
    renderLandingPage()

    expect(screen.getAllByText(/Emergency \(India\)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/1930 · Cyber Fraud Helpline/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/112 · National Emergency/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/BACK TO TOP/i).length).toBeGreaterThan(0)
  })

  it('allows switching interface languages from the landing page', () => {
    renderLandingPage()

    const select = screen.getByLabelText(/Language/i)
    expect(select).toBeInTheDocument()

    // Switch to Kannada
    fireEvent.change(select, { target: { value: 'kn' } })
    expect((select as HTMLSelectElement).value).toBe('kn')

    // Switch to Hindi
    fireEvent.change(select, { target: { value: 'hi' } })
    expect((select as HTMLSelectElement).value).toBe('hi')
  })
})
