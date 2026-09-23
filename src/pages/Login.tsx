import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PROPERTY_NAME } from '../lib/config'
import { inputCls } from '../components/styles'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await login(email, password)
    setSubmitting(false)
    if (res.ok) navigate('/', { replace: true })
    else setError(res.error || 'Sign in failed.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src={`${import.meta.env.BASE_URL}weland-logo.png`} alt={PROPERTY_NAME} className="mx-auto mb-3 h-24 w-24 rounded-full shadow-sm" />
          <h1 className="text-2xl font-semibold tracking-tight text-dark">{PROPERTY_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500">Property admin</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-slate-700">Email</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={`${inputCls} h-10 w-full`} />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-slate-700">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${inputCls} h-10 w-full`} />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="h-10 w-full rounded-lg bg-emerald-700 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
