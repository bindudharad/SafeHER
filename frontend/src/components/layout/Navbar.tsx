import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, LogOut, Menu, User as UserIcon, ShieldAlert } from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSplash } from '../../contexts/SplashContext'
import { apiClient, type DataMode } from '../../services/api/client'
import { QuickExitButton } from './QuickExitButton'
import { EmergencyDrawer } from './EmergencyDrawer'
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
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false)

  useEffect(() => {
    const unsub = apiClient.subscribeDataMode(setDataMode)
    apiClient.checkBackendHealth().catch(() => undefined)
    return unsub
  }, [])

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'hi', label: 'हिन्दी' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070908]/92 backdrop-blur-xl border-b border-[rgba(225,239,221,0.15)] px-3 sm:px-6 lg:px-8 py-3">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle & Brand Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 text-[#929b93] hover:text-[#d5ff54] rounded-[3px] border border-[rgba(225,239,221,0.15)] hover:border-[#d5ff54]/45 transition-colors shrink-0"
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

        {/* Center: Integrity & Backend Status Pill */}
        <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0d1110] border border-[rgba(225,239,221,0.15)] text-[10px] font-mono uppercase tracking-[0.12em] text-[#929b93]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              dataMode === 'live'
                ? 'bg-[#d5ff54] shadow-[0_0_10px_#d5ff54] animate-pulse'
                : 'bg-[#ff927e]'
            }`}
          />
          <span className={dataMode === 'live' ? 'text-[#f0f2eb]' : 'text-[#ff927e]'}>
            {dataMode === 'live' ? t.navbar.liveBackend : t.navbar.offlineDemo}
          </span>
          <span className="text-[rgba(225,239,221,0.2)]">|</span>
          <span className="text-[#d5ff54]">{t.navbar.sec65bReady}</span>
        </div>

        {/* Right: Emergency Hub, Quick Exit, Language, User */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsEmergencyOpen(true)}
            aria-label="Open Emergency Hub"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[34px] rounded-[3px] bg-[#ff927e] hover:bg-[#ffa898] text-[#170907] text-[10px] font-mono font-semibold uppercase tracking-[0.1em] transition-all active:scale-95"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SOS HUB</span>
          </button>

          <QuickExitButton />

          <div className="relative flex items-center">
            <Globe className="w-3.5 h-3.5 text-[#d5ff54] absolute left-2 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label={t.navbar.selectLanguage}
              className="bg-[#0d1110] border border-[rgba(225,239,221,0.18)] hover:border-[#d5ff54]/55 text-[#f0f2eb] font-mono text-[10px] uppercase tracking-[0.06em] rounded-[3px] pl-6 sm:pl-8 pr-2 sm:pr-6 py-1.5 min-h-[34px] max-w-[78px] sm:max-w-none appearance-none focus:outline-none focus:border-[#d5ff54] cursor-pointer transition-colors"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#0d1110] text-[#f0f2eb]">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="hidden sm:flex items-center gap-2 pl-2.5 border-l border-[rgba(225,239,221,0.15)]">
              <div className="w-7 h-7 rounded-[3px] bg-[#111716] border border-[rgba(225,239,221,0.2)] flex items-center justify-center text-[#d5ff54]">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-[#f0f2eb] leading-tight">{user.name}</p>
                <p className="text-[10px] font-mono text-[#929b93] leading-tight truncate max-w-[130px]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                title={t.navbar.signOut}
                aria-label={t.navbar.signOut}
                className="p-1.5 text-[#929b93] hover:text-[#ff927e] rounded-[3px] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-3 min-h-[34px] rounded-[3px] border border-[rgba(225,239,221,0.2)] bg-[#111716] hover:border-[#d5ff54] text-[#f0f2eb] hover:text-[#d5ff54] font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
            >
              {t.auth.login}
            </Link>
          )}
        </div>
      </div>

      <EmergencyDrawer isOpen={isEmergencyOpen} onClose={() => setIsEmergencyOpen(false)} />
    </header>
  )
}
