import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Remove inner padding (e.g. when the card wraps a full-bleed table) */
  flush?: boolean
}

export function Card({ children, className = '', flush = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${flush ? '' : 'p-5'} ${className}`}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h2 className="font-display text-[15px] font-semibold text-text">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
