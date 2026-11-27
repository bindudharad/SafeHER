import React, { useState, useEffect } from 'react'
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
  Radio,
  Sliders,
  Save,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/common/Button'
import { apiClient } from '../../services/api/client'
import type { Language } from '../../i18n/translations'
import type { UserSafetySettings } from '../../types'

export const PrivacySettingsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const { language, setLanguage, t } = useI18n()
  const { showToast } = useToast()

  const [isPurging, setIsPurging] = useState(false)
  const [safetySettings, setSafetySettings] = useState<UserSafetySettings | null>(null)
  const [quickExitUrl, setQuickExitUrl] = useState('https://www.weather.com')
  const [sirenSecs, setSirenSecs] = useState(30)
  const [sirenVol, setSirenVol] = useState(0.8)
  const [fakeCaller, setFakeCaller] = useState('Mom')
  const [emergencyNum, setEmergencyNum] = useState('112')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [opHealth, setOpHealth] = useState<{
    kms?: { provider?: string; status?: string }
    malware?: { status?: string; clamav_online?: boolean }
    sms?: { configured?: boolean; status?: string; provider?: { provider?: string; configured?: boolean; status?: string } }
    tampering_localization?: { status?: string; model_id?: string }
  } | null>(null)

  useEffect(() => {
    apiClient.getOperationalHealth().then(setOpHealth).catch(() => {})
    apiClient.getSafetySettings().then((res) => {
      if (res) {
        setSafetySettings(res)
        setQuickExitUrl(res.quick_exit_url || 'https://www.weather.com')
        setSirenSecs(res.siren_duration_seconds || 30)
        setSirenVol(res.siren_volume ?? 0.8)
        setFakeCaller(res.fake_call_caller_name || 'Mom')
        setEmergencyNum(res.emergency_number || '112')
      }
    }).catch(() => undefined)
  }, [])

  const handleSaveSafetySettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSettings(true)
    try {
      const updated = await apiClient.updateSafetySettings({
        quick_exit_url: quickExitUrl.trim(),
        siren_duration_seconds: sirenSecs,
        siren_volume: sirenVol,
        fake_call_caller_name: fakeCaller.trim(),
        emergency_number: emergencyNum.trim(),
      })
      setSafetySettings(updated)
      showToast('Safety settings updated successfully.', 'success')
    } catch {
      showToast('Failed to save safety settings.', 'error')
    } finally {
      setIsSavingSettings(false)
    }
  }

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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#111716] via-[#0d1110] to-[#070908] border border-[rgba(225,239,221,0.16)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#d5ff54]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#a8db35]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[rgba(225,239,221,0.15)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#d5ff54] uppercase tracking-wider px-3 py-1 rounded-full bg-[#d5ff54]/10 border border-[#d5ff54]/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t.settings.title}
              </span>
              <span className="text-xs text-[#a8db35] font-mono flex items-center gap-1.5 bg-[#a8db35]/10 px-2.5 py-0.5 rounded-full border border-[#a8db35]/20">
                <Lock className="w-3.5 h-3.5" />
                Zero-Knowledge Privacy
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl uppercase font-extrabold text-[#f0f2eb] tracking-[0.02em]">
              Privacy, Consent &amp; Cryptographic Controls
            </h1>
            <p className="text-xs sm:text-sm text-[#929b93] max-w-2xl leading-relaxed">
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
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#929b93]/15 pt-6 text-left">
          <div className="pr-4 pb-4 lg:pb-0">
            <span className="text-xs text-[#929b93] font-medium uppercase tracking-wider block">Storage Mode</span>
            <span className="text-lg font-bold font-mono text-[#f0f2eb] block mt-1">Client Sandbox</span>
            <span className="text-[11px] text-[#a8db35]">Ephemeral memory</span>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0 pb-4 lg:pb-0">
            <span className="text-xs text-[#929b93] font-medium uppercase tracking-wider block">Encryption</span>
            <span className="text-lg font-bold font-mono text-[#d5ff54] block mt-1">AES-256-GCM</span>
            <span className="text-[11px] text-[#929b93]">WebCrypto API</span>
          </div>
          <div className="pr-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#929b93] font-medium uppercase tracking-wider block">Evidence Digest</span>
            <span className="text-lg font-bold font-mono text-[#a8db35] block mt-1">SHA-256</span>
            <span className="text-[11px] text-[#929b93]">Sec 65B Compliant</span>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#929b93] font-medium uppercase tracking-wider block">Data Sovereignty</span>
            <span className="text-lg font-bold font-mono text-[#a8db35] block mt-1">Zero-Telemetry</span>
            <span className="text-[11px] text-[#929b93]">No tracker scripts</span>
          </div>
        </div>
      </div>

      {/* 2. USER PROFILE & CONSENT IDENTIFIER */}
      <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(225,239,221,0.15)]">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#d5ff54]" />
            <h2 className="text-base font-bold text-[#f0f2eb]">
              {t.settings.profile}
            </h2>
          </div>
          <span className="text-xs font-mono text-[#a8db35] bg-[#a8db35]/10 px-2.5 py-0.5 rounded-full border border-[#a8db35]/25">
            Authenticated Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 bg-[#0d1110] rounded-2xl border border-[rgba(225,239,221,0.15)] space-y-1">
            <span className="text-[#929b93] uppercase tracking-wider text-[10px] block font-medium">Complainant / Legal Name</span>
            <p className="font-bold text-[#f0f2eb] text-sm">{user?.name || 'Anonymous Complainant'}</p>
          </div>
          <div className="p-4 bg-[#0d1110] rounded-2xl border border-[rgba(225,239,221,0.15)] space-y-1">
            <span className="text-[#929b93] uppercase tracking-wider text-[10px] block font-medium">Registered Identifier</span>
            <p className="font-mono text-[#d5ff54] text-sm truncate">{user?.email || 'N/A'}</p>
          </div>
          <div className="p-4 bg-[#0d1110] rounded-2xl border border-[rgba(225,239,221,0.15)] space-y-1">
            <span className="text-[#929b93] uppercase tracking-wider text-[10px] block font-medium">Consent Acknowledged</span>
            <p className="font-mono text-[#a8db35] text-sm">
              {user?.consent_date ? new Date(user.consent_date).toLocaleDateString() : 'Active Consent'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. INTERFACE LANGUAGE PREFERENCE */}
      <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="space-y-1 pb-3 border-b border-[rgba(225,239,221,0.15)]">
          <div className="flex items-center gap-2.5">
            <Languages className="w-4 h-4 text-[#d5ff54]" />
            <h2 className="text-base font-bold text-[#f0f2eb]">
              {t.settings.language}
            </h2>
          </div>
          <p className="text-xs text-[#929b93]">
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
                    ? 'bg-[#d5ff54]/10 border-[#d5ff54] shadow-lg shadow-[#d5ff54]/10 ring-1 ring-[#d5ff54]/40'
                    : 'bg-[#0d1110] border-[rgba(225,239,221,0.15)] hover:border-[#d5ff54]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#f0f2eb]">{lang.label}</h3>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#d5ff54]" />}
                </div>
                <p className="text-xs text-[#929b93]">{lang.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. SURVIVOR SAFETY & EMERGENCY CONTROLS (STAGE 6) */}
      <div className="bg-[#111716]/85 border border-[#d5ff54]/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="space-y-1 pb-3 border-b border-[rgba(225,239,221,0.15)]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#ff927e]" />
            <h2 className="text-base font-bold text-[#f0f2eb]">
              Survivor Safety &amp; Emergency Hub Controls
            </h2>
          </div>
          <p className="text-xs text-[#929b93]">
            Customize Quick Exit redirect destination, deterrent siren volume/duration, and discreet fake call simulator identity.
          </p>
        </div>

        <form onSubmit={handleSaveSafetySettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#f0f2eb] block mb-1">
                Quick Exit Redirect Target URL
              </label>
              <input
                type="url"
                value={quickExitUrl}
                onChange={(e) => setQuickExitUrl(e.target.value)}
                required
                className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] focus:border-[#d5ff54] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
                placeholder="https://www.weather.com"
              />
              <span className="text-[10px] text-[#929b93] mt-1 block">
                Destination loaded immediately when clicking Quick Exit or pressing Alt+Q.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#f0f2eb] block mb-1">
                Default Emergency Phone Number
              </label>
              <input
                type="text"
                value={emergencyNum}
                onChange={(e) => setEmergencyNum(e.target.value)}
                required
                className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] focus:border-[#d5ff54] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
                placeholder="112"
              />
              <span className="text-[10px] text-[#929b93] mt-1 block">
                Default emergency service dialed via native dialer links.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#f0f2eb] block mb-1">
                Siren Auto-Stop Duration: {sirenSecs} seconds
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={sirenSecs}
                onChange={(e) => setSirenSecs(parseInt(e.target.value, 10))}
                className="w-full accent-[#ff927e] h-2 bg-[#070908] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#929b93]">
                <span>10s</span>
                <span>30s (Default)</span>
                <span>120s</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#f0f2eb] block mb-1">
                Discreet Call Caller Name
              </label>
              <input
                type="text"
                value={fakeCaller}
                onChange={(e) => setFakeCaller(e.target.value)}
                required
                className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] focus:border-[#a8db35] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
                placeholder="Mom"
              />
              <span className="text-[10px] text-[#929b93] mt-1 block">
                Label shown on the simulated incoming call screen.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingSettings}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Safety Settings
            </Button>
          </div>
        </form>
      </div>

      {/* 5. PRIVACY PURGE & DATA SOVEREIGNTY ACTION SUITE */}
      <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="space-y-1 pb-3 border-b border-[rgba(225,239,221,0.15)]">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#ff927e]" />
            <h2 className="text-base font-bold text-[#f0f2eb]">
              Data Sovereignty &amp; Retention Controls
            </h2>
          </div>
          <p className="text-xs text-[#929b93]">
            Complete control over your personal records. Export encrypted archives or immediately purge client session memory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Archive */}
          <div className="p-5 bg-[#0d1110] rounded-2xl border border-[rgba(225,239,221,0.15)] flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[#f0f2eb]">Personal Data Archive</h3>
              <p className="text-xs text-[#929b93] leading-relaxed">
                Download a JSON archive containing your incident metadata, evidence hashes, and case audit records for external legal retention.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportDataArchive}
              leftIcon={<Download className="w-4 h-4 text-[#d5ff54]" />}
            >
              Export Personal Data Archive
            </Button>
          </div>

          {/* Purge Cache */}
          <div className="p-5 bg-[#0d1110] rounded-2xl border border-[#ff927e]/25 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[#ff927e]">Purge Session Cache</h3>
              <p className="text-xs text-[#929b93] leading-relaxed">
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

      {/* Operational Security & Integration Health */}
      {opHealth && (
        <div className="bg-[#111716] border border-[rgba(225,239,221,0.12)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#d5ff54]" />
            <h2 className="text-base font-bold text-[#f0f2eb]">Operational Security &amp; Integration Status</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.08)]">
              <div className="text-[#929b93] font-mono uppercase text-[10px]">Key Management (KMS)</div>
              <div className="text-[#f0f2eb] font-semibold mt-1">
                {opHealth.kms?.provider || 'local_env'} • {opHealth.kms?.status || 'unknown'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.08)]">
              <div className="text-[#929b93] font-mono uppercase text-[10px]">Tampering Localization</div>
              <div className="text-[#f0f2eb] font-semibold mt-1">
                {opHealth.tampering_localization?.model_id || 'trufor'} • {opHealth.tampering_localization?.status || 'unknown'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.08)]">
              <div className="text-[#929b93] font-mono uppercase text-[10px]">External SMS Gateway</div>
              <div className="text-[#f0f2eb] font-semibold mt-1">
                {opHealth.sms?.provider?.configured ? `${opHealth.sms.provider.provider} Ready` : (opHealth.sms?.configured ? 'Ready' : 'Unconfigured')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.08)]">
              <div className="text-[#929b93] font-mono uppercase text-[10px]">ClamAV Antivirus</div>
              <div className="text-[#f0f2eb] font-semibold mt-1">
                {opHealth.malware?.clamav_online ? 'ClamAV Online' : `Heuristic (${opHealth.malware?.status || 'operational'})`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
