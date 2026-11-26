import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { EvidenceVaultPage } from '../pages/evidence/EvidenceVaultPage'

describe('Digital Evidence Vault Module', () => {
  it('renders EvidenceVaultPage with SHA-256 fingerprints and integrity disclaimer', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <EvidenceVaultPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Digital Evidence Vault/i)).toBeInTheDocument()
      expect(screen.getByText(/Cryptographic Integrity Notice/i)).toBeInTheDocument()
      expect(screen.getAllByText(/SHA-256 Fingerprint/i).length).toBeGreaterThan(0)
    })
  })

  it('displays evidence filter dropdowns and action buttons', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <EvidenceVaultPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Evidence/i })).toBeInTheDocument()
      expect(screen.getByText(/All Formats/i)).toBeInTheDocument()
    })
  })
})
