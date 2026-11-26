import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'

const TestAuthConsumer = () => {
  const { user, isAuthenticated, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</span>
      <span data-testid="user-email">{user?.email || 'NONE'}</span>
      <button onClick={logout}>Sign Out</button>
    </div>
  )
}

describe('Authentication & Protected Navigation', () => {
  it('provides authenticated state for default session and supports logout', async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <TestAuthConsumer />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN')
      expect(screen.getByTestId('user-email')).toHaveTextContent('ananya.sharma@safeher.protect')
    })

    fireEvent.click(screen.getByText('Sign Out'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT')
    })
  })

  it('renders LoginPage with email and password inputs', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <LoginPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /Sign In Safely/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument()
  })

  it('renders RegisterPage and requires consent checkbox', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <RegisterPage />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })
})
