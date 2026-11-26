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
    <div className="min-h-screen bg-[#080B18] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar with Quick Exit */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div
            ref={registerLogoTarget}
            data-safeher-logo-target="register"
            style={{ opacity: headerLogoHidden ? 0 : 1 }}
            className="transition-opacity duration-150"
          >
            <SafeHERLogo size="sm" />
          </div>
          <span className="font-bold text-base text-[#F4F5FF]">SafeHER</span>
        </Link>
        <QuickExitButton />
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-lg mx-auto my-6">
        <div className="bg-[#171D35]/85 backdrop-blur-md border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 shadow-glass text-left">
          <div className="flex flex-col items-center text-center mb-6">
            <SafeHERLogo size="xl" animate className="mb-4" />
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#8B7CFF] bg-[#8B7CFF]/10 border border-[#8B7CFF]/25 px-2.5 py-0.5 rounded-full mb-2">
              <UserPlus className="w-3 h-3" />
              <span>Protected Account</span>
            </div>
            <h1 className="text-xl font-bold text-[#F4F5FF]">{t.auth.register}</h1>
            <p className="text-xs text-[#A6AEC8] mt-1 max-w-sm">{t.auth.subtitle}</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-[#FF718A]/10 border border-[#FF718A]/30 flex items-start gap-2.5 text-xs text-[#FF718A]">
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
            <div className="p-3.5 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 text-left space-y-2">
              <div className="flex items-center gap-2 text-[#52D6B2] text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Zero-Knowledge & User-Controlled Privacy</span>
              </div>
              <p className="text-[11px] text-[#A6AEC8] leading-relaxed">
                {t.auth.consentNotice}
              </p>
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAcknowledged}
                  onChange={(e) => setConsentAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-[#A6AEC8]/30 bg-[#080B18] text-[#8B7CFF] focus:ring-[#8B7CFF]/40 focus:ring-offset-background"
                  required
                />
                <span className="text-xs text-[#F4F5FF] font-medium leading-tight">
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
              className="text-xs text-[#8B7CFF] hover:text-[#A99BFF] transition-colors font-medium"
            >
              {t.auth.haveAccount}
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#727D9C] max-w-md mx-auto">
        Your safety is paramount. You can exit anytime by clicking Quick Exit or pressing{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-[#0D1224] border border-[#A6AEC8]/20 text-[#F4F5FF]">
          Alt + Q
        </kbd>
        .
      </div>
    </div>
  )
}
