import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { effectiveRate, useStore } from '../data/store'
import { ROOMS, roomColor, type RoomConfig } from '../lib/config'
import { formatINR } from '../lib/format'
import { inputCls, primaryBtnCls, secondaryBtnCls, textareaCls } from '../components/styles'

function DetailRow({ label, value, valueClass = 'text-slate-900' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

function RoomCard({ r, canEdit }: { r: RoomConfig; canEdit: boolean }) {
  const { data, saveVillaOverride } = useStore()
  const rate = effectiveRate(r.name, data)
  const override = data.villaOverrides[r.name]
  const notes = override?.notes ?? ''
  const minGuests = (r.editableCapacity && override?.minGuests) || r.minGuests
  const maxGuests = (r.editableCapacity && override?.maxGuests) || r.maxGuests
  const [editing, setEditing] = useState(false)
  const [rateInput, setRateInput] = useState(String(rate))
  const [notesInput, setNotesInput] = useState(notes)
  const [minInput, setMinInput] = useState(String(minGuests))
  const [maxInput, setMaxInput] = useState(String(maxGuests))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setRateInput(String(rate))
    setNotesInput(notes)
    setMinInput(String(minGuests))
    setMaxInput(String(maxGuests))
    setError('')
    setEditing(true)
  }
  async function save() {
    const capacity: { minGuests?: number; maxGuests?: number } = {}
    if (r.editableCapacity) {
      const min = Number(minInput), max = Number(maxInput)
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < 1 || min > 10000 || max > 10000) {
        setError('Capacity must be a whole number between 1 and 10,000 guests.'); return
      }
      if (min > max) { setError("Minimum guests can't be more than maximum guests."); return }
      // Only send capacity when it changed, so the config default stays in use until then.
      if (min !== minGuests || max !== maxGuests) {
        capacity.minGuests = min
        capacity.maxGuests = max
      }
    }
    const baseRate = Number(rateInput)
    if (rateInput.trim() === '' || !Number.isInteger(baseRate) || baseRate < 0 || baseRate > 10000000) {
      setError('Enter a base rate in whole rupees, between ₹0 and ₹1,00,00,000.'); return
    }
    setError('')
    setSaving(true)
    try {
      await saveVillaOverride(r.name, { baseRate, notes: notesInput, ...capacity })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: roomColor(r.name) }} />
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">{r.name}</h3>
            <p className="text-xs text-slate-400">{r.slug}</p>
          </div>
        </div>
        {canEdit && !editing && <button onClick={startEdit} className="text-slate-400 hover:text-emerald-700" aria-label="Edit room"><Pencil size={15} /></button>}
      </div>

      {!editing ? (
        <div className="mt-4 divide-y divide-slate-100">
          <DetailRow label="Capacity" value={`${minGuests}–${maxGuests} guests`} />
          <DetailRow label="Base rate" value={<span className="nums">{formatINR(rate)}</span>} />
          <DetailRow label="Status" value={r.status} valueClass={r.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'} />
          {notes && <p className="pt-2 text-[13px] text-slate-500">{notes}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {r.editableCapacity && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Min guests</span><input type="number" min={1} value={minInput} onChange={(e) => setMinInput(e.target.value)} className={`${inputCls} w-full`} /></label>
              <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Max guests</span><input type="number" min={1} value={maxInput} onChange={(e) => setMaxInput(e.target.value)} className={`${inputCls} w-full`} /></label>
            </div>
          )}
          <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Base rate (₹ / night)</span><input type="number" min={0} value={rateInput} onChange={(e) => setRateInput(e.target.value)} className={`${inputCls} w-full`} /></label>
          <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Notes / settings</span><textarea rows={2} value={notesInput} onChange={(e) => setNotesInput(e.target.value)} className={textareaCls} /></label>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <div className="flex gap-2"><button onClick={save} disabled={saving} className={primaryBtnCls}>{saving ? 'Saving…' : 'Save'}</button><button onClick={() => setEditing(false)} disabled={saving} className={secondaryBtnCls}>Cancel</button></div>
        </div>
      )}
    </div>
  )
}

export function Rooms() {
  const { user } = useAuth()
  const canEdit = can(user, 'edit_villas')
  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rooms</h1></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROOMS.map((r) => (<RoomCard key={r.id} r={r} canEdit={canEdit} />))}
      </div>
    </>
  )
}
