import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useI18n } from '../../contexts/I18nContext'
import {
  AlertCircle,
  LayoutDashboard,
  PlusCircle,
  HardDrive,
  Cpu,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { language, t } = useI18n()

  const mobileBottomItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incidents/new', label: 'Report', icon: PlusCircle },
    { to: '/evidence', label: 'Evidence', icon: HardDrive },
    { to: '/detect', label: 'Detect', icon: Cpu },
    { to: '/reporting', label: 'Help', icon: ShieldCheck },
  ]

  return (
    <div className="min-h-screen bg-[#080B18] text-[#F4F5FF] flex flex-col font-sans relative overflow-x-hidden selection:bg-[#8B7CFF] selection:text-[#080B18]">
      {/* Subtle Aurora Ambient lighting on top right */}
      <div
        className="pointer-events-none fixed top-0 right-0 w-[650px] h-[450px] z-0 opacity-45"
        style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(139, 124, 255, 0.12), rgba(85, 214, 232, 0.04) 40%, transparent 70%)',
        }}
      />

      <Navbar onToggleMobileMenu={() => setMobileOpen(true)} />

      {/* Multilingual Translation Notice */}
      {language !== 'en' && (
        <div className="bg-[#F0B96B]/10 border-b border-[#F0B96B]/25 px-4 py-2 text-xs text-[#F0B96B] flex items-center justify-center gap-2 text-center relative z-10">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t.common.unreviewedTranslationNote}</span>
        </div>
      )}

      <div className="flex-1 flex w-full relative z-10">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-10 min-w-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Clean Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1224]/95 backdrop-blur-xl border-t border-[#A6AEC8]/15 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      >
        {mobileBottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-[#8B7CFF]'
                  : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
              )
            }
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
