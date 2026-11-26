import React, { useEffect, useCallback, useRef } from 'react'
import { LogOut } from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { Tooltip } from '../common/Tooltip'

export const NEUTRAL_REDIRECT_URL = 'https://www.weather.com'

let globalExitInProgress = false
let globalExitTimer: ReturnType<typeof setTimeout> | null = null

export function resetQuickExitLock(): void {
  globalExitInProgress = false
  if (globalExitTimer) {
    clearTimeout(globalExitTimer)
    globalExitTimer = null
  }
}

export function performQuickExit(): void {
  if (globalExitInProgress) return
  globalExitInProgress = true
  // Safety reset in case navigation is mocked/blocked in unit tests
  globalExitTimer = setTimeout(() => {
    globalExitInProgress = false
    globalExitTimer = null
  }, 1500)

  // Same-tab navigation only (never window.open); replaces current history entry
  window.location.replace(NEUTRAL_REDIRECT_URL)
}

export const QuickExitButton: React.FC = () => {
  const { t } = useI18n()
  const localTriggeredRef = useRef(false)

  const handleQuickExit = useCallback(() => {
    if (localTriggeredRef.current) return
    localTriggeredRef.current = true
    performQuickExit()
    setTimeout(() => {
      localTriggeredRef.current = false
    }, 1500)
  }, [])

  // Synchronized global Alt + Q listener (works across all SafeHER routes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (!e.altKey || e.ctrlKey || e.metaKey) return

      const isQ = e.code === 'KeyQ' || e.key.toLowerCase() === 'q'
      if (isQ) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation?.()
        handleQuickExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [handleQuickExit])

  return (
    <Tooltip content={t.quickExitTooltip}>
      <button
        type="button"
        onClick={handleQuickExit}
        data-testid="quick-exit-button"
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-medium text-xs rounded-xl shadow-critical-glow hover:shadow-lg transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-400 whitespace-nowrap shrink-0"
        aria-label={t.quickExitAria || t.quickExitTooltip}
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        <span className="sm:hidden">{t.quickExit.replace(/\s*\(Alt\s*\+\s*Q\)/i, '')}</span>
        <span className="hidden sm:inline">{t.quickExit}</span>
      </button>
    </Tooltip>
  )
}
