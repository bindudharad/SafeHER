import React, { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../animations/gsap'
import { MarqueeBand } from './MarqueeBand'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export const CircularRevealManifesto: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const circleLayerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !containerRef.current || !circleLayerRef.current) return

    // GSAP context for safe React lifecycle mounting and unmounting
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4,
        onUpdate: (self) => {
          const progress = self.progress // 0 to 1
          if (circleLayerRef.current) {
            // Expand circle from 0% at center to 150% (covering the entire screen)
            const percent = progress * 150
            circleLayerRef.current.style.clipPath = `circle(${percent}% at 50% 50%)`
          }
        },
      })
    }, containerRef)

    return () => {
      ctx.revert()
    }
  }, [reducedMotion])

  const manifestoText = (
    <div className="max-w-[1280px] mx-auto text-center px-4 sm:px-8 py-8 sm:py-12">
      <div className="font-mono text-xs sm:text-sm text-zcyan uppercase tracking-[0.2em] mb-6">
        TRUST CANNOT BE ASSUMED. IT MUST BE CONTINUOUSLY VERIFIED.
      </div>
      <div className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[88px] font-bold uppercase tracking-tight leading-[0.94] space-y-2">
        <div className="reveal-line">YOUR SAFETY</div>
        <div className="reveal-line sm:pl-12">SHOULD NOT DEPEND</div>
        <div className="reveal-line text-zcyan">ON WHAT YOU REMEMBER.</div>
        <div className="pt-6 sm:pt-10 reveal-line">A CLEAR RECORD</div>
        <div className="reveal-line sm:pr-12">CAN HELP YOU</div>
        <div className="reveal-line text-zcyan">TAKE THE NEXT STEP.</div>
      </div>
    </div>
  )

  const manifestoTextInverted = (
    <div className="max-w-[1280px] mx-auto text-center px-4 sm:px-8 py-8 sm:py-12">
      <div className="font-mono text-xs sm:text-sm text-black font-bold uppercase tracking-[0.2em] mb-6">
        TRUST CANNOT BE ASSUMED. IT MUST BE CONTINUOUSLY VERIFIED.
      </div>
      <div className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[88px] font-bold uppercase tracking-tight leading-[0.94] space-y-2 text-black">
        <div className="reveal-line">YOUR SAFETY</div>
        <div className="reveal-line sm:pl-12">SHOULD NOT DEPEND</div>
        <div className="reveal-line font-black">ON WHAT YOU REMEMBER.</div>
        <div className="pt-6 sm:pt-10 reveal-line">A CLEAR RECORD</div>
        <div className="reveal-line sm:pr-12">CAN HELP YOU</div>
        <div className="reveal-line font-black">TAKE THE NEXT STEP.</div>
      </div>
    </div>
  )

  return (
    <section
      ref={containerRef}
      id="manifesto"
      className="relative w-full h-[180vh] sm:h-[230vh] bg-black"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 w-full h-screen overflow-hidden flex flex-col justify-between z-10 bg-black">
        {/* Top Continuous Marquee */}
        <MarqueeBand
          direction="left"
          speed="slow"
          items={[
            'TRUST CANNOT BE ASSUMED. IT MUST BE CRYPTOGRAPHICALLY PROVEN',
            'SOVEREIGN CITIZEN DEFENSE INFRASTRUCTURE',
            'ZERO-KNOWLEDGE DIGITAL EVIDENCE RETENTION',
            'SECTION 65B INDIAN EVIDENCE ACT COMPLIANCE',
          ]}
        />

        {/* Center Text Composition Area */}
        <div className="relative flex-1 flex items-center justify-center w-full overflow-hidden">
          {/* Layer 1: Dark Base Layer (Muted Slate / Charcoal on Black) */}
          <div className="w-full text-[#1c241d] select-none">
            {manifestoText}
          </div>

          {/* Layer 2: Expanding Cyan Circular Reveal Layer (Synchronized Overlay) */}
          <div
            ref={circleLayerRef}
            className="absolute inset-0 w-full h-full flex items-center justify-center bg-zcyan select-none pointer-events-none transition-[clip-path] ease-out"
            style={{
              clipPath: reducedMotion ? 'circle(100% at 50% 50%)' : 'circle(0% at 50% 50%)',
              willChange: 'clip-path',
            }}
          >
            {manifestoTextInverted}
          </div>
        </div>

        {/* Bottom Continuous Marquee (Opposing Direction) */}
        <MarqueeBand
          direction="right"
          speed="slow"
          items={[
            'EVIDENCE INTEGRITY PRESERVED UNDER DPDP ACT 2023',
            'TAMPER-EVIDENT SHA-256 CLIENT SIGNATURES',
            'AUTONOMOUS MULTI-MODAL SYNTHETIC MEDIA DETECTION',
            'HUMAN-IN-THE-LOOP REPORTING DISPATCH',
          ]}
        />
      </div>
    </section>
  )
}
