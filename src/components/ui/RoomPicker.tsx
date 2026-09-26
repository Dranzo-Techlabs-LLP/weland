import { ROOM_NAMES } from '../../lib/config'

function chipCls(active: boolean, tone: 'room' | 'full' = 'room') {
  if (active) return tone === 'full'
    ? 'rounded-lg border px-3 py-1.5 text-sm font-medium border-[#7c2d12] bg-[#7c2d12] text-white'
    : 'rounded-lg border px-3 py-1.5 text-sm font-medium border-emerald-700 bg-emerald-700 text-white'
  return 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50'
}

/** Room multi-select + Full Property. Used by New/Edit booking, Expenses and Users. */
export function RoomPicker({
  rooms, fullProperty, onChange, fullHint = 'Whole property booked.', emptyHint = 'Pick one or more rooms, or Full Property.',
}: {
  rooms: string[]
  fullProperty: boolean
  onChange: (rooms: string[], full: boolean) => void
  fullHint?: string
  emptyHint?: string
}) {
  const toggleRoom = (r: string) => {
    if (fullProperty) return
    onChange(rooms.includes(r) ? rooms.filter((x) => x !== r) : [...rooms, r], false)
  }
  const toggleFull = () => onChange(fullProperty ? rooms : [], !fullProperty)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ROOM_NAMES.map((r) => (
          <button type="button" key={r} onClick={() => toggleRoom(r)} disabled={fullProperty}
            className={`${chipCls(rooms.includes(r))} disabled:opacity-40`}>{r}</button>
        ))}
        <button type="button" onClick={toggleFull} className={chipCls(fullProperty, 'full')}>Full Property</button>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        {fullProperty ? fullHint : rooms.length ? `Selected: ${rooms.join(', ')}` : emptyHint}
      </p>
    </div>
  )
}
