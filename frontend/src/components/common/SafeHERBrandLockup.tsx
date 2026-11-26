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
 * Unified Internal Application Brand Lockup.
 * Hierarchy:
 * 1. Official circular SafeHER logo (with subtle Aurora Violet illumination)
 * 2. Readable geometric SAFEHER wordmark (non-condensed)
 * 3. Subtle descriptive subtitle
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
    <div className={cn('flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 select-none', className)}>
      <div
        ref={logoTargetRef}
        data-safeher-logo-target={logoTargetId}
        style={{ opacity: logoHidden ? 0 : 1 }}
        className="shrink-0 transition-opacity duration-150"
      >
        <SafeHERLogo size={logoSize} glow />
      </div>

      <div className="min-w-0 shrink-0 text-left">
        <span
          className={cn(
            'block font-sans font-bold uppercase text-[#F4F5FF] leading-none whitespace-nowrap',
            compact
              ? 'text-sm tracking-[0.12em]'
              : 'text-sm sm:text-[18px] tracking-[0.11em] sm:tracking-[0.16em]'
          )}
        >
          SAFEHER
        </span>

        {showSubtitle && (
          <p
            className={cn(
              'text-[#A6AEC8] font-mono uppercase leading-none truncate',
              compact
                ? 'text-[9px] tracking-[0.1em] mt-1'
                : 'hidden sm:block text-[10px] tracking-[0.12em] mt-1.5'
            )}
          >
            {resolvedSubtitle}
          </p>
        )}
      </div>
    </div>
  )
}
