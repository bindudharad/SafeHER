import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, LogOut, Menu, User as UserIcon } from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSplash } from '../../contexts/SplashContext'
import { apiClient, type DataMode } from '../../services/api/client'
import { QuickExitButton } from './QuickExitButton'
import { SafeHERLogo } from '../common/SafeHERLogo'
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
    <header className="sticky top-0 z-40 w-full bg-[#0D1224]/90 backdrop-blur-xl border-b border-[#A6AEC8]/15 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 text-[#A6AEC8] hover:text-[#F4F5FF] rounded-xl hover:bg-[#1D2540] focus:outline-none transition-colors"
              aria-label={t.navbar.toggleMenu}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
            <div
              ref={registerLogoTarget}
              data-safeher-logo-target="navbar"
              style={{ opacity: headerLogoHidden ? 0 : 1 }}
              className="transition-opacity duration-150"
            >
              <SafeHERLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#F4F5FF] font-['thunderLC',sans-serif] leading-none">
                  {t.appName}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#171D35] text-[#8B7CFF] border border-[#8B7CFF]/30">
                  {t.navbar.workspace}
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-[#A6AEC8] font-mono tracking-wider uppercase leading-none mt-0.5">
                {t.navbar.subtitle}
              </p>
            </div>
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
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Exit Button (Always Accessible) */}
          <QuickExitButton />

          {/* Language Selector Dropdown */}
          <div className="relative flex items-center">
            <Globe className="w-3.5 h-3.5 text-[#8B7CFF] absolute left-2.5 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label={t.navbar.selectLanguage}
              className="bg-[#171D35] border border-[#A6AEC8]/20 hover:border-[#8B7CFF]/50 text-[#F4F5FF] text-xs rounded-xl pl-8 pr-7 py-1.5 appearance-none focus:outline-none focus:border-[#8B7CFF] cursor-pointer transition-colors"
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
