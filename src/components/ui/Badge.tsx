import type { ReactNode } from 'react'

export type Tone = 'success' | 'warning' | 'danger' | 'accent' | 'neutral'

const TONES: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  accent: 'bg-emerald-100 text-emerald-800',
  neutral: 'bg-slate-100 text-slate-600',
}

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  /** Show a small leading dot */
  dot?: boolean
  className?: string
}

export function Badge({ tone = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
