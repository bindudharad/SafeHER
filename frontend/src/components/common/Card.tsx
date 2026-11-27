import React from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export const Card: React.FC<CardProps> = ({ className, glass = true, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-[4px] border transition-all duration-200 text-left',
        glass
          ? 'bg-[#0d1110]/90 backdrop-blur-xl border-[rgba(225,239,221,0.15)] shadow-[0_14px_36px_rgba(0,0,0,0.45)] hover:border-[rgba(213,255,84,0.38)]'
          : 'bg-[#111716] border-[rgba(225,239,221,0.15)] shadow-[0_10px_28px_rgba(0,0,0,0.4)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'px-6 py-5 border-b border-[rgba(225,239,221,0.15)] flex items-center justify-between gap-4',
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={cn(
      'font-display text-xl font-bold uppercase tracking-wide text-[#f0f2eb]',
      className
    )}
    {...props}
  >
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs text-[#929b93] mt-1 font-sans', className)} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'px-6 py-4 border-t border-[rgba(225,239,221,0.15)] flex items-center justify-between',
      className
    )}
    {...props}
  >
    {children}
  </div>
)
