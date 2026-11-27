import React from 'react'
import { cn } from '../../utils/cn'
import { SafeHERBadge } from './SafeHERPrimitives'

/* -------------------------------------------------------------------------- */
/* SafeHERTabs                                                                */
/* -------------------------------------------------------------------------- */

export interface SafeHERTabItem {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

export interface SafeHERTabsProps {
  items: SafeHERTabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export const SafeHERTabs: React.FC<SafeHERTabsProps> = ({
  items,
  activeId,
  onChange,
  className,
}) => (
  <div
    role="tablist"
    className={cn(
      'flex flex-wrap items-center gap-2 border-b border-[rgba(225,239,221,0.15)] pb-3',
      className
    )}
  >
    {items.map((item) => {
      const isActive = item.id === activeId
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(item.id)}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-[3px] border font-mono text-[10px] uppercase tracking-[0.12em] transition-all',
            isActive
              ? 'bg-[#d5ff54]/12 text-[#d5ff54] border-[#d5ff54]/45 font-semibold'
              : 'bg-transparent text-[#929b93] border-transparent hover:text-[#f0f2eb] hover:bg-[#111716]'
          )}
        >
          {item.icon}
          <span>{item.label}</span>
          {typeof item.count === 'number' && (
            <span className="opacity-75">({item.count})</span>
          )}
        </button>
      )
    })}
  </div>
)

/* -------------------------------------------------------------------------- */
/* SafeHERTables                                                              */
/* -------------------------------------------------------------------------- */

export const SafeHERTableContainer: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div
    className={cn(
      'overflow-hidden bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-[4px]',
      className
    )}
  >
    <div className="overflow-x-auto">{children}</div>
  </div>
)

export const SafeHERTable: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => (
  <table className={cn('w-full text-left text-xs border-collapse', className)} {...props}>
    {children}
  </table>
)

export const SafeHERTableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead
    className={cn(
      'bg-[#111716] text-[#929b93] border-b border-[rgba(225,239,221,0.15)] font-mono uppercase text-[10px] tracking-[0.14em]',
      className
    )}
    {...props}
  >
    {children}
  </thead>
)

export const SafeHERTableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody
    className={cn('divide-y divide-[rgba(225,239,221,0.10)] text-[#f0f2eb]', className)}
    {...props}
  >
    {children}
  </tbody>
)

/* -------------------------------------------------------------------------- */
/* SafeHERTimelineItem                                                        */
/* -------------------------------------------------------------------------- */

export interface SafeHERTimelineItemProps {
  icon: React.ReactNode
  title: string
  badge?: string
  badgeVariant?: 'primary' | 'safe' | 'warning' | 'neutral'
  timestamp: string
  description: string
  meta?: React.ReactNode
}

export const SafeHERTimelineItem: React.FC<SafeHERTimelineItemProps> = ({
  icon,
  title,
  badge,
  badgeVariant = 'neutral',
  timestamp,
  description,
  meta,
}) => (
  <div className="relative group">
    <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-[3px] bg-[#070908] border border-[rgba(213,255,84,0.35)] flex items-center justify-center">
      {icon}
    </div>
    <div className="bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-[4px] p-4 transition-colors duration-150 hover:border-[rgba(213,255,84,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-xs font-semibold text-[#f0f2eb] font-sans">{title}</h4>
          {badge && (
            <SafeHERBadge variant={badgeVariant} size="sm">
              {badge}
            </SafeHERBadge>
          )}
        </div>
        <span className="text-[10px] text-[#929b93] font-mono tracking-[0.1em]">
          {timestamp}
        </span>
      </div>
      <p className="text-xs text-[#929b93] leading-relaxed font-sans">{description}</p>
      {meta && (
        <div className="mt-2.5 pt-2 border-t border-[rgba(225,239,221,0.12)]">
          {meta}
        </div>
      )}
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* SafeHERNavigationLink                                                      */
/* -------------------------------------------------------------------------- */

export interface SafeHERNavItemProps {
  active?: boolean
  icon?: React.ReactNode
  label: string
  badge?: string
  onClick?: () => void
  className?: string
}

export const SafeHERNavContent: React.FC<SafeHERNavItemProps> = ({
  active = false,
  icon,
  label,
  badge,
}) => (
  <div className="flex items-center justify-between w-full gap-2">
    <div className="flex items-center gap-3 min-w-0">
      {icon && <span className={cn('shrink-0', active ? 'text-[#d5ff54]' : 'text-[#929b93]')}>{icon}</span>}
      <span className="truncate">{label}</span>
    </div>
    {badge && (
      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#d5ff54]/12 text-[#d5ff54] border border-[#d5ff54]/30 font-mono uppercase tracking-[0.1em] shrink-0">
        {badge}
      </span>
    )}
  </div>
)
