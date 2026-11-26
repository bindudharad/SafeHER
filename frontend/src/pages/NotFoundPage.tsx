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
      <h2 className="text-xl font-bold text-[#F4F5FF]">{t.notFound.title}</h2>
      <p className="text-xs text-[#A6AEC8] max-w-sm">
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
