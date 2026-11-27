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
  globalExitTimer = setTimeout(() => {
    globalExitInProgress = false
    globalExitTimer = null
  }, 1500)

  try {
    sessionStorage.clear()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('safeher_auth_token')
  } catch {
    // ignore in sandboxed environments
  }

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
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[34px] bg-[#ff927e]/15 hover:bg-[#ff927e] text-[#ff927e] hover:text-[#170907] border border-[#ff927e]/45 font-mono uppercase tracking-[0.08em] font-semibold text-[10px] rounded-[3px] transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff927e] whitespace-nowrap shrink-0"
        aria-label={t.quickExitAria || t.quickExitTooltip}
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        <span className="sm:hidden">{t.quickExit.replace(/\s*\(Alt\s*\+\s*Q\)/i, '')}</span>
        <span className="hidden sm:inline">{t.quickExit}</span>
      </button>
    </Tooltip>
  )
}
