import React from 'react'
import { Link } from 'react-router-dom'
import { QuickExitButton } from '../layout/QuickExitButton'
import { SafeHERLogo } from '../common/SafeHERLogo'

interface PublicLandingShellProps {
  children: React.ReactNode
}

/**
 * Public Landing-Page Shell implementing the SafeHER Scroll Story container,
 * subtle cursor glow, top scroll progress indicator, and keyboard accessibility.
 */
export const PublicLandingShell: React.FC<PublicLandingShellProps> = ({ children }) => {
  return (
    <div className="safeher-landing min-h-screen bg-[#070908] text-[#f0f2eb] selection:bg-[#d5ff54] selection:text-[#080a08]">
      {children}
    </div>
  )
}

interface AuthShellProps {
  children: React.ReactNode
  logoTargetRef?: (el: HTMLElement | null) => void
  logoTargetId?: string
  logoHidden?: boolean
}

/**
 * Unified Authentication Shell for /login and /register using the exact
 * SafeHER #070908 / #0d1110 / #d5ff54 visual identity and Quick Exit protection.
 */
export const AuthShell: React.FC<AuthShellProps> = ({
  children,
  logoTargetRef,
  logoTargetId,
  logoHidden = false,
}) => {
  return (
    <div className="min-h-screen bg-[#070908] text-[#f0f2eb] safeher-grid-bg relative flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-[#d5ff54] selection:text-[#080a08] overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 50% 22%, rgba(213, 255, 84, 0.06) 0%, transparent 65%)',
        }}
        aria-hidden="true"
      />

      {/* Top Bar with SafeHER Brand & Quick Exit */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-95 transition-opacity"
          aria-label="SafeHER home"
        >
          <span
            ref={logoTargetRef}
            data-safeher-logo-target={logoTargetId}
            style={{ opacity: logoHidden ? 0 : 1 }}
            className="w-7 h-7 grid place-items-center border border-[#d5ff54] text-[#d5ff54] rotate-45 transition-opacity duration-150 shrink-0"
          >
            <span className="-rotate-45 font-display font-bold text-sm leading-none">S</span>
          </span>
          <div className="text-left">
            <span className="font-display font-extrabold text-xl tracking-[0.06em] uppercase text-[#f0f2eb] leading-none block">
              SAFEHER
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#929b93] block mt-0.5">
              DIGITAL SAFETY &amp; EVIDENCE
            </span>
          </div>
          <SafeHERLogo size="xs" glow={false} className="sr-only" />
        </Link>
        <QuickExitButton />
      </header>

      <main className="relative z-10 w-full my-6">{children}</main>

      <footer className="relative z-10 text-center text-[11px] font-mono text-[#929b93] max-w-lg mx-auto">
        SafeHER operates with client-side privacy controls. Press{' '}
        <kbd className="px-1.5 py-0.5 rounded-[3px] bg-[#0d1110] border border-[rgba(225,239,221,0.22)] text-[#d5ff54]">
          Alt + Q
        </kbd>{' '}
        anytime for immediate Quick Exit.
      </footer>
    </div>
  )
}
