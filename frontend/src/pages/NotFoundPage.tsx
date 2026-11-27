import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/common/Button'
import { SafeHERLogo } from '../components/common/SafeHERLogo'
import { useI18n } from '../contexts/I18nContext'

export const NotFoundPage: React.FC = () => {
  const { t } = useI18n()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <SafeHERLogo size="lg" animate />
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#d5ff54]">
        {t.notFound.code} · ROUTE NOT FOUND
      </div>
      <h2 className="font-display text-4xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb]">
        {t.notFound.title}
      </h2>
      <p className="text-xs text-[#929b93] max-w-sm">
        {t.notFound.description}
      </p>
      <Link to="/">
        <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          {t.notFound.backHome}
        </Button>
      </Link>
    </div>
  )
}
