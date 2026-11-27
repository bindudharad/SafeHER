import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { useSplash } from '../../contexts/SplashContext'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { SafeHERLogo } from '../../components/common/SafeHERLogo'
import { QuickExitButton } from '../../components/layout/QuickExitButton'

export const RegisterPage: React.FC = () => {
  const { register } = useAuth()
  const { t } = useI18n()
  const { showToast } = useToast()
  const { headerLogoHidden, registerLogoTarget } = useSplash()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consentAcknowledged, setConsentAcknowledged] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password) {
      setError(t.auth.errorEmpty)
      return
    }

    if (password !== confirmPassword) {
      setError(t.auth.errorMismatch)
      return
    }

    if (!consentAcknowledged) {
      setError(t.auth.errorConsent)
      return
    }

    setIsLoading(true)
    try {
      await register(name, email, password, consentAcknowledged)
      showToast('Protected account registered successfully.', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.auth.errorEmpty
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070908] safeher-grid-bg text-[#f0f2eb] flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-[#d5ff54] selection:text-[#080a08]">
      {/* Top Bar with Quick Exit */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div
            ref={registerLogoTarget}
            data-safeher-logo-target="register"
            style={{ opacity: headerLogoHidden ? 0 : 1 }}
            className="transition-opacity duration-150"
          >
            <SafeHERLogo size="sm" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-[0.06em] uppercase text-[#f0f2eb] leading-none block">
              SAFEHER
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#929b93] block mt-0.5">
              PERSONAL SAFETY SYSTEM
            </span>
          </div>
        </Link>
        <QuickExitButton />
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-lg mx-auto my-6">
        <div className="bg-[#0d1110]/95 backdrop-blur-md border border-[rgba(225,239,221,0.15)] rounded-[4px] p-6 sm:p-8 shadow-glass text-left">
          <div className="flex flex-col items-center text-center mb-6">
            <SafeHERLogo size="xl" animate className="mb-4" />
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[#d5ff54] bg-[rgba(213,255,84,0.08)] border border-[rgba(213,255,84,0.28)] px-2.5 py-0.5 rounded-[3px] mb-3">
              <UserPlus className="w-3 h-3" />
              <span>Protected Account</span>
            </div>
            <h1 className="font-display text-3xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb]">
              {t.auth.register}
            </h1>
            <p className="text-xs text-[#929b93] mt-1 max-w-sm">{t.auth.subtitle}</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-[4px] bg-[rgba(255,146,126,0.1)] border border-[rgba(255,146,126,0.35)] flex items-start gap-2.5 text-xs text-[#ff927e]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t.auth.fullName}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ananya Sharma"
              required
            />

            <Input
              label={t.auth.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              autoComplete="email"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t.auth.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
              <Input
                label={t.auth.confirmPassword}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            {/* Consent and Privacy Explanation Banner */}
            <div className="p-3.5 bg-[#111716] rounded-[4px] border border-[rgba(225,239,221,0.15)] text-left space-y-2">
              <div className="flex items-center gap-2 text-[#a8db35] text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Zero-Knowledge &amp; User-Controlled Privacy</span>
              </div>
              <p className="text-[11px] text-[#929b93] leading-relaxed">
                {t.auth.consentNotice}
              </p>
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAcknowledged}
                  onChange={(e) => setConsentAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded-[2px] border-[rgba(225,239,221,0.3)] bg-[#070908] text-[#d5ff54] focus:ring-[#d5ff54]/40 focus:ring-offset-background"
                  required
                />
                <span className="text-xs text-[#f0f2eb] font-medium leading-tight">
                  {t.auth.consentCheckbox}
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t.auth.registerButton}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-xs text-[#d5ff54] hover:text-[#e2ff84] transition-colors font-medium"
            >
              {t.auth.haveAccount}
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] font-mono text-[#929b93] max-w-md mx-auto">
        Your safety is paramount. You can exit anytime by clicking Quick Exit or pressing{' '}
        <kbd className="px-1.5 py-0.5 rounded-[3px] bg-[#111716] border border-[rgba(225,239,221,0.2)] text-[#f0f2eb]">
          Alt + Q
        </kbd>
        .
      </div>
    </div>
  )
}
