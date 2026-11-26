import React from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'safe' | 'warning' | 'critical' | 'primary' | 'trust' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variants = {
    safe: 'bg-[#52D6B2]/15 text-[#52D6B2] border-[#52D6B2]/30',
    warning: 'bg-[#F0B96B]/15 text-[#F0B96B] border-[#F0B96B]/30',
    critical: 'bg-[#FF718A]/15 text-[#FF718A] border-[#FF718A]/30',
    primary: 'bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/35',
    trust: 'bg-[#648BFF]/15 text-[#648BFF] border-[#648BFF]/30',
    neutral: 'bg-[#1D2540] text-[#A6AEC8] border-[#A6AEC8]/20',
  }

  const dotColors = {
    safe: 'bg-[#52D6B2]',
    warning: 'bg-[#F0B96B]',
    critical: 'bg-[#FF718A]',
    primary: 'bg-[#8B7CFF]',
    trust: 'bg-[#648BFF]',
    neutral: 'bg-[#A6AEC8]',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border leading-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}
