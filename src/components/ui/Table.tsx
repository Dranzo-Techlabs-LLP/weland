import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'

/** Card-wrapped, horizontally scrollable table shell. */
export function TableCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
      </div>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50">
      <tr>{children}</tr>
    </thead>
  )
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export function Th({ children, numeric = false, className = '', ...props }: ThProps) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase ${
        numeric ? 'text-right' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </th>
  )
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-200">{children}</tbody>
}

export function Tr({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={`transition-colors hover:bg-slate-50 ${className}`}>{children}</tr>
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export function Td({ children, numeric = false, className = '', ...props }: TdProps) {
  return (
    <td
      className={`px-4 py-3.5 align-middle text-slate-700 ${numeric ? 'nums text-right' : ''} ${className}`}
      {...props}
    >
      {children}
    </td>
  )
}
