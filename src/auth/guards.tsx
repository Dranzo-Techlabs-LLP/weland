import type { ReactElement } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { can, useAuth } from './AuthContext'

/** Full-screen spinner shown while we verify an existing session. */
function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700" />
    </div>
  )
}

/** Gate the whole app behind a signed-in user. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Gate a route behind a specific permission; otherwise bounce to the dashboard. */
export function RequireRight({ right, children }: { right: string; children: ReactElement }) {
  const { user } = useAuth()
  if (!can(user, right)) return <Navigate to="/" replace />
  return children
}
