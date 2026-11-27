import React, { useEffect, useState } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Eye, EyeOff, Loader2, X, AlertCircle, Inbox } from 'lucide-react'
import { cn } from '../../utils/cn'

/* -------------------------------------------------------------------------- */
/* 1. SafeHEREyebrow & SafeHERSectionHeader                                   */
/* -------------------------------------------------------------------------- */

export interface SafeHEREyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: string
}

export const SafeHEREyebrow: React.FC<SafeHEREyebrowProps> = ({
  children,
  index,
  className,
  ...props
}) => (
  <div
    className={cn(
      'inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d5ff54]',
      className
    )}
    {...props}
  >
    <span className="h-px w-6 bg-[#d5ff54] shrink-0" aria-hidden="true" />
    <span>{children}</span>
    {index && <span className="text-[#929b93] tracking-[0.16em]">/ {index}</span>}
  </div>
)

export interface SafeHERSectionHeaderProps {
  title: React.ReactNode
  accentWord?: string
  subtitle?: string
  eyebrow?: string
  index?: string
  badge?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const SafeHERSectionHeader: React.FC<SafeHERSectionHeaderProps> = ({
  title,
  accentWord,
  subtitle,
  eyebrow,
  index,
  badge,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 mb-7 border-b border-[rgba(225,239,221,0.15)] text-left',
      className
    )}
  >
    <div className="space-y-2.5 min-w-0">
      {eyebrow && <SafeHEREyebrow index={index}>{eyebrow}</SafeHEREyebrow>}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display font-extrabold uppercase tracking-[-0.025em] leading-[0.9] text-3xl sm:text-4xl lg:text-[46px] text-[#f0f2eb]">
          {title}
          {accentWord && (
            <span className="font-accent normal-case font-normal text-[#d5ff54] text-[1.18em] ml-2">
              {accentWord}
            </span>
          )}
        </h1>
        {badge}
      </div>
      {subtitle && (
        <p className="text-xs sm:text-sm text-[#929b93] max-w-2xl leading-relaxed font-sans">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="flex items-center gap-3 shrink-0 flex-wrap">{action}</div>}
  </div>
)

/* -------------------------------------------------------------------------- */
/* 2. SafeHERButton & SafeHERCta                                              */
/* -------------------------------------------------------------------------- */

export interface SafeHERButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const SafeHERButton = React.forwardRef<HTMLButtonElement, SafeHERButtonProps>(
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
      'inline-flex items-center justify-center font-mono uppercase tracking-[0.11em] font-semibold transition-all duration-200 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5ff54] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070908] disabled:opacity-45 disabled:cursor-not-allowed select-none active:translate-y-0'

    const variants = {
      primary:
        'bg-[#d5ff54] border border-[#d5ff54] text-[#080a08] hover:bg-[#e2ff84] hover:-translate-y-0.5 shadow-[0_0_24px_rgba(213,255,84,0.16)]',
      secondary:
        'bg-[#111716] border border-[rgba(225,239,221,0.22)] text-[#f0f2eb] hover:border-[#d5ff54] hover:text-[#d5ff54] hover:-translate-y-0.5',
      danger:
        'bg-[#ff927e] border border-[#ff927e] text-[#170907] hover:bg-[#ffa898] hover:-translate-y-0.5 shadow-[0_0_24px_rgba(255,146,126,0.18)]',
      ghost:
        'bg-transparent border border-transparent text-[#929b93] hover:text-[#d5ff54] hover:bg-[#111716]',
      outline:
        'bg-transparent border border-[rgba(240,242,235,0.48)] text-[#f0f2eb] hover:bg-[#d5ff54] hover:text-[#080a08] hover:border-[#d5ff54] hover:-translate-y-0.5',
    }

    const sizes = {
      sm: 'min-h-[36px] px-3.5 py-1.5 text-[10px] gap-1.5',
      md: 'min-h-[44px] px-5 py-2 text-[11px] gap-2',
      lg: 'min-h-[54px] px-6 py-3 text-[11px] gap-2.5',
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
SafeHERButton.displayName = 'SafeHERButton'

export interface SafeHERCtaProps extends LinkProps {
  variant?: 'primary' | 'outline' | 'coral'
  size?: 'sm' | 'md' | 'lg'
  arrow?: '↗' | '↓' | '→' | null
}

export const SafeHERCta: React.FC<SafeHERCtaProps> = ({
  variant = 'primary',
  size = 'md',
  arrow = '↗',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    primary:
      'bg-[#d5ff54] border-[#d5ff54] text-[#080a08] hover:bg-[#e2ff84]',
    outline:
      'bg-transparent border-[rgba(240,242,235,0.48)] text-[#f0f2eb] hover:bg-[#d5ff54] hover:text-[#080a08] hover:border-[#d5ff54]',
    coral:
      'bg-[#ff927e] border-[#ff927e] text-[#170907] hover:bg-[#ffa898]',
  }
  const sizeClasses = {
    sm: 'min-h-[40px] px-[17px] text-[9px] gap-2',
    md: 'min-h-[48px] px-5 text-[10px] gap-2.5',
    lg: 'min-h-[54px] px-[23px] text-[11px] gap-3',
  }

  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center border rounded-[3px] font-mono font-semibold uppercase tracking-[0.11em] transition-all duration-300 hover:-translate-y-0.5',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {arrow && <span className="text-[16px] leading-none" aria-hidden="true">{arrow}</span>}
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* 3. SafeHERCard & SafeHERPanel                                              */
/* -------------------------------------------------------------------------- */

export interface SafeHERCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  interactive?: boolean
  accentTop?: boolean
}

export const SafeHERCard: React.FC<SafeHERCardProps> = ({
  className,
  glass = true,
  interactive = false,
  accentTop = false,
  children,
  ...props
}) => (
  <div
    className={cn(
      'relative rounded-[4px] border border-[rgba(225,239,221,0.15)] transition-all duration-200 text-left',
      glass
        ? 'bg-[#0d1110]/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]'
        : 'bg-[#111716] shadow-[0_12px_32px_rgba(0,0,0,0.4)]',
      interactive && 'hover:border-[rgba(213,255,84,0.55)] hover:-translate-y-1',
      className
    )}
    {...props}
  >
    {accentTop && (
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#d5ff54]/45 to-transparent"
        aria-hidden="true"
      />
    )}
    {children}
  </div>
)

export interface SafeHERPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'accent' | 'coral'
}

export const SafeHERPanel: React.FC<SafeHERPanelProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const styles = {
    default: 'bg-[#0d1110] border-[rgba(225,239,221,0.15)]',
    secondary: 'bg-[#111716] border-[rgba(225,239,221,0.18)]',
    accent: 'bg-[#0d1110] border-[rgba(213,255,84,0.35)] shadow-[0_0_28px_rgba(213,255,84,0.06)]',
    coral: 'bg-[#0d1110] border-[rgba(255,146,126,0.42)]',
  }

  return (
    <div
      className={cn(
        'relative rounded-[4px] border p-5 sm:p-6 text-left transition-colors duration-200',
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. SafeHERBadge & SafeHERStatus                                            */
/* -------------------------------------------------------------------------- */

export interface SafeHERBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'safe' | 'warning' | 'critical' | 'primary' | 'trust' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
}

export const SafeHERBadge: React.FC<SafeHERBadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-[#d5ff54]/12 text-[#d5ff54] border-[#d5ff54]/35',
    safe: 'bg-[#a8db35]/12 text-[#a8db35] border-[#a8db35]/35',
    trust: 'bg-[#a8db35]/12 text-[#a8db35] border-[#a8db35]/35',
    warning: 'bg-[#ff927e]/12 text-[#ff927e] border-[#ff927e]/35',
    critical: 'bg-[#ff927e]/18 text-[#ff927e] border-[#ff927e]/50',
    neutral: 'bg-[#111716] text-[#929b93] border-[rgba(225,239,221,0.18)]',
  }

  const dotColors = {
    primary: 'bg-[#d5ff54] shadow-[0_0_8px_#d5ff54]',
    safe: 'bg-[#a8db35]',
    trust: 'bg-[#a8db35]',
    warning: 'bg-[#ff927e]',
    critical: 'bg-[#ff927e] shadow-[0_0_8px_#ff927e]',
    neutral: 'bg-[#929b93]',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[10px]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] font-medium rounded-full border leading-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}

export interface SafeHERStatusProps {
  label: string
  tone?: 'active' | 'verified' | 'warning' | 'idle'
  pulse?: boolean
  className?: string
}

export const SafeHERStatus: React.FC<SafeHERStatusProps> = ({
  label,
  tone = 'active',
  pulse = false,
  className,
}) => {
  const toneColor =
    tone === 'warning'
      ? 'text-[#ff927e]'
      : tone === 'verified'
      ? 'text-[#a8db35]'
      : tone === 'idle'
      ? 'text-[#929b93]'
      : 'text-[#d5ff54]'

  const dotColor =
    tone === 'warning'
      ? 'bg-[#ff927e] shadow-[0_0_10px_#ff927e]'
      : tone === 'verified'
      ? 'bg-[#a8db35]'
      : tone === 'idle'
      ? 'bg-[#929b93]'
      : 'bg-[#d5ff54] shadow-[0_0_10px_#d5ff54]'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]',
        toneColor,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor, pulse && 'animate-pulse')} />
      <span>{label}</span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* 5. SafeHERInput, SafeHERSelect, SafeHERTextarea                            */
/* -------------------------------------------------------------------------- */

export interface SafeHERInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
}

export const SafeHERInput = React.forwardRef<HTMLInputElement, SafeHERInputProps>(
  ({ className, type = 'text', label, helperText, error, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = inputId ? `${inputId}-error` : undefined
    const helperId = inputId ? `${inputId}-helper` : undefined

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f0f2eb]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full px-3.5 py-2.5 bg-[#070908] border rounded-[3px] text-sm font-sans text-[#f0f2eb] placeholder-[#707970] transition-colors duration-200',
              'focus:bg-[#0d1110] focus:outline-none focus:border-[#d5ff54] focus:ring-1 focus:ring-[#d5ff54]/30',
              error
                ? 'border-[#ff927e]/70 focus:border-[#ff927e]'
                : 'border-[rgba(225,239,221,0.18)] hover:border-[rgba(225,239,221,0.34)]',
              isPassword && 'pr-10',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[#929b93] hover:text-[#d5ff54] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-[#ff927e] mt-0.5 font-sans">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-[#929b93] mt-0.5 font-sans">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
SafeHERInput.displayName = 'SafeHERInput'

export interface SafeHERSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
}

export const SafeHERSelect = React.forwardRef<HTMLSelectElement, SafeHERSelectProps>(
  ({ className, label, helperText, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f0f2eb]"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 bg-[#070908] border border-[rgba(225,239,221,0.18)] hover:border-[rgba(225,239,221,0.34)] focus:border-[#d5ff54] rounded-[3px] text-xs font-sans text-[#f0f2eb] focus:outline-none cursor-pointer transition-colors',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {helperText && <p className="text-xs text-[#929b93]">{helperText}</p>}
      </div>
    )
  }
)
SafeHERSelect.displayName = 'SafeHERSelect'

export interface SafeHERTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

export const SafeHERTextarea = React.forwardRef<HTMLTextAreaElement, SafeHERTextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const textId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={textId}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f0f2eb]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textId}
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 bg-[#070908] border rounded-[3px] text-xs font-sans text-[#f0f2eb] placeholder-[#707970] transition-colors leading-relaxed focus:outline-none focus:bg-[#0d1110] focus:border-[#d5ff54]',
            error
              ? 'border-[#ff927e]/70 focus:border-[#ff927e]'
              : 'border-[rgba(225,239,221,0.18)] hover:border-[rgba(225,239,221,0.34)]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ff927e]">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#929b93]">{helperText}</p>}
      </div>
    )
  }
)
SafeHERTextarea.displayName = 'SafeHERTextarea'

