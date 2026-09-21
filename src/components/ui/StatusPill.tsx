const MAP: Record<string, string> = {
  enquiry: 'bg-slate-100 text-slate-600',
  hold: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  'checked in': 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}

function label(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MAP[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {label(status)}
    </span>
  )
}
