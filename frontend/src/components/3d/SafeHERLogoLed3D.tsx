import React, { useEffect, useRef, useState } from 'react'
import { SAFEHER_LOGO_SRC } from '../common/SafeHERLogo'
import { createLedRingRenderer } from './logo-led/led-ring-renderer'

interface SafeHERLogoLed3DProps {
  className?: string
}

/**
 * Central 3D SafeHER Official Logo Medallion surrounded by an interactive
 * WebGPU Circular LED Light System (with lightweight SVG/CSS LED fallback).
 */
export const SafeHERLogoLed3D: React.FC<SafeHERLogoLed3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webGpuReady, setWebGpuReady] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && 'gpu' in navigator
  })

  // Initialize vgpu WebGPU circular LED ring renderer
  useEffect(() => {
    if (!webGpuReady) return
    const canvas = canvasRef.current
    if (!canvas) return

    let active = true
    const renderer = createLedRingRenderer(canvas)
    void renderer.ready.catch(() => {
      if (active) {
        setWebGpuReady(false)
      }
    })

    return () => {
      active = false
      renderer.dispose()
    }
  }, [webGpuReady])

  // Subtle 3D medallion tilt + parallax (zero React state updates on pointermove)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onPointerMove = (e: PointerEvent) => {
      if (!e.isPrimary || prefersReducedMotion) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      el.style.setProperty('--led-rx', `${(-ny * 9).toFixed(2)}deg`)
      el.style.setProperty('--led-ry', `${(nx * 11).toFixed(2)}deg`)
      el.style.setProperty('--led-px', `${(nx * 6).toFixed(1)}px`)
      el.style.setProperty('--led-py', `${(ny * 6).toFixed(1)}px`)
    }

    const onPointerLeave = () => {
      el.style.setProperty('--led-rx', '0deg')
      el.style.setProperty('--led-ry', '0deg')
      el.style.setProperty('--led-px', '0px')
      el.style.setProperty('--led-py', '0px')
    }

    el.addEventListener('pointermove', onPointerMove, { passive: true })
    el.addEventListener('pointerdown', onPointerMove, { passive: true })
    el.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('pointercancel', onPointerLeave)

    return () => {
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerdown', onPointerMove)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.removeEventListener('pointercancel', onPointerLeave)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={
        {
          '--led-rx': '0deg',
          '--led-ry': '0deg',
          '--led-px': '0px',
          '--led-py': '0px',
        } as React.CSSProperties
      }
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
      aria-label="SafeHER Official 3D Logo with Circular LED Illumination"
    >
      {/* Layer 1: Large Translucent SAFEHER Brand Watermark */}
      <div
        className="pointer-events-none select-none absolute inset-0 z-0 flex items-center justify-center overflow-visible"
        aria-hidden="true"
      >
        <span
          className="font-display font-extrabold uppercase tracking-[0.22em] sm:tracking-[0.28em] text-[3.2rem] sm:text-[6.2rem] md:text-[8.2rem] lg:text-[9.8rem] leading-none whitespace-nowrap text-[#8B7CFF]/[0.11] animate-[pulse_7s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            textShadow: '0 0 38px rgba(139, 124, 255, 0.24), 0 0 12px rgba(85, 214, 232, 0.12)',
            WebkitTextStroke: '1px rgba(169, 155, 255, 0.14)',
          }}
        >
          SAFEHER
        </span>
      </div>

      {/* Layer A: Ambient Midnight Aurora Backlight */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="w-56 h-56 sm:w-64 sm:h-64 rounded-full blur-2xl opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(139, 124, 255, 0.42) 0%, rgba(101, 0, 184, 0.25) 45%, rgba(85, 214, 232, 0.12) 70%, transparent 100%)',
          }}
        />
      </div>

      {/* Layer B: WebGPU Circular LED Light System OR Lightweight SVG LED Fallback */}
      {webGpuReady ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-[2] block w-full h-full touch-none"
          aria-hidden="true"
        />
      ) : (
        <svg
          viewBox="0 0 320 320"
          className="pointer-events-none absolute inset-0 z-[2] w-full h-full"
          aria-hidden="true"
          style={{
            transform: 'translate3d(var(--led-px), var(--led-py), 0)',
            transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <defs>
            <linearGradient id="led-violet-trail" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B7CFF" stopOpacity="0" />
              <stop offset="55%" stopColor="#8B7CFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#F4F5FF" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="led-cyan-trail" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#55D6E8" stopOpacity="0" />
              <stop offset="65%" stopColor="#55D6E8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#52D6B2" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Segmented precision LED array ring */}
          <circle
            cx="160"
            cy="160"
            r="128"
            fill="none"
            stroke="#8B7CFF"
            strokeOpacity="0.28"
            strokeWidth="1.5"
            strokeDasharray="6 10"
            className="origin-center animate-[spin_28s_linear_infinite] motion-reduce:animate-none"
          />

          {/* Outer concentric static ring */}
          <circle
            cx="160"
            cy="160"
            r="116"
            fill="none"
            stroke="#8B7CFF"
            strokeOpacity="0.24"
            strokeWidth="1.2"
          />
          {/* Outer slow violet travelling arc */}
          <circle
            cx="160"
            cy="160"
            r="116"
            fill="none"
            stroke="url(#led-violet-trail)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="125 605"
            className="origin-center animate-[spin_8.5s_linear_infinite] motion-reduce:animate-none"
          />

          {/* Main circular LED ring */}
          <circle
            cx="160"
            cy="160"
            r="96"
            fill="none"
            stroke="#8B7CFF"
            strokeOpacity="0.38"
            strokeWidth="2.2"
          />
          {/* Main travelling violet LED trail */}
          <circle
            cx="160"
            cy="160"
            r="96"
            fill="none"
            stroke="url(#led-violet-trail)"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeDasharray="150 455"
            className="origin-center animate-[spin_5.2s_linear_infinite] motion-reduce:animate-none"
          />
          {/* Secondary opposing cyan pulse on main ring */}
          <circle
            cx="160"
            cy="160"
            r="96"
            fill="none"
            stroke="url(#led-cyan-trail)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeDasharray="72 533"
            className="origin-center animate-[spin_7.5s_linear_infinite_reverse] motion-reduce:animate-none"
          />

          {/* Inner counter-rotating Ice Cyan LED ring */}
          <circle
            cx="160"
            cy="160"
            r="79"
            fill="none"
            stroke="#55D6E8"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <circle
            cx="160"
            cy="160"
            r="79"
            fill="none"
            stroke="url(#led-cyan-trail)"
            strokeWidth="3.0"
            strokeLinecap="round"
            strokeDasharray="105 395"
            className="origin-center animate-[spin_6.8s_linear_infinite_reverse] motion-reduce:animate-none"
          />
        </svg>
      )}

      {/* Layer C: Central 3D SafeHER Official Logo Medallion */}
      <div
        className="pointer-events-none relative z-10 flex items-center justify-center rounded-full p-[3px] shadow-[0_18px_42px_rgba(8,11,24,0.85),0_0_28px_rgba(139,124,255,0.45),0_0_16px_rgba(85,214,232,0.22)]"
        style={{
          transform: 'perspective(900px) rotateX(var(--led-rx)) rotateY(var(--led-ry))',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          background:
            'linear-gradient(135deg, rgba(244, 245, 255, 0.55) 0%, rgba(139, 124, 255, 0.7) 45%, rgba(85, 214, 232, 0.55) 100%)',
        }}
      >
        {/* 3D Metallic Medallion Rim */}
        <div className="relative rounded-full bg-[#0D1224] p-1.5 shadow-[inset_0_2px_6px_rgba(244,245,255,0.28),inset_0_-3px_8px_rgba(8,11,24,0.9)]">
          <img
            src={SAFEHER_LOGO_SRC}
            alt="SafeHER Official Shield Emblem"
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-contain block"
          />
          {/* Subtle glass specular sheen */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(244, 245, 255, 0.16) 0%, transparent 45%, rgba(139, 124, 255, 0.08) 100%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
