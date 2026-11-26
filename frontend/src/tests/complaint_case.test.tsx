import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { ComplaintWizardPage } from '../pages/complaints/ComplaintWizardPage'
import { CaseTrackingPage } from '../pages/cases/CaseTrackingPage'

describe('Complaint Generator & Case Tracking Modules', () => {
  it('renders ComplaintWizardPage with step progression and legal disclaimer', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <ComplaintWizardPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/AI-Assisted Complaint Preparation Wizard/i)).toBeInTheDocument()
      expect(screen.getByText(/Complainant Verification Principle/i)).toBeInTheDocument()
      expect(screen.getByText(/Step 1: Choose Abuse Incident to Report/i)).toBeInTheDocument()
    })
  })

  it('renders CaseTrackingPage with case IDs and status badges', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <CaseTrackingPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/User Case Tracking/i)).toBeInTheDocument()
      expect(screen.getByText(/SUBMITTED BY USER/i)).toBeInTheDocument()
      expect(screen.getByText(/META-REF-892104-IN/i)).toBeInTheDocument()
    })
  })
})
