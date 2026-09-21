import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  subtext?: string
  icon: ReactNode
  /** Render the value in the emerald accent (e.g. revenue) */
  accent?: boolean
}

export function StatTile({ label, value, subtext, icon, accent = false }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-medium tracking-wide text-slate-500 uppercase">{label}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            accent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </span>
      </div>
      <div
        className={`nums mt-3 text-2xl font-semibold tracking-tight ${
          accent ? 'text-emerald-700' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
      {subtext && <div className="mt-1 text-[12px] text-slate-500">{subtext}</div>}
    </div>
  )
}
