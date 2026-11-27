import React, { useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useI18n } from '../../contexts/I18nContext'
import { useWorkspaceScrollReveal } from '../../hooks/useWorkspaceScrollReveal'
import {
  AlertCircle,
  LayoutDashboard,
  PlusCircle,
  HardDrive,
  Cpu,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Unified Authenticated Application Shell (AppShell).
 * Uses the exact SafeHER #070908 / #0d1110 / #d5ff54 / rgba(225,239,221,.15) system
 * with clean workspace ergonomics instead of pinned landing scroll effects.
 */
export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { language, t } = useI18n()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)
  const scrollProgressRef = useRef<HTMLDivElement | null>(null)

  useWorkspaceScrollReveal(mainRef, scrollProgressRef, pathname)

  const mobileBottomItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incidents/new', label: 'Report', icon: PlusCircle },
    { to: '/evidence', label: 'Evidence', icon: HardDrive },
    { to: '/detect', label: 'Detect', icon: Cpu },
    { to: '/reporting', label: 'Help', icon: ShieldCheck },
  ]

  return (
    <div className="min-h-screen bg-[#070908] text-[#f0f2eb] safeher-grid-bg flex flex-col font-sans relative overflow-x-hidden selection:bg-[#d5ff54] selection:text-[#080a08]">
      <div
        ref={scrollProgressRef}
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left scale-x-0 bg-gradient-to-r from-[#a8db35] via-[#d5ff54] to-[#f0f2eb] shadow-[0_0_12px_rgba(213,255,84,0.6)] pointer-events-none"
      />
      {/* Subtle radial lime ambient accent */}
      <div
        className="pointer-events-none fixed top-0 right-0 w-[620px] h-[420px] z-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 80% 15%, rgba(213, 255, 84, 0.06), rgba(168, 219, 53, 0.02) 45%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <Navbar onToggleMobileMenu={() => setMobileOpen(true)} />

      {/* Multilingual Translation Notice */}
      {language !== 'en' && (
        <div className="bg-[#ff927e]/10 border-b border-[#ff927e]/30 px-4 py-2 text-xs text-[#ff927e] flex items-center justify-center gap-2 text-center relative z-10 font-sans">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t.common.unreviewedTranslationNote}</span>
        </div>
      )}

      <div className="flex-1 flex w-full relative z-10">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <main
          ref={mainRef}
          className="workspace-stage flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-10 min-w-0 overflow-y-auto max-w-7xl mx-auto w-full"
        >
          <Outlet />
        </main>
      </div>

      {/* Clean Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1110]/95 backdrop-blur-xl border-t border-[rgba(225,239,221,0.15)] px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
      >
        {mobileBottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-[3px] font-mono text-[9px] uppercase tracking-[0.08em] transition-colors',
                isActive
                  ? 'text-[#d5ff54]'
                  : 'text-[#929b93] hover:text-[#f0f2eb]'
              )
            }
          >
            <item.icon className="w-4 h-4 mb-0.5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
