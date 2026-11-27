import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Activity,
  BookOpen,
  Scan,
  LayoutDashboard,
  PlusCircle,
  HardDrive,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckSquare,
  ShieldAlert,
  Settings,
  X,
  Lock,
  Network,
  Clock,
  ScanSearch,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { cn } from '../../utils/cn'
import { SafeHERBrandLockup } from '../common/SafeHERBrandLockup'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { t } = useI18n()

  const primaryNav = [
    { to: '/', label: t.sidebar.home, icon: Home },
    { to: '/reality-trust-center', label: t.sidebar.realityTrustCenter, icon: Activity },
    { to: '/knowledge-hub', label: t.sidebar.knowledgeHub, icon: BookOpen },
    { to: '/detect', label: t.sidebar.detect, icon: Scan },
    { to: '/dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { to: '/evidence', label: t.sidebar.evidenceVault, icon: HardDrive },
    {
      to: '/incidents/new',
      label: t.sidebar.reportIncident,
      icon: PlusCircle,
      badge: t.sidebar.quickBadge,
    },
  ]

  const secondaryNav = [
    { to: '/incidents', label: t.sidebar.savedIncidents, icon: AlertCircle },
    { to: '/cases', label: t.sidebar.caseTracking, icon: CheckSquare },
    { to: '/forensics/graph', label: 'Evidence Graph', icon: Network },
    { to: '/forensics/timeline', label: 'Forensic Timeline', icon: Clock },
    { to: '/analysis/tampering', label: 'Tampering Localization', icon: ScanSearch },
    { to: '/analysis/threat', label: t.sidebar.threatIntelligence, icon: ShieldAlert },
    { to: '/complaints', label: t.sidebar.complaintAssistant, icon: FileText },
    { to: '/reporting', label: t.sidebar.helpSafety, icon: ShieldCheck },
    { to: '/settings', label: t.sidebar.privacySettings, icon: Settings },
  ]

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center justify-between px-3 py-2.5 rounded-[3px] text-xs font-sans transition-all duration-150 border',
      isActive
        ? 'bg-[#111716] text-[#d5ff54] border-[#d5ff54]/40 font-semibold'
        : 'text-[#929b93] hover:text-[#f0f2eb] hover:bg-[#111716]/70 border-transparent'
    )

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-5">
        {onCloseMobile ? (
          <div className="flex items-center justify-between px-2 pt-1 pb-3 md:hidden border-b border-[rgba(225,239,221,0.15)]">
            <SafeHERBrandLockup logoSize="sm" compact showSubtitle={false} />
            <button
              onClick={onCloseMobile}
              className="p-1 text-[#929b93] hover:text-[#d5ff54] transition-colors shrink-0"
              aria-label={t.sidebar.closeNavigation}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center px-2 pt-1 pb-3 border-b border-[rgba(225,239,221,0.12)]">
            <SafeHERBrandLockup logoSize="md" compact subtitleText={t.sidebar.digitalTrust} />
          </div>
        )}

        {/* Primary Navigation */}
        <div className="space-y-1">
          <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#929b93]">
            {t.sidebar.mainWorkspace}
          </div>

          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/incidents'}
              onClick={onCloseMobile}
              className={linkClasses}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#d5ff54]/12 text-[#d5ff54] border border-[#d5ff54]/30 font-mono uppercase tracking-[0.1em]">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Management & Safety */}
        <div className="space-y-1 pt-3 border-t border-[rgba(225,239,221,0.15)]">
          <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#929b93]">
            MANAGEMENT &amp; SAFETY
          </div>

          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/incidents'}
              onClick={onCloseMobile}
              className={linkClasses}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Privacy Integrity Card */}
      <div className="p-3.5 bg-[#111716] rounded-[4px] border border-[rgba(225,239,221,0.15)] text-left space-y-1.5">
        <div className="flex items-center gap-2 text-[#a8db35] font-mono text-[10px] uppercase tracking-[0.12em]">
          <Lock className="w-3.5 h-3.5" />
          <span>{t.landing.whatWeDo.point1Title}</span>
        </div>
        <p className="text-[11px] text-[#929b93] leading-relaxed font-sans">
          {t.evidence.integrityExplanation}
        </p>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:block w-64 shrink-0 bg-[#0d1110]/95 border-r border-[rgba(225,239,221,0.15)] min-h-[calc(100vh-61px)]">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden bg-black/80 backdrop-blur-md flex">
          <div className="w-72 bg-[#0d1110] border-r border-[rgba(225,239,221,0.15)] h-full shadow-2xl overflow-y-auto pb-24">
            {navContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  )
}