/* -------------------------------------------------------------------------- */
/* 6. SafeHERModal & SafeHERDrawer                                            */
/* -------------------------------------------------------------------------- */

export interface SafeHERModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'default' | 'coral'
}

export const SafeHERModal: React.FC<SafeHERModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  tone = 'default',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation()
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'w-full bg-[#0d1110] border rounded-[4px] shadow-[0_30px_100px_rgba(0,0,0,0.7)] overflow-hidden text-left flex flex-col max-h-[90vh]',
          tone === 'coral' ? 'border-[#ff927e]/55' : 'border-[rgba(213,255,84,0.3)]',
          sizeClasses[size]
        )}
      >
        <div className="flex items-start justify-between p-6 border-b border-[rgba(225,239,221,0.15)] bg-[#0d1110]">
          <div className="space-y-1">
            <h2
              id="modal-title"
              className="font-display text-2xl font-bold uppercase tracking-tight text-[#f0f2eb]"
            >
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-xs text-[#929b93] leading-relaxed font-sans">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[3px] text-[#929b93] hover:text-[#d5ff54] hover:bg-[#111716] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#929b93] font-sans">
          {children}
        </div>
      </div>
    </div>
  )
}

export interface SafeHERDrawerProps {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}

export const SafeHERDrawer: React.FC<SafeHERDrawerProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={ariaLabel}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0d1110] border-l border-[rgba(213,255,84,0.3)] shadow-2xl flex flex-col text-[#f0f2eb] overflow-hidden"
      >
        {children}
      </aside>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* 7. SafeHERLoadingState & SafeHEREmptyState                                 */
/* -------------------------------------------------------------------------- */

export const SafeHERLoadingState: React.FC<{ label?: string; compact?: boolean }> = ({
  label = 'Loading workspace data...',
  compact = false,
}) => (
  <div
    className={cn(
      'rounded-[4px] border border-[rgba(225,239,221,0.15)] bg-[#0d1110] flex flex-col items-center justify-center gap-3 text-center',
      compact ? 'p-8' : 'p-14'
    )}
    role="status"
    aria-live="polite"
  >
    <Loader2 className="w-6 h-6 text-[#d5ff54] animate-spin" />
    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929b93]">
      {label}
    </span>
  </div>
)

export interface SafeHEREmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  tone?: 'default' | 'coral'
}

export const SafeHEREmptyState: React.FC<SafeHEREmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  tone = 'default',
}) => (
  <div className="p-10 text-center bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-[4px] space-y-3">
    <div
      className={cn(
        'w-12 h-12 rounded-[4px] border flex items-center justify-center mx-auto',
        tone === 'coral'
          ? 'bg-[#ff927e]/10 border-[#ff927e]/35 text-[#ff927e]'
          : 'bg-[#111716] border-[rgba(213,255,84,0.3)] text-[#d5ff54]'
      )}
    >
      {icon || (tone === 'coral' ? <AlertCircle className="w-6 h-6" /> : <Inbox className="w-6 h-6" />)}
    </div>
    <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#f0f2eb]">
      {title}
    </h3>
    <p className="text-xs text-[#929b93] max-w-sm mx-auto leading-relaxed font-sans">
      {description}
    </p>
    {action && <div className="pt-2 flex justify-center">{action}</div>}
  </div>
)
