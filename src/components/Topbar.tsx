import { Menu } from 'lucide-react'
import { PROPERTY_NAME } from '../lib/config'

interface TopbarProps {
  onMenu: () => void
}

/** Mobile-only top bar (desktop uses the sidebar). */
export function Topbar({ onMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-canvas/85 px-5 backdrop-blur-sm lg:hidden">
      <button
        onClick={onMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>
      <img src="/weland-logo.png" alt={PROPERTY_NAME} className="h-8 w-8 rounded-full object-cover" />
      <span className="text-lg font-semibold text-dark">{PROPERTY_NAME}</span>
    </header>
  )
}
