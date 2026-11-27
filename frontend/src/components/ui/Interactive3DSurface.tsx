import React, { useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../utils/cn'

export interface Interactive3DSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  intensity?: number
  glowTone?: 'lime' | 'coral' | 'sage'
  elevateZ?: number
  borderHover?: boolean
}

const GLOW_RGBA: Record<NonNullable<Interactive3DSurfaceProps['glowTone']>, string> = {
  lime: 'rgba(213, 255, 84, 0.13)',
  coral: 'rgba(255, 146, 126, 0.14)',
  sage: 'rgba(168, 219, 53, 0.12)',
}

/**
 * Interactive 3D perspective container with smooth pointer-tracked rotation,
 * cursor-following radial spotlight sheen, and reduced-motion accessibility compliance.
 */
export const Interactive3DSurface: React.FC<Interactive3DSurfaceProps> = ({
  children,
  className,
  intensity = 6,
  glowTone = 'lime',
  elevateZ = 8,
  borderHover = true,
  style,
  onMouseMove,
  onMouseLeave,
  ...rest
}) => {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false, mx: 50, my: 50 })

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(e)
    if (reducedMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    const nx = (px - 50) / 50
    const ny = (py - 50) / 50

    setTilt({
      rx: -ny * intensity,
      ry: nx * intensity,
      active: true,
      mx: px,
      my: py,
    })
  }

  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e)
    setTilt((prev) => ({ ...prev, rx: 0, ry: 0, active: false }))
  }

  const glowColor = GLOW_RGBA[glowTone]
  const borderClass =
    glowTone === 'coral'
      ? 'hover:border-[rgba(255,146,126,0.42)]'
      : 'hover:border-[rgba(213,255,84,0.42)]'

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transform: reducedMotion
          ? undefined
          : `perspective(1100px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) translateZ(${tilt.active ? elevateZ : 0}px)`,
        transition: tilt.active
          ? 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms ease, box-shadow 220ms ease'
          : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), border-color 240ms ease, box-shadow 240ms ease',
        ...style,
      }}
      className={cn(
        'relative overflow-hidden transform-gpu will-change-transform',
        borderHover && borderClass,
        tilt.active && 'shadow-[0_24px_60px_rgba(0,0,0,0.65)]',
        className
      )}
      {...rest}
    >
      {!reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${tilt.mx.toFixed(1)}% ${tilt.my.toFixed(1)}%, ${glowColor}, transparent 68%)`,
          }}
        />
      )}
      <div className="relative z-[2] h-full">{children}</div>
    </div>
  )
}
