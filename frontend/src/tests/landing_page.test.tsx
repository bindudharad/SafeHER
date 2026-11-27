import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { LandingPage } from '../pages/LandingPage'

describe('SafeHER Scroll Story Experience Homepage (LandingPage)', () => {
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

  it('renders fixed top navigation with SafeHER brand, section links, Quick Exit, and workspace CTA', () => {
    renderLandingPage()

    expect(screen.getAllByText(/SAFEHER/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/OPEN SAFEHER/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/QUICK EXIT/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /^Experience$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /^Capabilities$/i }).length).toBeGreaterThan(0)
  })

  it('renders Section 1: Cinematic Hero (MOVE WITHOUT doubt.), HUD status cards, 3D canvas, and CTAs', () => {
    renderLandingPage()

    expect(screen.getAllByText(/MOVE/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/WITHOUT/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/doubt\./i).length).toBeGreaterThan(0)
    expect(screen.getByText(/PROTECTED/i)).toBeInTheDocument()
    expect(screen.getByText(/MEDIA & TEXT AI/i)).toBeInTheDocument()
    expect(screen.getByText(/SAFEHER NODE/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore SafeHER/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Verify Media AI/i })).toBeInTheDocument()
    expect(document.getElementById('hero3d')).toBeInTheDocument()
  })

  it('renders Section 3: Perspective Feature Gallery with interactive prev/next and card selection', () => {
    renderLandingPage()

    expect(screen.getByText(/SAFETY,/i)).toBeInTheDocument()
    expect(screen.getByText(/in motion\./i)).toBeInTheDocument()

    const prevBtn = screen.getByLabelText(/Previous feature/i)
    const nextBtn = screen.getByLabelText(/Next feature/i)
    expect(prevBtn).toBeInTheDocument()
    expect(nextBtn).toBeInTheDocument()

    fireEvent.click(nextBtn)
    expect(screen.getByRole('button', { name: /Open emergency drawer/i })).toBeInTheDocument()

    const emergencyCard = screen.getByRole('button', { name: /Select Emergency signal/i })
    fireEvent.click(emergencyCard)
    expect(screen.getByRole('button', { name: /Open emergency drawer/i })).toBeInTheDocument()
  })

  it('renders Section 4: Cinematic Journey Path with 01 Document, 02 Protect, 03 Analyse, 04 Respond', () => {
    renderLandingPage()

    expect(screen.getByText(/FROM FIRST/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Document/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Protect/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Analyse/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Respond/i).length).toBeGreaterThan(0)
  })

  it('renders Section 5: 5-column Capability Grid connected to real SafeHER modules', () => {
    renderLandingPage()

    expect(screen.getByText(/ONE SYSTEM\./i)).toBeInTheDocument()
    expect(screen.getByText(/Many layers\./i)).toBeInTheDocument()
    expect(screen.getAllByText(/Encrypted Evidence Vault/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/AI Media Analysis/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Digital Abuse Detection/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Forensic Intelligence/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Case Management & Safety Tools/i).length).toBeGreaterThan(0)

    const aiCard = screen.getByRole('button', { name: /AI Media Analysis/i })
    fireEvent.click(aiCard)
    expect(screen.getByText('LAYER / 02')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Run media scanner/i })).toHaveAttribute('href', '/detect')
  })

  it('renders Section 6: Truthful Interactive Demo with explicit DEMO disclaimer and SOS simulation modal', () => {
    renderLandingPage()

    expect(screen.getByText(/A SAFER WAY/i)).toBeInTheDocument()
    expect(screen.getByText(/DEMO ONLY/i)).toBeInTheDocument()
    expect(screen.getByText(/NO REAL GPS LOCATION/i)).toBeInTheDocument()

    const startBtn = screen.getByRole('button', { name: /Start journey/i })
    fireEvent.click(startBtn)
    expect(screen.getByText(/DEMO ACTIVE/i)).toBeInTheDocument()

    const sosBtn = screen.getByRole('button', { name: /Run SOS demo/i })
    fireEvent.click(sosBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Run simulation/i }))
    expect(screen.getByText(/SOS DEMO ACTIVE/i)).toBeInTheDocument()
  })

  it('renders Section 7 & 8: Manifesto Transition and 3-layer Technology Stack (Perceive, Understand, Respond)', () => {
    renderLandingPage()

    expect(screen.getByText(/SAFETY IS/i)).toBeInTheDocument()
    expect(screen.getByText(/NOT A LIMIT\./i)).toBeInTheDocument()
    expect(screen.getByText(/IT'S YOUR RIGHT\./i)).toBeInTheDocument()
    expect(screen.getByText(/BUILT TO/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Perceive/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Understand/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Respond/i).length).toBeGreaterThan(0)
  })

  it('renders Section 9: Footer with functional workspace routes and emergency helpline access', () => {
    renderLandingPage()

    expect(screen.getByRole('link', { name: /Reality Trust Center/i })).toHaveAttribute('href', '/reality-trust-center')
    expect(screen.getByRole('link', { name: /Complaint Assistant/i })).toHaveAttribute('href', '/complaints')
    expect(screen.getByRole('button', { name: /Emergency Tools \(112 \/ 181\)/i })).toBeInTheDocument()
  })

  it('allows switching interface languages between EN, KN, and HI from the landing page', () => {
    renderLandingPage()

    const select = screen.getByLabelText(/Select interface language/i) as HTMLSelectElement
    expect(select).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'kn' } })
    expect(select.value).toBe('kn')

    fireEvent.change(select, { target: { value: 'hi' } })
    expect(select.value).toBe('hi')
  })
})
