import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { I18nProvider } from '../contexts/I18nContext'
import { ToastProvider } from '../contexts/ToastContext'
import { AuthProvider } from '../contexts/AuthContext'
import { SplashProvider } from '../contexts/SplashContext'
import { SafeHERSplash } from '../components/common/SafeHERSplash'

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <SplashProvider>
            <SafeHERSplash />
            <RouterProvider router={router} />
          </SplashProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  )
}

export default App
