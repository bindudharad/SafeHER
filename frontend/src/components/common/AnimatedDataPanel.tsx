import React from 'react'

interface AnimatedDataPanelProps {
  children: React.ReactNode
  className?: string
}

/**
 * 3D depth-inspired surface panel with subtle Midnight Aurora top-edge specular
 * highlight and restrained hover elevation, keeping charts flat and readable.
 */
export const AnimatedDataPanel: React.FC<AnimatedDataPanelProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-[#171D35]/90 border border-[#A6AEC8]/15 shadow-[0_14px_34px_rgba(8,11,24,0.55),inset_0_1px_0_rgba(244,245,255,0.06)] hover:border-[#8B7CFF]/35 hover:-translate-y-0.5 transition-all duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#8B7CFF]/45 to-transparent" />
      {children}
    </div>
  )
}
