import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight, ShieldCheck } from 'lucide-react'
import { useOptionalI18n } from '../../contexts/I18nContext'

interface IntroModalProps {
  onExplore?: () => void
}

export const IntroModal: React.FC<IntroModalProps> = ({ onExplore }) => {
  const { t } = useOptionalI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Only show if not previously dismissed in current browser session
    const dismissed = sessionStorage.getItem('safeher_intro_dismissed')
    if (!dismissed) {
      // Small timeout to allow initial DOM paint before animating in
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 180)
      return () => clearTimeout(timer)
    }
  }, [])

  // Keyboard accessibility: ESC key dismisses
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleDismiss = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      sessionStorage.setItem('safeher_intro_dismissed', 'true')
    }, 350)
  }

  const handleCTA = () => {
    handleDismiss()
    if (onExplore) {
      onExplore()
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Modal Container */}
      <div
        className={`relative w-full max-w-[460px] bg-[#070908]/95 border border-zcyan/40 rounded-2xl p-7 sm:p-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(0,212,255,0.22)] backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isClosing ? 'scale-95 translate-y-6 opacity-0' : 'scale-100 translate-y-0 opacity-100'
        }`}
      >
        {/* Subtle radial cyan glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-zcyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-zcyan/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button Top-Right */}
        <button
          onClick={handleDismiss}
          aria-label={t.landing.introModal.closeAria}
          className="absolute top-4 right-4 p-2 text-[#929b93] hover:text-white rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zcyan"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Circular Aurora Logo Element with Pulse */}
        <div className="mx-auto w-14 h-14 rounded-full bg-zcyan/10 border border-zcyan/60 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(139,124,255,0.35)] relative">
          <span className="w-3 h-3 rounded-full bg-zcyan animate-ping absolute opacity-75" />
          <span className="w-3.5 h-3.5 rounded-full bg-zcyan shadow-[0_0_12px_#d5ff54]" />
        </div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zcharcoal border border-zcyan/30 text-[11px] font-mono font-bold uppercase tracking-widest text-zcyan mb-3">
          <ShieldCheck className="w-3 h-3" />
          <span>{t.landing.introModal.eyebrow}</span>
        </div>

        {/* Heading in thunderLC */}
        <h3
          id="modal-title"
          className="font-display text-4xl sm:text-5xl font-bold uppercase text-white tracking-tight leading-none mb-3"
        >
          {t.landing.introModal.title}
        </h3>

        {/* Supporting Copy */}
        <p className="text-sm text-ztext-variant leading-relaxed mb-6 font-sans">
          {t.landing.introModal.body}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/incidents/new" onClick={handleDismiss} className="block w-full">
            <button className="button-bracket w-full py-3.5 text-base flex items-center justify-center gap-2 group">
              <span>[ {t.landing.introModal.cta} ]</span>
              <ArrowRight className="w-4 h-4 text-zcyan group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

          <button
            onClick={handleCTA}
            className="text-xs font-mono tracking-wider text-ztext-muted hover:text-zcyan uppercase transition-colors py-1"
          >
            {t.landing.introModal.explore}
          </button>
        </div>
      </div>
    </div>
  )
}
