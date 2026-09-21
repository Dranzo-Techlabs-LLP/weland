import { NavLink } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { navItems } from './navItems'
import { useAuth } from '../auth/AuthContext'
import { PROPERTY_NAME, PROPERTY_TAGLINE } from '../lib/config'
import { initials } from '../lib/format'

interface SidebarProps {
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const items = navItems.filter((item) => user?.rights.includes(item.right))

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-4">
        <img src="/weland-logo.png" alt={PROPERTY_NAME} className="h-9 w-9 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 leading-tight">
          <div className="truncate font-serif text-[15px] font-semibold text-dark">{PROPERTY_NAME}</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">{PROPERTY_TAGLINE}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer: user + sign out */}
      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
            {user ? initials(user.name) : '—'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
            <div className="truncate text-xs text-slate-500">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={18} className="text-slate-400" />
          Sign out
        </button>
      </div>
    </div>
  )
}
