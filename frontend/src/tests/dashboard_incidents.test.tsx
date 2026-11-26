import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { IncidentListPage } from '../pages/incidents/IncidentListPage'
import { NewIncidentPage } from '../pages/incidents/NewIncidentPage'

describe('Dashboard & Incident Management Modules', () => {
  it('renders DashboardPage and displays summary metrics', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <DashboardPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Digital Safety Overview/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Recorded Incidents/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Preserved Evidence/i)).toBeInTheDocument()
    })
  })

  it('renders IncidentListPage and filters incidents by search query', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <IncidentListPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Incident Management/i)).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search by title, platform or details/i)
    fireEvent.change(searchInput, { target: { value: 'Instagram' } })

    expect(screen.getByText(/Instagram Impersonation/i)).toBeInTheDocument()
  })

  it('renders NewIncidentPage with ephemeral draft protection and discard button', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <NewIncidentPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/Log Abuse Incident/i)).toBeInTheDocument()
    expect(screen.getByText(/Discard Draft Immediately/i)).toBeInTheDocument()
    expect(screen.getByText(/Auto-save draft in this browser session only/i)).toBeInTheDocument()
  })
})
