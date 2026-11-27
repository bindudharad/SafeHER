import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { apiClient } from '../services/api/client'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  register: (name: string, email: string, pass: string, consent: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const initAuth = useCallback(async () => {
    try {
      const storedToken = apiClient.getToken()
      if (storedToken) {
        setToken(storedToken)
        const currentUser = await apiClient.getCurrentUser()
        setUser(currentUser)
      } else {
        // Automatically provide demo authenticated user for frictionless first-time testing
        const initial = await apiClient.login('ananya.sharma@safeher.protect', 'demoPassword123')
        setToken(initial.access_token)
        setUser(initial.user)
      }
    } catch {
      apiClient.clearToken()
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    initAuth()
  }, [initAuth])

  const login = async (email: string, pass: string) => {
    setIsLoading(true)
    try {
      const res = await apiClient.login(email, pass)
      setToken(res.access_token)
      setUser(res.user)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, pass: string, consent: boolean) => {
    setIsLoading(true)
    try {
      const res = await apiClient.register(name, email, pass, consent)
      setToken(res.access_token)
      setUser(res.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    apiClient.clearToken()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useOptionalAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  return (
    context ?? {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => undefined,
      register: async () => undefined,
      logout: () => undefined,
    }
  )
}
