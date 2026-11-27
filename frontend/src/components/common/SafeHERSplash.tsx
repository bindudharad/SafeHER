import React, { useEffect, useRef } from 'react'
import { gsap } from '../../animations/gsap'
import { useSplash } from '../../contexts/SplashContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { SafeHERLogo } from './SafeHERLogo'

/**
 * SafeHERSplash:
 * Unified #070908 + #d5ff54 splash entrance transitioning smoothly to the header brand mark.
 */
export const SafeHERSplash: React.FC = () => {
  const {
    splashPhase,
    isSplashActive,
    initError,
    getLogoTargetRect,
    markTravelComplete,
    retryInit,
  } = useSplash()
  const reducedMotion = useReducedMotion()

  const backdropRef = useRef<HTMLDivElement>(null)
  const logoWrapRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const orbitalRef = useRef<HTMLDivElement>(null)
  const textBlockRef = useRef<HTMLDivElement>(null)
  const hasTravelledRef = useRef(false)

  useEffect(() => {
    if (!isSplashActive || splashPhase === 'error') return
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      if (logoWrapRef.current) {
        gsap.fromTo(
          logoWrapRef.current,
          { opacity: 0, scale: 0.84 },
          { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' }
        )
      }
      if (textBlockRef.current) {
        gsap.fromTo(
          textBlockRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.5, delay: 0.12, ease: 'power2.out' }
        )
      }
      if (orbitalRef.current) {
        gsap.to(orbitalRef.current, {
          rotation: 360,
          duration: 10,
          repeat: -1,
          ease: 'none',
        })
      }
    })

    return () => ctx.revert()
  }, [isSplashActive, splashPhase, reducedMotion])

  useEffect(() => {
    if (splashPhase !== 'travelling' || hasTravelledRef.current) return
    hasTravelledRef.current = true

    if (reducedMotion) {
      const tl = gsap.timeline({
        onComplete: () => markTravelComplete(),
      })
      tl.to([backdropRef.current, logoWrapRef.current, textBlockRef.current], {
        opacity: 0,
        duration: 0.28,
        ease: 'power2.out',
      })
      return () => {
        tl.kill()
      }
    }

    const logoEl = logoWrapRef.current
    const targetRect = getLogoTargetRect()

    if (!logoEl || !targetRect) {
      const tl = gsap.timeline({
        onComplete: () => markTravelComplete(),
      })
      tl.to([textBlockRef.current, orbitalRef.current, glowRef.current], {
        opacity: 0,
        duration: 0.25,
      }).to(
        [backdropRef.current, logoEl],
        {
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
        },
        '-=0.1'
      )
      return () => {
        tl.kill()
      }
    }

    const startRect = logoEl.getBoundingClientRect()
    const startCenterX = startRect.left + startRect.width / 2
    const startCenterY = startRect.top + startRect.height / 2
    const targetCenterX = targetRect.left + targetRect.width / 2
    const targetCenterY = targetRect.top + targetRect.height / 2

    const deltaX = targetCenterX - startCenterX
    const deltaY = targetCenterY - startCenterY
    const targetScale = Math.max(0.2, targetRect.width / startRect.width)

    const tl = gsap.timeline({
      onComplete: () => {
        markTravelComplete()
      },
    })

    tl.to(
      [textBlockRef.current, orbitalRef.current],
      {
        opacity: 0,
        y: 8,
        duration: 0.26,
        ease: 'power2.out',
      },
      0
    )
      .to(
        glowRef.current,
        {
          opacity: 0,
          scale: 0.6,
          duration: 0.45,
          ease: 'power2.out',
        },
        0.05
      )
      .to(
        backdropRef.current,
        {
          opacity: 0,
          duration: 0.62,
          ease: 'power2.inOut',
        },
        0.14
      )
      .to(
        logoEl,
        {
          x: deltaX,
          y: deltaY,
          scale: targetScale,
          duration: 0.78,
          ease: 'power3.inOut',
          force3D: true,
        },
        0.08
      )

    return () => {
      tl.kill()
    }
  }, [splashPhase, reducedMotion, getLogoTargetRect, markTravelComplete])

  if (!isSplashActive) return null

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-auto flex items-center justify-center overflow-hidden select-none"
      role="status"
      aria-live="polite"
      aria-label="SafeHER application loading"
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-[#070908]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(213, 255, 84, 0.10) 0%, rgba(168, 219, 53, 0.04) 45%, rgba(7, 9, 8, 1) 80%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44">
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0 rounded-full bg-[#d5ff54]/15 blur-2xl"
          />

          <div
            ref={orbitalRef}
            className="pointer-events-none absolute -inset-3 rounded-full border border-[#d5ff54]/30"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(213,255,84,0.72) 0deg, rgba(168,219,53,0.35) 75deg, transparent 140deg, transparent 360deg)',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
            }}
          />

          <div
            ref={logoWrapRef}
            className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center drop-shadow-[0_0_24px_rgba(213,255,84,0.22)]"
            style={{ transformOrigin: 'center center' }}
          >
            <SafeHERLogo size="xl" glow={false} className="w-full h-full" />
          </div>
        </div>

        <div ref={textBlockRef} className="mt-6 space-y-3 max-w-xs">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-[0.14em] text-[#f0f2eb]">
            SAFEHER
          </h2>

          {splashPhase === 'error' ? (
            <div className="space-y-3">
              <p className="text-xs text-[#ff927e] font-mono">
                {initError || 'Initialization encountered an issue.'}
              </p>
              <button
                type="button"
                onClick={retryInit}
                className="px-4 py-2 rounded-[3px] bg-[#d5ff54] hover:bg-[#e2ff84] text-[#080a08] text-xs font-mono font-semibold uppercase tracking-[0.12em] transition-colors"
              >
                Retry Initialization
              </button>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-mono text-[#929b93] tracking-[0.12em] uppercase">
                Preparing your digital safety experience...
              </p>

              <div className="w-44 h-1 mx-auto rounded-full bg-[#0d1110] border border-[rgba(225,239,221,0.15)] overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#a8db35] via-[#d5ff54] to-[#f0f2eb] animate-[splashSlide_1.2s_ease-in-out_infinite]" />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes splashSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  )
}
