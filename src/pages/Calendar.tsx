import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { bookingHasRoom, FULL_PROPERTY, ROOMS, ROOM_OPTIONS, roomColor } from '../lib/config'
import { monthLabel, parseISO, TODAY } from '../lib/format'
import { secondaryBtnCls, selectCls } from '../components/styles'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY = 86400000
const MAX_LANES = 3
const LANE_H = 20

// Short badge shown on the bar for non-plain statuses (H = hold, E = enquiry…)
const STATUS_BADGE: Record<string, string> = { hold: 'H', enquiry: 'E', 'checked in': 'IN', completed: '✓' }

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function addDays(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }

interface Seg { ref: string; guest: string; villa: string; status: string; startCol: number; endCol: number; isStart: boolean; isEnd: boolean; lane: number }

export function Calendar() {
  const { data } = useStore()
  const [cursor, setCursor] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [villa, setVilla] = useState('All rooms')
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const bookings = useMemo(
    () => data.bookings.filter((b) => (villa === 'All rooms' || bookingHasRoom(b.villa, villa)) && b.status !== 'cancelled'),
    [data.bookings, villa],
  )

  const weeks = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const numWeeks = Math.ceil((firstWeekday + daysInMonth) / 7)
    const gridStart = new Date(year, month, 1 - firstWeekday)
    const out: Date[][] = []
    for (let w = 0; w < numWeeks; w++) {
      const row: Date[] = []
      for (let d = 0; d < 7; d++) row.push(addDays(gridStart, w * 7 + d))
      out.push(row)
    }
    return out
  }, [year, month])

  function segmentsForWeek(week: Date[]): Seg[] {
    const day0 = week[0]
    const day6 = week[6]
    const items: Seg[] = []
    for (const b of bookings) {
      const ci = parseISO(b.checkIn)
      const co = parseISO(b.checkOut)
      if (co.getTime() <= ci.getTime()) continue
      const lastNight = addDays(co, -1)
      if (ci.getTime() > day6.getTime() || lastNight.getTime() < day0.getTime()) continue
      const segStart = ci.getTime() > day0.getTime() ? ci : day0
      const segEnd = lastNight.getTime() < day6.getTime() ? lastNight : day6
      items.push({
        ref: b.ref, guest: b.guest, villa: b.villa, status: b.status,
        startCol: Math.round((startOfDay(segStart).getTime() - day0.getTime()) / DAY),
        endCol: Math.round((startOfDay(segEnd).getTime() - day0.getTime()) / DAY),
        isStart: sameDay(segStart, ci), isEnd: sameDay(segEnd, lastNight), lane: 0,
      })
    }
    items.sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol)
    const laneEnds: number[] = []
    for (const it of items) {
      let lane = 0
      while (lane < laneEnds.length && laneEnds[lane] >= it.startCol) lane++
      it.lane = lane
      laneEnds[lane] = it.endCol
    }
    return items
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Booking calendar</h1>
        <p className="mt-1 text-sm text-slate-500">Occupancy across your rooms, colored by room. Click any booking to open it.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={villa} onChange={(e) => setVilla(e.target.value)} className={selectCls}>
          <option>All rooms</option>
          {ROOM_OPTIONS.map((v) => (<option key={v}>{v}</option>))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))} className={secondaryBtnCls}>Today</button>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft size={17} /></button>
          <div className="min-w-[150px] text-center text-lg font-semibold text-slate-900">{monthLabel(year, month)}</div>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Next month"><ChevronRight size={17} /></button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="hidden sm:inline">{w}</span><span className="sm:hidden">{w[0]}</span>
            </div>
          ))}
        </div>
        <div>
          {weeks.map((week, wi) => {
            const segs = segmentsForWeek(week)
            const hiddenByDay = week.map((_, di) => segs.filter((s) => s.lane >= MAX_LANES && s.startCol <= di && s.endCol >= di).length)
            return (
              <div key={wi} className="relative grid grid-cols-7 border-b border-slate-100 last:border-0" style={{ minHeight: 116 }}>
                {week.map((d, di) => {
                  const inMonth = d.getMonth() === month
                  const isToday = sameDay(d, TODAY)
                  return (
                    <div key={di} className="border-r border-slate-100 p-1.5 last:border-0">
                      <div className="flex justify-end">
                        <span className={`nums flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-emerald-700 font-semibold text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>{d.getDate()}</span>
                      </div>
                      {hiddenByDay[di] > 0 && <div className="mt-auto pt-1 text-center text-[10px] font-medium text-slate-400">+{hiddenByDay[di]} more</div>}
                    </div>
                  )
                })}
                <div className="pointer-events-none absolute inset-x-0" style={{ top: 34 }}>
                  {segs.filter((s) => s.lane < MAX_LANES).map((s, i) => {
                    const leftPct = (s.startCol / 7) * 100
                    const widthPct = ((s.endCol - s.startCol + 1) / 7) * 100
                    const badge = s.isStart ? STATUS_BADGE[s.status] : ''
                    return (
                      <Link key={i} to={`/bookings/${s.ref}`} title={`${s.guest} · ${s.villa} · ${s.status}`}
                        className={`pointer-events-auto absolute flex items-center gap-1 px-1.5 text-[11px] font-medium leading-[18px] text-white shadow-sm transition hover:brightness-110 hover:ring-2 hover:ring-slate-900/10 ${s.isStart ? 'rounded-l-md' : ''} ${s.isEnd ? 'rounded-r-md' : ''}`}
                        style={{ left: `calc(${leftPct}% + 3px)`, width: `calc(${widthPct}% - 6px)`, top: s.lane * (LANE_H + 2), height: LANE_H, backgroundColor: roomColor(s.villa) }}>
                        <span className="flex-1 truncate">{s.isStart ? s.guest : ' '}</span>
                        {badge && <span className="shrink-0 rounded bg-white/25 px-1 text-[9px] font-bold leading-none">{badge}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        {ROOMS.map((r) => (
          <span key={r.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: r.color }} />{r.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: roomColor(FULL_PROPERTY) }} />{FULL_PROPERTY}
        </span>
        <span className="text-slate-400">· multi-room bookings use their first room's color</span>
      </div>
    </>
  )
}
