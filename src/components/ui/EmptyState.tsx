import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-[15px] font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-xs text-[13px] text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
