import React from 'react'

interface AnimatedDataPanelProps {
  children: React.ReactNode
  className?: string
}

/**
 * Unified SafeHER Data Surface Panel with subtle lime specular top rule
 * and restrained hover border illumination.
 */
export const AnimatedDataPanel: React.FC<AnimatedDataPanelProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-[4px] bg-[#0d1110] border border-[rgba(225,239,221,0.15)] shadow-[0_14px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(240,242,235,0.04)] hover:border-[rgba(213,255,84,0.42)] transition-all duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#d5ff54]/45 to-transparent" />
      {children}
    </div>
  )
}
