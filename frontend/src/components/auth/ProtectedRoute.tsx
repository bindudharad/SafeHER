import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { SafeHERLogo } from '../common/SafeHERLogo'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070908] flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#d5ff54]/15 blur-xl animate-pulse" />
          <SafeHERLogo size="xl" animate />
        </div>
        <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.14em] text-[#929b93]">
          <span className="w-2 h-2 rounded-full bg-[#d5ff54] animate-ping" />
          <span>Verifying secure session...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
