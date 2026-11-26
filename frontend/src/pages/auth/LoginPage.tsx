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
    <div className="min-h-screen bg-[#080B18] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar with Quick Exit */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div
            ref={registerLogoTarget}
            data-safeher-logo-target="login"
            style={{ opacity: headerLogoHidden ? 0 : 1 }}
            className="transition-opacity duration-150"
          >
            <SafeHERLogo size="sm" />
          </div>
          <span className="font-bold text-base text-[#F4F5FF]">SafeHER</span>
        </Link>
        <QuickExitButton />
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-[#171D35]/85 backdrop-blur-md border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 shadow-glass text-left">
          <div className="flex flex-col items-center text-center mb-6">
            <SafeHERLogo size="xl" animate className="mb-4" />
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#8B7CFF] bg-[#8B7CFF]/10 border border-[#8B7CFF]/25 px-2.5 py-0.5 rounded-full mb-2">
              <Lock className="w-3 h-3" />
              <span>Encrypted Access</span>
            </div>
            <h1 className="text-xl font-bold text-[#F4F5FF]">{t.auth.welcome}</h1>
            <p className="text-xs text-[#A6AEC8] mt-1 max-w-xs">{t.auth.subtitle}</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-[#FF718A]/10 border border-[#FF718A]/30 flex items-start gap-2.5 text-xs text-[#FF718A]">
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
          <div className="mt-5 pt-4 border-t border-[#A6AEC8]/15 text-center">
            <p className="text-[11px] text-[#A6AEC8]">
              <span className="text-[#8B7CFF] font-medium">Hackathon Demo Mode:</span> Pre-filled with verified victim response profile.
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/register"
              className="text-xs text-[#8B7CFF] hover:text-[#A99BFF] transition-colors font-medium"
            >
              {t.auth.noAccount}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Safety Disclaimer */}
      <div className="text-center text-[11px] text-[#727D9C] max-w-md mx-auto">
        SafeHER operates with end-to-end privacy controls. If you feel monitored, press{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-[#0D1224] border border-[#A6AEC8]/20 text-[#F4F5FF]">
          Alt + Q
        </kbd>{' '}
        at any moment to exit immediately.
      </div>
    </div>
  )
}
