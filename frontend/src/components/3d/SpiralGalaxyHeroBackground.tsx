import React, { useEffect, useRef, useState } from 'react'
import { createRenderer } from './spiral-galaxy/renderer'

interface SpiralGalaxyHeroBackgroundProps {
  className?: string
}

/**
 * Full-bleed WebGPU Spiral Galaxy background for the SafeHER Hero section.
 * Falls back gracefully to a lightweight Midnight Aurora CSS nebula when
 * WebGPU is unavailable or adapter initialization fails.
 */
export const SpiralGalaxyHeroBackground: React.FC<SpiralGalaxyHeroBackgroundProps> = ({
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webGpuSupported, setWebGpuSupported] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && 'gpu' in navigator
  })

  useEffect(() => {
    if (!webGpuSupported) return
    const canvas = canvasRef.current
    if (!canvas) return

    let active = true
    const renderer = createRenderer({ canvas })
    renderer.ready.catch(() => {
      if (active) {
        setWebGpuSupported(false)
      }
    })

    return () => {
      active = false
      renderer.dispose()
    }
  }, [webGpuSupported])

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Layer 0: Deep Obsidian Midnight Aurora Base */}
      <div className="absolute inset-0 bg-[#080B18]" />

      {webGpuSupported ? (
        /* Layer 1: Live Interactive vgpu WebGPU Spiral Galaxy */
        <canvas
          ref={canvasRef}
          className="pointer-events-auto block h-full w-full touch-none outline-none opacity-85"
          aria-label="Interactive Midnight Aurora Spiral Galaxy background"
        />
      ) : (
        /* Lightweight CSS Nebula Fallback for non-WebGPU browsers */
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(139, 124, 255, 0.22) 0%, rgba(101, 0, 184, 0.14) 38%, rgba(85, 214, 232, 0.08) 62%, rgba(8, 11, 24, 0) 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                'radial-gradient(1.5px 1.5px at 18% 28%, #F4F5FF, transparent), radial-gradient(1.5px 1.5px at 78% 22%, #55D6E8, transparent), radial-gradient(1px 1px at 34% 68%, #A99BFF, transparent), radial-gradient(1.5px 1.5px at 66% 74%, #8B7CFF, transparent), radial-gradient(1px 1px at 88% 58%, #F4F5FF, transparent), radial-gradient(1px 1px at 12% 78%, #55D6E8, transparent)',
            }}
          />
        </div>
      )}

      {/* Layer 2: Controlled Dark Contrast Overlay for Hero Typography Readability */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(8, 11, 24, 0.36) 0%, rgba(8, 11, 24, 0.68) 72%, rgba(8, 11, 24, 0.92) 100%)',
        }}
      />
    </div>
  )
}
