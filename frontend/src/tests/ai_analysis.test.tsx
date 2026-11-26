import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { MediaAnalysisPage } from '../pages/analysis/MediaAnalysisPage'
import { ThreatAnalysisPage } from '../pages/analysis/ThreatAnalysisPage'

describe('AI Analysis Interfaces', () => {
  it('renders MediaAnalysisPage with transparent AI disclaimer', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <MediaAnalysisPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/AI Media & Deepfake Scanner/i)).toBeInTheDocument()
      expect(screen.getByText(/Transparent AI Principle/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Run Media Scanner/i })).toBeInTheDocument()
    })
  })

  it('renders ThreatAnalysisPage with legal boundary principle', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <ThreatAnalysisPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Threat & Harassment Intelligence/i)).toBeInTheDocument()
      expect(screen.getByText(/Legal Boundary & Principle/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Paste or type the received hostile message/i)).toBeInTheDocument()
    })
  })
})
