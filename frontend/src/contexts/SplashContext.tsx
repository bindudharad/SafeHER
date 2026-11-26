import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { useAuth } from './AuthContext'
import { SAFEHER_LOGO_SRC } from '../components/common/SafeHERLogo'

export type SplashPhase = 'entering' | 'loading' | 'travelling' | 'done' | 'error'

interface SplashContextValue {
  splashPhase: SplashPhase
  isSplashActive: boolean
  headerLogoHidden: boolean
  initError: string | null
  registerLogoTarget: (el: HTMLElement | null) => void
  getLogoTargetRect: () => DOMRect | null
  markTravelComplete: () => void
  retryInit: () => void
}

const SplashContext = createContext<SplashContextValue | null>(null)

export const SplashProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isLoading: authLoading } = useAuth()
  const [splashPhase, setSplashPhase] = useState<SplashPhase>('entering')
  const [initError, setInitError] = useState<string | null>(null)
  const [assetsReady, setAssetsReady] = useState(false)
  const [minDelayPassed, setMinDelayPassed] = useState(false)
  const targetElRef = useRef<HTMLElement | null>(null)

  const registerLogoTarget = useCallback((el: HTMLElement | null) => {
    if (el) {
      targetElRef.current = el
    }
  }, [])

  const getLogoTargetRect = useCallback((): DOMRect | null => {
    const el = targetElRef.current
    if (!el || !el.isConnected) return null
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return rect
  }, [])

  const runAssetPreload = useCallback(async () => {
    setInitError(null)
    try {
      const logoPromise = new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.src = SAFEHER_LOGO_SRC
        if (img.complete) {
          resolve()
          return
        }
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load brand emblem asset.'))
      })

      const fontsPromise =
        typeof document !== 'undefined' && document.fonts?.ready
          ? document.fonts.ready.then(() => undefined)
          : Promise.resolve()

      await Promise.all([logoPromise, fontsPromise])
      setAssetsReady(true)
    } catch (err) {
      setInitError(
        err instanceof Error ? err.message : 'Unable to initialize SafeHER.'
      )
      setSplashPhase('error')
    }
  }, [])

  // Initial asset + font readiness
  useEffect(() => {
    runAssetPreload()
  }, [runAssetPreload])

  // Brief minimum entrance window so Stage 1 & 2 are smooth, never flashing
  useEffect(() => {
    const t1 = setTimeout(() => {
      setSplashPhase((prev) => (prev === 'entering' ? 'loading' : prev))
    }, 220)
    const t2 = setTimeout(() => {
      setMinDelayPassed(true)
    }, 750)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // Trigger Stage 3 (travel) once actual app initialization + assets are ready
  useEffect(() => {
    if (
      (splashPhase === 'entering' || splashPhase === 'loading') &&
      !authLoading &&
      assetsReady &&
      minDelayPassed
    ) {
      setSplashPhase('travelling')
    }
  }, [splashPhase, authLoading, assetsReady, minDelayPassed])

  // Hard safety guard: never let splash stay stuck indefinitely
  useEffect(() => {
    if (splashPhase === 'done' || splashPhase === 'error') return
    const guard = setTimeout(() => {
      setSplashPhase('done')
    }, 8000)
    return () => clearTimeout(guard)
  }, [splashPhase])

  const markTravelComplete = useCallback(() => {
    setSplashPhase('done')
  }, [])

  const retryInit = useCallback(() => {
    setAssetsReady(false)
    setMinDelayPassed(false)
    setSplashPhase('entering')
    runAssetPreload()
    setTimeout(() => setMinDelayPassed(true), 600)
  }, [runAssetPreload])

  const isSplashActive = splashPhase !== 'done'
  const headerLogoHidden =
    splashPhase === 'entering' ||
    splashPhase === 'loading' ||
    splashPhase === 'travelling'

  return (
    <SplashContext.Provider
      value={{
        splashPhase,
        isSplashActive,
        headerLogoHidden,
        initError,
        registerLogoTarget,
        getLogoTargetRect,
        markTravelComplete,
        retryInit,
      }}
    >
      {children}
    </SplashContext.Provider>
  )
}

export const useSplash = (): SplashContextValue => {
  const ctx = useContext(SplashContext)
  if (!ctx) {
    return {
      splashPhase: 'done',
      isSplashActive: false,
      headerLogoHidden: false,
      initError: null,
      registerLogoTarget: () => {},
      getLogoTargetRect: () => null,
      markTravelComplete: () => {},
      retryInit: () => {},
    }
  }
  return ctx
}
