import React, { useState } from 'react'

interface ButtonMarqueeProps {
  children: React.ReactNode
  marqueeText?: string
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'bracket'
}

export const ButtonMarquee: React.FC<ButtonMarqueeProps> = ({
  children,
  marqueeText,
  className = '',
  onClick,
  type = 'button',
  variant = 'primary',
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const text = marqueeText || (typeof children === 'string' ? children : 'EXPLORE SAFEHER')

  const baseStyle =
    variant === 'bracket'
      ? 'button-bracket relative overflow-hidden group cursor-pointer'
      : 'button-primary relative overflow-hidden group cursor-pointer'

  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${baseStyle} ${className}`}
    >
      {/* Normal Text Layer */}
      <span
        className={`inline-flex items-center gap-2 transition-all duration-300 ${
          isHovered ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        {children}
      </span>

      {/* Hover Moving Marquee Layer */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center overflow-hidden pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex whitespace-nowrap animate-[marqueeRight_8s_linear_infinite]">
          <span className="font-mono text-xs uppercase tracking-widest text-zcyan px-4">
            {text} • {text} • {text} •
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-zcyan px-4">
            {text} • {text} • {text} •
          </span>
        </div>
      </div>
    </button>
  )
}
