import React from 'react'
import { SafeHERSectionHeader } from '../ui/SafeHERPrimitives'

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  index?: string
  badge?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  index,
  badge,
  action,
  className,
}) => {
  return (
    <SafeHERSectionHeader
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      index={index}
      badge={badge}
      action={action}
      className={className}
    />
  )
}
