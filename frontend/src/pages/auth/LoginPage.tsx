import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { useSplash } from '../../contexts/SplashContext'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { SafeHERLogo } from '../../components/common/SafeHERLogo'
import { QuickExitButton } from '../../components/layout/QuickExitButton'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { t } = useI18n()
  const { showToast } = useToast()
  const { headerLogoHidden, registerLogoTarget } = useSplash()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('ananya.sharma@safeher.protect')
  const [password, setPassword] = useState('demoPassword123')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError(t.auth.errorEmpty)
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      showToast('Signed in securely.', 'success')
      navigate(from, { replace: true })
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
            data-safeher-logo-target="login"
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

      {/* Main Authentication Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-[#0d1110]/95 backdrop-blur-md border border-[rgba(225,239,221,0.15)] rounded-[4px] p-6 sm:p-8 shadow-glass text-left">
          <div className="flex flex-col items-center text-center mb-6">
            <SafeHERLogo size="xl" animate className="mb-4" />
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[#d5ff54] bg-[rgba(213,255,84,0.08)] border border-[rgba(213,255,84,0.28)] px-2.5 py-0.5 rounded-[3px] mb-3">
              <Lock className="w-3 h-3" />
              <span>Encrypted Access</span>
            </div>
            <h1 className="font-display text-3xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb]">
              {t.auth.welcome}
            </h1>
            <p className="text-xs text-[#929b93] mt-1 max-w-xs">{t.auth.subtitle}</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-[4px] bg-[rgba(255,146,126,0.1)] border border-[rgba(255,146,126,0.35)] flex items-start gap-2.5 text-xs text-[#ff927e]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t.auth.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              autoComplete="email"
            />

            <Input
              label={t.auth.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t.auth.loginButton}
            </Button>
          </form>

          {/* Demonstration Notice */}
          <div className="mt-5 pt-4 border-t border-[rgba(225,239,221,0.15)] text-center">
            <p className="text-[11px] font-mono text-[#929b93]">
              <span className="text-[#d5ff54] font-medium">Demo Mode:</span> Pre-filled with sample survivor response profile.
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/register"
              className="text-xs text-[#d5ff54] hover:text-[#e2ff84] transition-colors font-medium"
            >
              {t.auth.noAccount}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Safety Disclaimer */}
      <div className="text-center text-[11px] font-mono text-[#929b93] max-w-md mx-auto">
        SafeHER operates with end-to-end privacy controls. If you feel monitored, press{' '}
        <kbd className="px-1.5 py-0.5 rounded-[3px] bg-[#111716] border border-[rgba(225,239,221,0.2)] text-[#f0f2eb]">
          Alt + Q
        </kbd>{' '}
        at any moment to exit immediately.
      </div>
    </div>
  )
}
