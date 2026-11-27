import React from 'react'
import { SafeHERLogo, type LogoSize } from './SafeHERLogo'
import { useOptionalI18n } from '../../contexts/I18nContext'
import { cn } from '../../utils/cn'

interface SafeHERBrandLockupProps {
  logoSize?: LogoSize
  showSubtitle?: boolean
  subtitleText?: string
  compact?: boolean
  logoTargetRef?: (el: HTMLElement | null) => void
  logoTargetId?: string
  logoHidden?: boolean
  className?: string
}

/**
 * Unified SafeHER Brand Lockup matching the master Scroll Story navigation mark:
 * Rotated lime diamond emblem + Barlow Condensed SAFEHER wordmark + DM Mono subtitle.
 */
export const SafeHERBrandLockup: React.FC<SafeHERBrandLockupProps> = ({
  logoSize = 'sm',
  showSubtitle = true,
  subtitleText,
  compact = false,
  logoTargetRef,
  logoTargetId,
  logoHidden = false,
  className,
}) => {
  const { t } = useOptionalI18n()
  const resolvedSubtitle = subtitleText ?? t.navbar.subtitle

  return (
    <div className={cn('flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 select-none', className)}>
      <div
        ref={logoTargetRef}
        data-safeher-logo-target={logoTargetId}
        style={{ opacity: logoHidden ? 0 : 1 }}
        className="shrink-0 transition-opacity duration-150 relative flex items-center justify-center"
      >
        <span
          className={cn(
            'grid place-items-center border border-[#d5ff54] text-[#d5ff54] rotate-45 bg-[#070908]',
            compact ? 'w-6 h-6' : 'w-[26px] h-[26px]'
          )}
        >
          <span className="-rotate-45 font-display font-bold text-sm leading-none">S</span>
        </span>
        <SafeHERLogo size={logoSize} glow={false} className="sr-only" />
      </div>

      <div className="min-w-0 shrink-0 text-left">
        <span
          className={cn(
            'block font-display font-extrabold uppercase text-[#f0f2eb] leading-none whitespace-nowrap',
            compact
              ? 'text-base tracking-[0.06em]'
              : 'text-base sm:text-[19px] tracking-[0.05em]'
          )}
        >
          SAFEHER
        </span>

        {showSubtitle && (
          <p
            className={cn(
              'text-[#929b93] font-mono uppercase leading-none truncate',
              compact
                ? 'text-[8px] tracking-[0.16em] mt-1'
                : 'hidden sm:block text-[8px] tracking-[0.18em] mt-1'
            )}
          >
            {resolvedSubtitle}
          </p>
        )}
      </div>
    </div>
  )
}
