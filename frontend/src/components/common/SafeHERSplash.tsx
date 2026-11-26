import React, { useEffect, useRef } from 'react'
import { gsap } from '../../animations/gsap'
import { useSplash } from '../../contexts/SplashContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { SAFEHER_LOGO_SRC } from './SafeHERLogo'

/**
 * SafeHERSplash:
 * Cinematic Midnight Aurora splash-to-header logo transition.
 * Stage 1: Center emblem entrance + orbital ring + ambient violet glow.
 * Stage 2: Smooth loading indicator while Auth & Assets initialize.
 * Stage 3: GSAP FLIP-style travel to the measured top-left header logo position.
 * Stage 4: Seamless handoff to the permanent header logo.
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

  // Stage 1: Initial center entrance animation
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

  // Stage 3: FLIP-style travel from center to measured header destination
  useEffect(() => {
    if (splashPhase !== 'travelling' || hasTravelledRef.current) return
    hasTravelledRef.current = true

    // Reduced motion: brief fade out without travel animation
    if (reducedMotion) {
      const tl = gsap.timeline({
        onComplete: () => markTravelComplete(),
      })
      tl.to(
        [backdropRef.current, logoWrapRef.current, textBlockRef.current],
        {
          opacity: 0,
          duration: 0.28,
          ease: 'power2.out',
        }
      )
      return () => {
        tl.kill()
      }
    }

    const logoEl = logoWrapRef.current
    const targetRect = getLogoTargetRect()

    if (!logoEl || !targetRect) {
      // Fallback smooth fade if header target is not mounted on current view
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

    // 1. Fade out orbital ring & loading text
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

    // 2. Soften ambient glow behind logo
    tl.to(
      glowRef.current,
      {
        opacity: 0,
        scale: 0.6,
        duration: 0.45,
        ease: 'power2.out',
      },
      0.05
    )

    // 3. Reveal website underneath by fading Midnight Aurora backdrop
    tl.to(
      backdropRef.current,
      {
        opacity: 0,
        duration: 0.62,
        ease: 'power2.inOut',
      },
      0.14
    )

    // 4. Smoothly fly the single official SafeHER logo to exact top-left header coordinates
    tl.to(
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
      {/* Full-screen Midnight Aurora backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-[#080B18]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(101, 0, 184, 0.22) 0%, rgba(139, 124, 255, 0.08) 45%, rgba(8, 11, 24, 1) 80%)',
        }}
      />

      {/* Centered Logo + Orbital Ring + Loading Indicator */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44">
          {/* Gentle Violet Ambient Glow */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0 rounded-full bg-[#8B7CFF]/25 blur-2xl"
          />

          {/* Subtle Animated Circular Orbital Ring */}
          <div
            ref={orbitalRef}
            className="pointer-events-none absolute -inset-3 rounded-full border border-[#8B7CFF]/35"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(139,124,255,0.65) 0deg, rgba(85,214,232,0.45) 75deg, transparent 140deg, transparent 360deg)',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 1px))',
            }}
          />

          {/* Single Official SafeHER Logo Element (Travels to Header) */}
          <div
            ref={logoWrapRef}
            className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center drop-shadow-[0_0_24px_rgba(139,124,255,0.35)]"
            style={{ transformOrigin: 'center center' }}
          >
            <img
              src={SAFEHER_LOGO_SRC}
              alt="SafeHER Official Shield Emblem"
              className="w-full h-full object-contain rounded-full block"
              draggable={false}
            />
          </div>
        </div>

        {/* Title, Status Message & Loading Bar (or Error Retry) */}
        <div ref={textBlockRef} className="mt-6 space-y-3 max-w-xs">
          <h2 className="font-['thunderLC',sans-serif] text-2xl sm:text-3xl font-bold tracking-[0.22em] text-[#F4F5FF]">
            SAFEHER
          </h2>

          {splashPhase === 'error' ? (
            <div className="space-y-3">
              <p className="text-xs text-[#FF718A] font-mono">
                {initError || 'Initialization encountered an issue.'}
              </p>
              <button
                type="button"
                onClick={retryInit}
                className="px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#A99BFF] text-[#080B18] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Retry Initialization
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-mono text-[#A6AEC8] tracking-wide">
                Preparing your digital safety experience...
              </p>

              {/* Refined Violet & Ice-Cyan Loading Indicator */}
              <div className="w-44 h-1 mx-auto rounded-full bg-[#0D1224] border border-[#A6AEC8]/15 overflow-hidden">
                <div
                  className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#6500B8] via-[#8B7CFF] to-[#55D6E8] animate-[splashSlide_1.2s_ease-in-out_infinite]"
                />
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
