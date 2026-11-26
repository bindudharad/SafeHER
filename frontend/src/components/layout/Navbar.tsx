import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, LogOut, Menu, User as UserIcon } from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSplash } from '../../contexts/SplashContext'
import { apiClient, type DataMode } from '../../services/api/client'
import { QuickExitButton } from './QuickExitButton'
import { SafeHERBrandLockup } from '../common/SafeHERBrandLockup'
import type { Language } from '../../i18n/translations'

interface NavbarProps {
  onToggleMobileMenu?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { language, setLanguage, t } = useI18n()
  const { user, logout } = useAuth()
  const { headerLogoHidden, registerLogoTarget } = useSplash()
  const [dataMode, setDataMode] = useState<DataMode>(() => apiClient.getDataMode())

  useEffect(() => {
    const unsub = apiClient.subscribeDataMode(setDataMode)
    apiClient.checkBackendHealth().catch(() => undefined)
    return unsub
  }, [])

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'kn', label: 'ಕನ್ನಡ', flag: 'KN' },
    { code: 'hi', label: 'हिन्दी', flag: 'HI' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0D1224]/90 backdrop-blur-xl border-b border-[#A6AEC8]/15 px-3 sm:px-6 lg:px-8 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle & Unified Brand Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 text-[#A6AEC8] hover:text-[#F4F5FF] rounded-xl hover:bg-[#1D2540] focus:outline-none transition-colors shrink-0"
              aria-label={t.navbar.toggleMenu}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/dashboard" className="shrink-0 hover:opacity-95 transition-opacity">
            <SafeHERBrandLockup
              logoSize="sm"
              logoTargetRef={registerLogoTarget}
              logoTargetId="navbar"
              logoHidden={headerLogoHidden}
            />
          </Link>
        </div>

        {/* Center: Subtle Privacy & Live Backend Integrity Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#171D35]/90 border border-[#A6AEC8]/15 text-[11px] font-mono text-[#A6AEC8]">
          <span
            className={`w-2 h-2 rounded-full ${
              dataMode === 'live' ? 'bg-[#52D6B2] animate-pulse' : 'bg-[#F0B96B]'
            }`}
          />
          <span>
            {dataMode === 'live' ? t.navbar.liveBackend : t.navbar.offlineDemo}
          </span>
          <span className="text-[#727D9C]">|</span>
          <span className="text-[#8B7CFF]">{t.navbar.sec65bReady}</span>
        </div>

        {/* Right: Quick Exit, Language Selector, User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Exit Button (Always Accessible) */}
          <QuickExitButton />

          {/* Language Selector Dropdown */}
          <div className="relative flex items-center">
            <Globe className="w-3.5 h-3.5 text-[#8B7CFF] absolute left-2 sm:left-2.5 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label={t.navbar.selectLanguage}
              className="bg-[#171D35] border border-[#A6AEC8]/20 hover:border-[#8B7CFF]/50 text-[#F4F5FF] text-xs rounded-xl pl-7 sm:pl-8 pr-6 sm:pr-7 py-1.5 max-w-[88px] sm:max-w-none appearance-none focus:outline-none focus:border-[#8B7CFF] cursor-pointer transition-colors"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#0D1224] text-[#F4F5FF]">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Profile / Logout */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#A6AEC8]/15">
              <div className="w-7 h-7 rounded-full bg-[#1D2540] border border-[#A6AEC8]/25 flex items-center justify-center text-[#F4F5FF]">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-[#F4F5FF] leading-tight">{user.name}</p>
                <p className="text-[10px] text-[#A6AEC8] leading-tight truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                title={t.navbar.signOut}
                aria-label={t.navbar.signOut}
                className="p-1 text-[#A6AEC8] hover:text-[#FF718A] rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
