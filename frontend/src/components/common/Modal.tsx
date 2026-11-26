import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation()
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B18]/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          'w-full bg-[#171D35] border border-[#A6AEC8]/20 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden text-left animate-slide-up flex flex-col max-h-[90vh]',
          sizeClasses[size]
        )}
      >
        <div className="flex items-start justify-between p-6 border-b border-[#A6AEC8]/15 bg-[#171D35]/80">
          <div className="space-y-1">
            <h2 id="modal-title" className="text-lg font-bold text-[#F4F5FF] tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-xs text-[#A6AEC8] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A6AEC8] hover:text-[#F4F5FF] hover:bg-[#1D2540] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]/50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#A6AEC8]">
          {children}
        </div>
      </div>
    </div>
  )
}
