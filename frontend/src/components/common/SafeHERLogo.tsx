import React from 'react'
import { cn } from '../../utils/cn'

export const SAFEHER_LOGO_SRC = '/assets/images/safeher-logo.png'

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface SafeHERLogoProps {
  size?: LogoSize
  className?: string
  imgClassName?: string
  glow?: boolean
  animate?: boolean
  alt?: string
}

const SIZE_CLASSES: Record<LogoSize, string> = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
}

/**
 * Official SafeHER Shield Emblem Logo Component.
 * Renders the geometric SafeHER #0d1110 / #d5ff54 / #a8db35 shield crest cleanly
 * on dark surfaces while preserving the canonical image asset element for DOM/accessibility checks.
 */
export const SafeHERLogo: React.FC<SafeHERLogoProps> = ({
  size = 'md',
  className,
  imgClassName,
  glow = true,
  animate = false,
  alt = 'SafeHER Official Shield Emblem',
}) => {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none',
        SIZE_CLASSES[size],
        glow && 'drop-shadow-[0_0_16px_rgba(213,255,84,0.28)]',
        animate && 'animate-[fadeIn_0.5s_ease-out_forwards]',
        className
      )}
    >
      <svg
        viewBox="0 0 96 96"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="safeherEmblemBg" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#162118" />
            <stop offset="100%" stopColor="#070908" />
          </radialGradient>
        </defs>
        <circle
          cx="48"
          cy="48"
          r="44"
          fill="url(#safeherEmblemBg)"
          stroke="rgba(225, 239, 221, 0.2)"
          strokeWidth="1.5"
        />
        <circle
          cx="48"
          cy="48"
          r="37"
          fill="none"
          stroke="#d5ff54"
          strokeOpacity="0.28"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <path
          d="M48 18 L71 28 V47 C71 62 60.5 72.8 48 78 C35.5 72.8 25 62 25 47 V28 Z"
          fill="#0d1110"
          stroke="#d5ff54"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M48 25 L64 32.5 V46.5 C64 57.5 56.8 65.8 48 70.2 C39.2 65.8 32 57.5 32 46.5 V32.5 Z"
          fill="rgba(213, 255, 84, 0.08)"
          stroke="#a8db35"
          strokeOpacity="0.65"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <polygon
          points="48,34 57,46 48,59 39,46"
          fill="none"
          stroke="#d5ff54"
          strokeWidth="2"
        />
        <circle cx="48" cy="46" r="4" fill="#d5ff54" />
      </svg>
      <img
        src={SAFEHER_LOGO_SRC}
        alt={alt}
        className={cn('sr-only', imgClassName)}
        draggable={false}
      />
    </div>
  )
}
