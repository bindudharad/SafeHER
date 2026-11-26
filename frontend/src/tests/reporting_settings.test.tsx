import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { ReportingAssistantPage } from '../pages/reporting/ReportingAssistantPage'
import { PrivacySettingsPage } from '../pages/settings/PrivacySettingsPage'

describe('Reporting Assistant & Privacy Settings Modules', () => {
  it('renders ReportingAssistantPage with verified official channels and external links', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <ReportingAssistantPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Multi-Platform Reporting Assistant/i)).toBeInTheDocument()
      expect(screen.getByText(/National Cyber Crime Reporting Portal/i)).toBeInTheDocument()
      expect(screen.getByText(/Instagram Abuse & Impersonation Reporting/i)).toBeInTheDocument()
      expect(screen.getByText(/WhatsApp Grievance & Threat Reporting/i)).toBeInTheDocument()
      expect(screen.getAllByText(/StopNCII.org/i).length).toBeGreaterThan(0)
    })
  })

  it('renders PrivacySettingsPage with language preference and cache purge control', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <PrivacySettingsPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Privacy, Consent & Account Settings/i)).toBeInTheDocument()
      expect(screen.getByText(/ಕನ್ನಡ \(Kannada\)/i)).toBeInTheDocument()
      expect(screen.getByText(/हिन्दी \(Hindi\)/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Purge Local Browser Session Cache/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Export Personal Data Archive/i })).toBeInTheDocument()
    })
  })
})
