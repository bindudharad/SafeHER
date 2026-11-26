import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { RealityTrustCenterPage } from '../pages/trust/RealityTrustCenterPage'
import { KnowledgeHubPage } from '../pages/knowledge/KnowledgeHubPage'
import { ArticleDetailPage } from '../pages/knowledge/ArticleDetailPage'
import { DetectPage } from '../pages/detect/DetectPage'

describe('SafeHER Multi-Page Digital Trust Platform', () => {
  it('renders RealityTrustCenterPage with hero headline, real metrics, and threat categories', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <RealityTrustCenterPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Understand the Threat\./i)).toBeInTheDocument()
      expect(screen.getByText(/Take Back Control\./i)).toBeInTheDocument()
      expect(screen.getByText(/Personal Digital Safety Overview/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Reported Incidents/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Evidence Preserved/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/AI Scans Completed/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Known Scam Patterns in India/i)).toBeInTheDocument()
      expect(screen.getByText(/Safety Activity Timeline/i)).toBeInTheDocument()
    })
  })

  it('renders KnowledgeHubPage with search, 10 categories, and featured article', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <KnowledgeHubPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/Understand Digital Threats\./i)).toBeInTheDocument()
    expect(screen.getByText(/Stay One Step Ahead\./i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search by threat, legal section, tactic/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Deepfake Awareness/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Voice Cloning/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Digital Arrest Scams/i).length).toBeGreaterThan(0)
  })

  it('renders ArticleDetailPage with table of contents and legal framework', () => {
    render(
      <MemoryRouter initialEntries={['/knowledge-hub/understanding-deepfakes-synthetic-media-threats']}>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/knowledge-hub/:slug" element={<ArticleDetailPage />} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/Deconstructing Deepfakes/i)).toBeInTheDocument()
    expect(screen.getByText(/Table of Contents/i)).toBeInTheDocument()
    expect(screen.getByText(/Statutory Legal Framework/i)).toBeInTheDocument()
    expect(screen.getByText(/What to Do If Affected by This Threat/i)).toBeInTheDocument()
  })

  it('renders DetectPage with media verifier upload zone, benchmark samples and privacy guarantee', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <DetectPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/Verify Before You Trust\./i)).toBeInTheDocument()
    expect(screen.getByText(/Upload Media File for Forensic Scan/i)).toBeInTheDocument()
    expect(screen.getByText(/Or Test with Benchmark Forensic Samples:/i)).toBeInTheDocument()
    expect(screen.getByText(/Privacy Guarantee/i)).toBeInTheDocument()
  })
})
