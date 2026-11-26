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
 * Preserves original aspect ratio, transparent background, and purple/violet gradient.
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
        glow && 'drop-shadow-[0_0_12px_rgba(139,124,255,0.28)]',
        animate && 'animate-[fadeIn_0.5s_ease-out_forwards]',
        className
      )}
    >
      <img
        src={SAFEHER_LOGO_SRC}
        alt={alt}
        className={cn(
          'w-full h-full object-contain rounded-full block',
          imgClassName
        )}
        draggable={false}
      />
    </div>
  )
}
