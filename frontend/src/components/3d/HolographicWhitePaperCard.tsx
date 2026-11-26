import React, { useEffect, useRef, useState } from 'react'
import { createRenderer } from './holographic-card/renderer'

interface HolographicWhitePaperCardProps {
  className?: string
}

/**
 * Interactive WebGPU Holographic White Paper Cover powered by the official vgpu
 * Holographic Card shader/renderer, layered beneath SafeHER's White Paper cover
 * typography. Falls back to a GPU-accelerated Midnight Aurora holographic tilt
 * surface when WebGPU is unavailable, without React state updates on pointermove.
 */
export const HolographicWhitePaperCard: React.FC<HolographicWhitePaperCardProps> = ({
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webGpuReady, setWebGpuReady] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && 'gpu' in navigator
  })

  // Initialize official vgpu Holographic Card WebGPU renderer
  useEffect(() => {
    if (!webGpuReady) return
    const canvas = canvasRef.current
    if (!canvas) return

    let mounted = true
    const renderer = createRenderer(canvas)
    void renderer.ready.catch(() => {
      if (mounted) {
        setWebGpuReady(false)
      }
    })

    return () => {
      mounted = false
      renderer.dispose()
    }
  }, [webGpuReady])

  // Lightweight CSS 3D tilt + holographic glare (zero React re-renders on pointermove)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const updateFromPointer = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1 // -1..1
      const ny = ((clientY - rect.top) / rect.height) * 2 - 1 // -1..1
      const gx = ((clientX - rect.left) / rect.width) * 100
      const gy = ((clientY - rect.top) / rect.height) * 100

      if (!prefersReducedMotion) {
        el.style.setProperty('--wp-rx', `${(-ny * 8).toFixed(2)}deg`)
        el.style.setProperty('--wp-ry', `${(nx * 10).toFixed(2)}deg`)
      }
      el.style.setProperty('--wp-gx', `${gx.toFixed(1)}%`)
      el.style.setProperty('--wp-gy', `${gy.toFixed(1)}%`)
      el.style.setProperty('--wp-hover', '1')
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!e.isPrimary) return
      updateFromPointer(e.clientX, e.clientY)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) return
      updateFromPointer(e.clientX, e.clientY)
    }

    const onPointerLeave = () => {
      el.style.setProperty('--wp-rx', '0deg')
      el.style.setProperty('--wp-ry', '0deg')
      el.style.setProperty('--wp-hover', '0')
    }

    el.addEventListener('pointermove', onPointerMove, { passive: true })
    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    el.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('pointercancel', onPointerLeave)

    return () => {
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.removeEventListener('pointercancel', onPointerLeave)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={
        {
          '--wp-rx': '0deg',
          '--wp-ry': '0deg',
          '--wp-gx': '35%',
          '--wp-gy': '28%',
          '--wp-hover': '0',
          transform: 'perspective(900px) rotateX(var(--wp-rx)) rotateY(var(--wp-ry))',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        } as React.CSSProperties
      }
      className={`relative w-full h-full rounded-[inherit] overflow-hidden bg-[#0D1224] will-change-transform ${className}`}
    >
      {/* Official vgpu WebGPU Holographic Card Canvas */}
      {webGpuReady && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full touch-none opacity-80"
          aria-label="Interactive WebGPU Holographic White Paper Cover"
        />
      )}

      {/* Midnight Aurora Reflective Foil & Glare Layer (enhances WebGPU & serves as fallback) */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle 220px at var(--wp-gx) var(--wp-gy), rgba(85, 214, 232, 0.28) 0%, rgba(139, 124, 255, 0.24) 38%, rgba(101, 0, 184, 0.14) 65%, transparent 100%)',
        }}
      />

      {/* Subtle Engraved Foil Diffraction Lines & Specular Sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(128deg, rgba(169, 155, 255, 0.14) 0px, rgba(169, 155, 255, 0.14) 1px, transparent 1px, transparent 9px)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background:
            'linear-gradient(135deg, rgba(244, 245, 255, 0.10) 0%, transparent 36%, rgba(85, 214, 232, 0.08) 68%, transparent 100%)',
        }}
      />

      {/* Subtle Iridescent Border & Silver-Violet Edge Sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[#A99BFF]/35"
        style={{
          boxShadow:
            'inset 0 1px 0 rgba(244, 245, 255, 0.26), inset 0 0 28px rgba(139, 124, 255, 0.16)',
        }}
      />

      {/* Preserved SafeHER White Paper Cover Typography */}
      <div className="pointer-events-none relative z-10 w-full h-full p-4 sm:p-8 flex flex-col justify-between text-left">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between font-mono text-[9px] sm:text-[11px] tracking-[0.18em] uppercase">
            <span className="text-[#55D6E8] font-semibold whitespace-nowrap">WHITE PAPER</span>
            <span className="text-[#A6AEC8] whitespace-nowrap">2026 ED.</span>
          </div>

          <div className="space-y-2 sm:space-y-2.5">
            <div className="h-[2.5px] w-4/5 rounded-full bg-gradient-to-r from-[#8B7CFF] via-[#55D6E8]/80 to-transparent" />
            <div className="h-[2.5px] w-3/5 rounded-full bg-gradient-to-r from-[#A99BFF]/80 to-transparent" />
            <div className="h-[2.5px] w-3/4 rounded-full bg-gradient-to-r from-[#55D6E8]/75 to-transparent" />
            <div className="h-[2.5px] w-1/2 rounded-full bg-gradient-to-r from-[#8B7CFF]/65 to-transparent" />
          </div>
        </div>

        {/* Subtle Engraved Geometric Crest Watermark */}
        <div className="my-auto flex items-center justify-center opacity-20">
          <svg viewBox="0 0 80 92" className="w-14 h-16 sm:w-20 sm:h-24" fill="none">
            <path
              d="M40 4L74 17V44C74 63 59 79 40 88C21 79 6 63 6 44V17L40 4Z"
              stroke="url(#wp-crest)"
              strokeWidth="1.5"
            />
            <path
              d="M40 16L62 24V44C62 56 52 67 40 74C28 67 18 56 18 44V24L40 16Z"
              stroke="#55D6E8"
              strokeWidth="0.9"
              strokeDasharray="3 3"
            />
            <defs>
              <linearGradient id="wp-crest" x1="6" y1="4" x2="74" y2="88" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A99BFF" />
                <stop offset="1" stopColor="#55D6E8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="border-t border-[#A6AEC8]/20 pt-3 sm:pt-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="block font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#F4F5FF] drop-shadow-[0_0_12px_rgba(139,124,255,0.45)]">
              SH
            </span>
            <span className="block font-mono text-[8px] sm:text-[10px] text-[#A6AEC8] tracking-[0.14em] uppercase mt-0.5 whitespace-nowrap">
              SAFEHER RESEARCH
            </span>
          </div>
          <span className="font-mono text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-[#8B7CFF]/15 border border-[#8B7CFF]/35 text-[#A99BFF] whitespace-nowrap shrink-0">
            SEC 65B
          </span>
        </div>
      </div>
    </div>
  )
}
