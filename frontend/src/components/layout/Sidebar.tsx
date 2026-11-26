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
    { to: '/incidents/new', label: t.sidebar.reportIncident, icon: PlusCircle, badge: t.sidebar.quickBadge },
  ]

  const secondaryNav = [
    { to: '/incidents', label: t.sidebar.savedIncidents, icon: AlertCircle },
    { to: '/cases', label: t.sidebar.caseTracking, icon: CheckSquare },
    { to: '/analysis/threat', label: t.sidebar.threatIntelligence, icon: ShieldAlert },
    { to: '/complaints', label: t.sidebar.complaintAssistant, icon: FileText },
    { to: '/reporting', label: t.sidebar.helpSafety, icon: ShieldCheck },
    { to: '/settings', label: t.sidebar.privacySettings, icon: Settings },
  ]

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-5">
        {onCloseMobile ? (
          <div className="flex items-center justify-between px-2 pt-1 pb-3 md:hidden border-b border-[#A6AEC8]/15">
            <SafeHERBrandLockup logoSize="sm" compact showSubtitle={false} />
            <button
              onClick={onCloseMobile}
              className="p-1 text-[#A6AEC8] hover:text-[#F4F5FF] transition-colors shrink-0"
              aria-label={t.sidebar.closeNavigation}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center px-3 pt-1 pb-3 border-b border-[#A6AEC8]/12">
            <SafeHERBrandLockup
              logoSize="md"
              compact
              subtitleText={t.sidebar.digitalTrust}
            />
          </div>
        )}

        {/* Core Main Navigation (1-7) */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#727D9C] font-semibold">
            {t.sidebar.mainWorkspace}
          </div>

          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/incidents'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#1D2540] text-[#8B7CFF] border border-[#8B7CFF]/30 shadow-[0_0_15px_rgba(139,124,255,0.15)]'
                    : 'text-[#A6AEC8] hover:text-[#F4F5FF] hover:bg-[#171D35] border border-transparent'
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/25 font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Manage & Support */}
        <div className="space-y-1 pt-2 border-t border-[#A6AEC8]/15">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#727D9C] font-semibold">
            MANAGEMENT &amp; SAFETY
          </div>

          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/incidents'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#1D2540] text-[#8B7CFF] border border-[#8B7CFF]/30 shadow-[0_0_15px_rgba(139,124,255,0.15)]'
                    : 'text-[#A6AEC8] hover:text-[#F4F5FF] hover:bg-[#171D35] border border-transparent'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Privacy by Default Security Badge in Sidebar Footer */}
      <div className="p-3.5 bg-[#171D35] rounded-2xl border border-[#A6AEC8]/15 text-left relative overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 text-[#52D6B2] text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>{t.landing.whatWeDo.point1Title}</span>
        </div>
        <p className="text-[10px] text-[#A6AEC8] mt-1 leading-relaxed">
          {t.evidence.integrityExplanation}
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 bg-[#0D1224]/95 border-r border-[#A6AEC8]/15 min-h-[calc(100vh-61px)]">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#080B18]/85 backdrop-blur-md animate-fade-in flex">
          <div className="w-72 bg-[#0D1224] border-r border-[#A6AEC8]/15 h-full shadow-2xl">
            {navContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  )
}
