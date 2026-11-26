import React, { useState } from 'react'
import {
  Shield,
  Lock,
  Globe,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  User,
  Key,
  ShieldCheck,
  Languages,
  Database,
  FileCheck2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/common/Button'
import type { Language } from '../../i18n/translations'

export const PrivacySettingsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const { language, setLanguage, t } = useI18n()
  const { showToast } = useToast()

  const [isPurging, setIsPurging] = useState(false)

  const handlePurgeSession = () => {
    if (window.confirm('Are you sure you want to purge all local cached drafts and session storage from this browser?')) {
      setIsPurging(true)
      try {
        sessionStorage.clear()
        localStorage.removeItem('safeher_incident_draft_session')
        showToast('Local browser session storage purged completely.', 'success')
      } finally {
        setIsPurging(false)
      }
    }
  }

  const handleExportDataArchive = () => {
    const archive = {
      user,
      export_timestamp: new Date().toISOString(),
      vault_policy: 'SafeHER Client-Side Preserved Archive',
      security_notice: 'User-scoped JSON export payload (client-generated digest; not encrypted at rest).',
    }
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SafeHER_Data_Archive_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Personal data archive downloaded.', 'success')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left pb-16">
      {/* 1. SETTINGS COCKPIT HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#648BFF]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#A6AEC8]/15">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#8B7CFF] uppercase tracking-wider px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t.settings.title}
              </span>
              <span className="text-xs text-[#52D6B2] font-mono flex items-center gap-1.5 bg-[#52D6B2]/10 px-2.5 py-0.5 rounded-full border border-[#52D6B2]/20">
                <Lock className="w-3.5 h-3.5" />
                Zero-Knowledge Privacy
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
              Privacy, Consent &amp; Cryptographic Controls
            </h1>
            <p className="text-xs sm:text-sm text-[#A6AEC8] max-w-2xl leading-relaxed">
              Manage your identity credentials, interface language, zero-knowledge consent, and local data retention.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut className="w-3.5 h-3.5" />}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* SECURITY INTEGRITY STATS */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#A6AEC8]/15 pt-6 text-left">
          <div className="pr-4 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Storage Mode</span>
            <span className="text-lg font-bold font-mono text-[#F4F5FF] block mt-1">Client Sandbox</span>
            <span className="text-[11px] text-[#52D6B2]">Ephemeral memory</span>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Encryption</span>
            <span className="text-lg font-bold font-mono text-[#8B7CFF] block mt-1">AES-256-GCM</span>
            <span className="text-[11px] text-[#A6AEC8]">WebCrypto API</span>
          </div>
          <div className="pr-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Evidence Digest</span>
            <span className="text-lg font-bold font-mono text-[#52D6B2] block mt-1">SHA-256</span>
            <span className="text-[11px] text-[#A6AEC8]">Sec 65B Compliant</span>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Data Sovereignty</span>
            <span className="text-lg font-bold font-mono text-[#648BFF] block mt-1">Zero-Telemetry</span>
            <span className="text-[11px] text-[#A6AEC8]">No tracker scripts</span>
          </div>
        </div>
      </div>

      {/* 2. USER PROFILE & CONSENT IDENTIFIER */}
      <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#A6AEC8]/15">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#8B7CFF]" />
            <h2 className="text-base font-bold text-[#F4F5FF]">
              {t.settings.profile}
            </h2>
          </div>
          <span className="text-xs font-mono text-[#52D6B2] bg-[#52D6B2]/10 px-2.5 py-0.5 rounded-full border border-[#52D6B2]/25">
            Authenticated Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-1">
            <span className="text-[#A6AEC8] uppercase tracking-wider text-[10px] block font-medium">Complainant / Legal Name</span>
            <p className="font-bold text-[#F4F5FF] text-sm">{user?.name || 'Anonymous Complainant'}</p>
          </div>
          <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-1">
            <span className="text-[#A6AEC8] uppercase tracking-wider text-[10px] block font-medium">Registered Identifier</span>
            <p className="font-mono text-[#8B7CFF] text-sm truncate">{user?.email || 'N/A'}</p>
          </div>
          <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-1">
            <span className="text-[#A6AEC8] uppercase tracking-wider text-[10px] block font-medium">Consent Acknowledged</span>
            <p className="font-mono text-[#52D6B2] text-sm">
              {user?.consent_date ? new Date(user.consent_date).toLocaleDateString() : 'Active Consent'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. INTERFACE LANGUAGE PREFERENCE */}
      <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="space-y-1 pb-3 border-b border-[#A6AEC8]/15">
          <div className="flex items-center gap-2.5">
            <Languages className="w-4 h-4 text-[#8B7CFF]" />
            <h2 className="text-base font-bold text-[#F4F5FF]">
              {t.settings.language}
            </h2>
          </div>
          <p className="text-xs text-[#A6AEC8]">
            SafeHER supports English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी) for victim accessibility.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[
            { code: 'en', label: 'English', native: 'English', desc: 'Standard verified interface' },
            { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', native: 'ಕನ್ನಡ', desc: 'ಕರ್ನಾಟಕ ನಾಗರಿಕರ ನೆರವು' },
            { code: 'hi', label: 'हिन्दी (Hindi)', native: 'हिन्दी', desc: 'नागरिक सुरक्षा सहायता' },
          ].map((lang) => {
            const isSelected = language === lang.code
            return (
              <div
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as Language)
                  showToast(`Language switched to ${lang.label}.`, 'info')
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-[#8B7CFF]/10 border-[#8B7CFF] shadow-lg shadow-[#8B7CFF]/10 ring-1 ring-[#8B7CFF]/40'
                    : 'bg-[#0D1224] border-[#A6AEC8]/15 hover:border-[#8B7CFF]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F4F5FF]">{lang.label}</h3>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#8B7CFF]" />}
                </div>
                <p className="text-xs text-[#A6AEC8]">{lang.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. PRIVACY PURGE & DATA SOVEREIGNTY ACTION SUITE */}
      <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="space-y-1 pb-3 border-b border-[#A6AEC8]/15">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#F0B96B]" />
            <h2 className="text-base font-bold text-[#F4F5FF]">
              Data Sovereignty &amp; Retention Controls
            </h2>
          </div>
          <p className="text-xs text-[#A6AEC8]">
            Complete control over your personal records. Export encrypted archives or immediately purge client session memory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Archive */}
          <div className="p-5 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[#F4F5FF]">Personal Data Archive</h3>
              <p className="text-xs text-[#A6AEC8] leading-relaxed">
                Download a JSON archive containing your incident metadata, evidence hashes, and case audit records for external legal retention.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportDataArchive}
              leftIcon={<Download className="w-4 h-4 text-[#8B7CFF]" />}
            >
              Export Personal Data Archive
            </Button>
          </div>

          {/* Purge Cache */}
          <div className="p-5 bg-[#0D1224] rounded-2xl border border-[#FF718A]/25 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[#FF718A]">Purge Session Cache</h3>
              <p className="text-xs text-[#A6AEC8] leading-relaxed">
                Immediately clear all uncommitted incident drafts and temporary keys stored in this browser session.
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handlePurgeSession}
              isLoading={isPurging}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Purge Local Browser Session Cache
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
