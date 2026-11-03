import { useEffect, useMemo, useState } from 'react'
import { Download, ExternalLink, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { api, ApiError } from '../lib/api'
import { fmtDate, formatINR, TODAY_ISO } from '../lib/format'
import { DEPOSIT_METHODS, DEPOSIT_PILL } from '../lib/permissions'
import { dangerBtnCls, inputCls, primaryBtnCls, secondaryBtnCls, selectCls, textareaCls, thCls, thRightCls } from '../components/styles'
import { Modal } from '../components/ui/Modal'
import type { Deposit } from '../types'

const MAX_BYTES = 5 * 1024 * 1024 // same limit as the server
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf'
const BLANK = { date: TODAY_ISO, amount: '', method: 'Bank', note: '' }

// Photos bigger than this are shrunk in the browser first, so they also fit a server
// that only accepts small uploads (cPanel's default PHP limit is 2 MB).
const SHRINK_OVER = 1.5 * 1024 * 1024

/** A large photo as a smaller JPEG (white behind any transparency); anything else, or on failure, unchanged. */
async function shrinkImage(f: File): Promise<File> {
  if (!f.type.startsWith('image/') || f.size <= SHRINK_OVER || typeof createImageBitmap !== 'function') return f
  try {
    const bmp = await createImageBitmap(f)
    for (const [max, quality] of [[2000, 0.82], [1600, 0.75], [1280, 0.7]] as const) {
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bmp.width * scale))
      canvas.height = Math.max(1, Math.round(bmp.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return f
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= SHRINK_OVER) return new File([blob], `${f.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
    }
  } catch { /* keep the original */ }
  return f
}

const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** A clearer message for the cases a fresh install runs into. */
function saveError(e: unknown): string {
  const msg = e instanceof Error ? e.message : 'Could not save. Please try again.'
  if (e instanceof ApiError && e.status === 404 && msg.startsWith('Not found:')) {
    return 'The server needs the latest update (api/index.php and api/lib.php) before deposits can be saved.'
  }
  if (/cash_deposits/i.test(msg) && /exist/i.test(msg)) {
    return 'Run the database step (weland-migrate.sql in phpMyAdmin) before saving deposits.'
  }
  return msg
}

/** The deposit's attachment: fetched with the session, then shown (photo) or opened (PDF). */
function AttachmentViewer({ deposit, onClose }: { deposit: Deposit; onClose: () => void }) {
  const a = deposit.attachment!
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    let made = ''
    api.depositAttachment(deposit.id)
      .then((blob) => {
        if (!alive) return
        made = URL.createObjectURL(blob)
        setUrl(made)
      })
      .catch((e: unknown) => { if (alive) setErr(e instanceof Error ? e.message : 'Could not open the attachment.') })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [deposit.id])
  const isImage = a.type.startsWith('image/')
  return (
    <Modal title="Attachment" onClose={onClose}>
      <p className="mb-3 truncate text-[13px] text-slate-500">{a.name} · {sizeLabel(a.size)} · {fmtDate(deposit.date)} · {formatINR(deposit.amount)}</p>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
      {!err && !url && <p className="py-8 text-center text-sm text-slate-500">Loading…</p>}
      {url && isImage && <img src={url} alt={a.name} className="max-h-[60vh] w-full rounded-lg border border-slate-200 object-contain" />}
      {url && !isImage && <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">PDF document. Open it in a new tab or download it.</p>}
      <div className="mt-5 flex justify-end gap-2">
        {url && <a href={url} target="_blank" rel="noreferrer" className={secondaryBtnCls}><ExternalLink size={15} /> Open</a>}
        {url && <a href={url} download={a.name} className={primaryBtnCls}><Download size={15} /> Download</a>}
      </div>
    </Modal>
  )
}

export function Deposits() {
  const { user } = useAuth()
  const { data, addDeposit, updateDeposit, deleteDeposit } = useStore()
  const canEdit = can(user, 'edit_deposits')

  const [method, setMethod] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK)
  const [file, setFile] = useState<File | null>(null)
  const [shrunkFrom, setShrunkFrom] = useState(0) // original size when the photo was shrunk
  const [removeFile, setRemoveFile] = useState(false)
  const [fileKey, setFileKey] = useState(0) // remounting the input clears it
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<Deposit | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const rows = useMemo(
    () => data.deposits.filter((d) => (method === 'All' || d.method === method) && (!from || d.date >= from) && (!to || d.date <= to)),
    [data.deposits, method, from, to],
  )
  const total = rows.reduce((s, d) => s + d.amount, 0)
  const byMethod = DEPOSIT_METHODS.map((m) => ({ m, sum: rows.filter((d) => d.method === m).reduce((s, d) => s + d.amount, 0) }))
  const editing = editId ? data.deposits.find((d) => d.id === editId) : undefined
  const delRow = delId ? data.deposits.find((d) => d.id === delId) : undefined

  function resetFile() {
    setFile(null)
    setShrunkFrom(0)
    setRemoveFile(false)
    setFileKey((k) => k + 1)
  }
  function startAdd() {
    setForm(BLANK)
    resetFile()
    setErr('')
    setEditId(null)
    setOpen(true)
  }
  function startEdit(d: Deposit) {
    setForm({ date: d.date, amount: String(d.amount), method: d.method, note: d.note })
    resetFile()
    setErr('')
    setEditId(d.id)
    setOpen(true)
  }
  async function pickFile(picked: File | null) {
    setErr('')
    if (!picked) { setFile(null); setShrunkFrom(0); return }
    if (!OK_TYPES.includes(picked.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(picked.name)) {
      setErr('Attach a photo (JPG, PNG or WebP) or a PDF.')
      resetFile()
      return
    }
    const f = await shrinkImage(picked)
    if (f.size > MAX_BYTES) {
      setErr(`The file is ${sizeLabel(f.size)}. The limit is 5 MB.`)
      resetFile()
      return
    }
    setFile(f)
    setShrunkFrom(f === picked ? 0 : picked.size)
    setRemoveFile(false)
  }
  async function save() {
    const amount = Number(form.amount)
    if (!form.date) { setErr('Enter the date the money was deposited.'); return }
    if (!Number.isInteger(amount) || amount < 1) { setErr('Enter the amount in whole rupees (at least ₹1).'); return }
    if (form.note.length > 1000) { setErr('Keep the note under 1,000 characters.'); return }
    setErr('')
    setSaving(true)
    try {
      const payload = { date: form.date, amount, method: form.method, note: form.note.trim(), file, removeAttachment: removeFile }
      if (editId) await updateDeposit(editId, payload)
      else await addDeposit(payload)
      setOpen(false)
      setEditId(null)
      resetFile()
    } catch (e) {
      setErr(saveError(e))
    } finally {
      setSaving(false)
    }
  }
  async function confirmDelete() {
    if (!delId) return
    setDeleting(true)
    await deleteDeposit(delId)
    setDeleting(false)
    setDelId(null)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Cash Deposit</h1>
          <p className="mt-1 text-sm text-slate-500">Money deposited to the bank or handed over, with the slip or receipt attached.</p>
        </div>
        {canEdit && !open && <button onClick={startAdd} className={primaryBtnCls}><Plus size={16} /> Add deposit</button>}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total deposited</div>
          <div className="nums mt-1.5 text-xl font-semibold text-emerald-700">{formatINR(total)}</div>
          <div className="mt-0.5 text-xs text-slate-400">{rows.length} {rows.length === 1 ? 'deposit' : 'deposits'} shown</div>
        </div>
        {byMethod.map(({ m, sum }) => (
          <div key={m} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">By {m}</div>
            <div className="nums mt-1.5 text-xl font-semibold text-slate-900">{formatINR(sum)}</div>
          </div>
        ))}
      </div>

      {open && canEdit && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-semibold text-slate-900">{editId ? 'Edit deposit' : 'Add deposit'}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Date deposited</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} w-full`} /></label>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Amount (₹)</span><input type="number" min={1} step={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputCls} w-full`} placeholder="0" /></label>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Deposited via</span>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={`${selectCls} w-full`}>
                {DEPOSIT_METHODS.map((m) => (<option key={m}>{m}</option>))}
              </select>
            </label>
            <label className="block sm:col-span-3"><span className="mb-1 block text-[13px] font-medium text-slate-700">Note</span><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={textareaCls} placeholder="Bank / branch, who deposited, reference no.…" /></label>
            <div className="sm:col-span-3">
              <span className="mb-1 block text-[13px] font-medium text-slate-700">Attachment</span>
              <input
                key={fileKey}
                type="file"
                accept={ACCEPT}
                onChange={(e) => { void pickFile(e.target.files?.[0] ?? null) }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-800 hover:file:bg-emerald-100"
              />
              <span className="mt-1 block text-xs text-slate-500">Photo (JPG, PNG, WebP) or PDF of the deposit slip or receipt, up to 5 MB. Large photos are made smaller automatically.</span>
              {file && <span className="mt-1 block text-xs text-emerald-700">Selected: {file.name} ({sizeLabel(file.size)}{shrunkFrom ? `, made smaller from ${sizeLabel(shrunkFrom)}` : ''})</span>}
              {!file && editing?.attachment && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                  <span className={removeFile ? 'text-slate-400 line-through' : 'text-slate-700'}><Paperclip size={13} className="mr-1 inline" />{editing.attachment.name} ({sizeLabel(editing.attachment.size)})</span>
                  {!removeFile && <button type="button" onClick={() => setViewing(editing)} className="font-medium text-emerald-700 hover:underline">View</button>}
                  <label className="inline-flex items-center gap-1.5 text-slate-600">
                    <input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600/30" />
                    Remove attachment
                  </label>
                  <span className="text-xs text-slate-400">Choosing a new file replaces it.</span>
                </div>
              )}
            </div>
          </div>
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={saving} className={primaryBtnCls}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Save deposit'}</button>
            <button onClick={() => { setOpen(false); setEditId(null) }} disabled={saving} className={secondaryBtnCls}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Deposited via</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls}>
            <option>All</option>
            {DEPOSIT_METHODS.map((m) => (<option key={m}>{m}</option>))}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
        {(method !== 'All' || from || to) && <button onClick={() => { setMethod('All'); setFrom(''); setTo('') }} className="pb-2 text-sm text-slate-500 hover:text-slate-900">Clear filters</button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={thCls}>Date</th><th className={thCls}>Deposited via</th><th className={thRightCls}>Amount</th>
                <th className={thCls}>Note</th><th className={thCls}>Attachment</th><th className={thCls}>Recorded by</th><th className={thRightCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="nums whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(d.date)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DEPOSIT_PILL[d.method] ?? 'bg-slate-100 text-slate-600'}`}>{d.method}</span></td>
                  <td className="nums px-4 py-3 text-right font-semibold text-emerald-700">{formatINR(d.amount)}</td>
                  <td className="max-w-[280px] whitespace-pre-line px-4 py-3 text-slate-700">{d.note || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {d.attachment
                      ? <button onClick={() => setViewing(d)} className="inline-flex max-w-[200px] items-center gap-1.5 text-emerald-700 hover:underline" title={d.attachment.name}><Paperclip size={14} className="shrink-0" /><span className="truncate">{d.attachment.name}</span></button>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.createdBy || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <span className="inline-flex items-center gap-2">
                        <button onClick={() => startEdit(d)} className="text-slate-400 hover:text-emerald-700" aria-label="Edit deposit"><Pencil size={15} /></button>
                        <button onClick={() => setDelId(d.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete deposit"><Trash2 size={15} /></button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">{data.deposits.length ? 'No deposits for these filters.' : 'No deposits recorded yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && viewing.attachment && <AttachmentViewer deposit={viewing} onClose={() => setViewing(null)} />}

      {delRow && (
        <Modal title="Delete this deposit?" onClose={() => { if (!deleting) setDelId(null) }}>
          <p className="text-sm leading-relaxed text-slate-600">
            Remove the <span className="font-semibold text-slate-900">{delRow.method}</span> deposit of{' '}
            <span className="nums font-semibold text-slate-900">{formatINR(delRow.amount)}</span> on {fmtDate(delRow.date)}
            {delRow.attachment ? ' and its attachment' : ''}? This <span className="font-semibold">cannot be undone.</span>
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setDelId(null)} disabled={deleting} className={secondaryBtnCls}>Keep it</button>
            <button onClick={confirmDelete} disabled={deleting} className={`${dangerBtnCls} disabled:opacity-60`}>{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
