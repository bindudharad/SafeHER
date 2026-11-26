import React from 'react'
import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080B18] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'

    const variants = {
      primary:
        'bg-[#8B7CFF] hover:bg-[#A99BFF] text-[#080B18] font-bold shadow-[0_0_20px_rgba(139,124,255,0.35)] hover:shadow-[0_0_26px_rgba(139,124,255,0.5)]',
      secondary:
        'bg-[#1D2540] hover:bg-[#253052] text-[#F4F5FF] border border-[#A6AEC8]/20 hover:border-[#8B7CFF]/40',
      danger:
        'bg-[#FF718A] hover:bg-[#FF5574] text-white shadow-[0_0_15px_rgba(255,113,138,0.3)]',
      ghost:
        'hover:bg-[#1D2540] text-[#A6AEC8] hover:text-[#F4F5FF]',
      outline:
        'border border-[#8B7CFF]/40 hover:border-[#8B7CFF] text-[#8B7CFF] hover:bg-[#8B7CFF]/10',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
