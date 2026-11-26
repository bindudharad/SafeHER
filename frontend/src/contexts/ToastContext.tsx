import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastMessage {
  id: string
  text: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (text: string, type: ToastType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastMessage = { id, text, type, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-safe-light shrink-0" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-light shrink-0" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-critical-light shrink-0" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-primary-light shrink-0" />
    }
  }

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-safe/40 bg-surface-card'
      case 'warning':
        return 'border-warning/40 bg-surface-card'
      case 'error':
        return 'border-critical/40 bg-surface-card'
      case 'info':
      default:
        return 'border-primary/40 bg-surface-card'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-glass backdrop-blur-md transition-all duration-300 animate-slide-in text-sm text-slate-100 ${getBorderColor(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <p className="flex-1 font-medium leading-relaxed">{toast.text}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
