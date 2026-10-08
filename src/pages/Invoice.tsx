import { useState } from 'react'
import { FileText } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { inputCls, primaryBtnCls, textareaCls } from '../components/styles'

const MAX_TERMS = 20000

export function Invoice() {
  const { user } = useAuth()
  const { data, saveInvoice } = useStore()
  const s = data.invoice
  const canEdit = can(user, 'edit_invoice')

  const [prefix, setPrefix] = useState(s.prefix)
  const [next, setNext] = useState(String(s.next))
  const [padding, setPadding] = useState(String(s.padding))
  const [terms, setTerms] = useState(s.terms)
  const [showPayments, setShowPayments] = useState(!!s.showPayments)
  const [showB2b, setShowB2b] = useState(!!s.showB2b)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const pad = Math.max(1, Math.min(10, Number(padding) || 1))
  const nextNum = Number(next) || 0
  const preview = (n: number) => `${prefix}${String(n).padStart(pad, '0')}`

  async function save() {
    setMsg('')
    setErr('')
    setSaving(true)
    try {
      // The "show on invoice" options are sent only when changed
      await saveInvoice({
        prefix, next: nextNum, padding: pad, terms,
        ...(showPayments !== !!s.showPayments ? { showPayments } : {}),
        ...(showB2b !== !!s.showB2b ? { showB2b } : {}),
      })
      setMsg('Invoice settings saved.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoice settings</h1>
        <p className="mt-1 text-sm text-slate-500">Control the reference series and the terms &amp; conditions printed on every invoice.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Reference number</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-slate-700">Prefix <span className="text-red-500">*</span></span>
              <input value={prefix} onChange={(e) => setPrefix(e.target.value.slice(0, 20))} disabled={!canEdit} className={`${inputCls} h-10 w-full disabled:bg-slate-50`} />
              <span className="mt-1 block text-xs text-slate-500">Goes in front of the number. Up to 20 characters. Slashes, dashes, and letters are fine.</span>
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-slate-700">Next number <span className="text-red-500">*</span></span>
                <input type="number" min={0} value={next} onChange={(e) => setNext(e.target.value)} disabled={!canEdit} className={`${inputCls} h-10 w-full disabled:bg-slate-50`} />
                <span className="mt-1 block text-xs text-slate-500">The number the next new booking will use.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-slate-700">Padding (digits) <span className="text-red-500">*</span></span>
                <input type="number" min={1} max={10} value={padding} onChange={(e) => setPadding(e.target.value)} disabled={!canEdit} className={`${inputCls} h-10 w-full disabled:bg-slate-50`} />
                <span className="mt-1 block text-xs text-slate-500">Pads with leading zeros, e.g. 5 → 00001.</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><FileText size={16} className="text-emerald-600" /> Preview</h2>
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Next booking</div>
            <div className="nums mt-0.5 text-lg font-semibold text-slate-900">{preview(nextNum)}</div>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">After that</div>
            <div className="nums mt-0.5 text-slate-500">{preview(nextNum + 1)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Show on invoice</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">Tick an option to print it on every invoice. Left unticked, it isn't shown.</p>
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={showPayments} onChange={(e) => setShowPayments(e.target.checked)} disabled={!canEdit} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700/30 disabled:opacity-60" />
            <span>
              <span className="block text-sm font-medium text-slate-900">Payment entries</span>
              <span className="block text-[13px] text-slate-500">List every payment, advance and refund (date, method, reference, amount), not only the total paid.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={showB2b} onChange={(e) => setShowB2b(e.target.checked)} disabled={!canEdit} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700/30 disabled:opacity-60" />
            <span>
              <span className="block text-sm font-medium text-slate-900">B2B commission</span>
              <span className="block text-[13px] text-slate-500">List the booking's B2B commission entries and the total, with the net amount after commission.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Terms &amp; conditions</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">Printed on a separate second page of every invoice. Leave blank to omit the page entirely. Each line becomes its own line on the invoice.</p>
        <textarea rows={10} value={terms} onChange={(e) => setTerms(e.target.value.slice(0, MAX_TERMS))} disabled={!canEdit} className={`${textareaCls} mt-3 font-mono text-[13px] disabled:bg-slate-50`} />
        <div className="mt-1 text-right text-xs text-slate-400"><span className="nums">{terms.length.toLocaleString('en-IN')}</span> / {MAX_TERMS.toLocaleString('en-IN')} characters</div>
      </div>

      {canEdit ? (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={saving} className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}>{saving ? 'Saving…' : 'Save'}</button>
          {msg && <span className="text-sm text-emerald-700">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-slate-400">You have read-only access to invoice settings.</p>
      )}
    </>
  )
}
