import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useStore } from '../data/store'

/** Loading spinner + error banner around the routed page content. */
function StoreGate() {
  const { loading, error, clearError, reload, data } = useStore()
  const firstLoad = loading && data.roles.length === 0

  if (firstLoad) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700" />
      </div>
    )
  }
  return (
    <>
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button onClick={reload} className="font-semibold text-red-700 underline hover:text-red-800">Retry</button>
          <button onClick={clearError} aria-label="Dismiss" className="text-red-400 hover:text-red-700"><X size={16} /></button>
        </div>
      )}
      <Outlet />
    </>
  )
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block print:hidden">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden print:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-dark/40 transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Main column */}
      <div className="lg:pl-64 print:pl-0">
        <div className="print:hidden">
          <Topbar onMenu={() => setMobileOpen(true)} />
        </div>
        <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          <StoreGate />
        </main>
      </div>
    </div>
  )
}
