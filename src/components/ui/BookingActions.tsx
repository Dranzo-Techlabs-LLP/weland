import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleX, FileText, Pencil, Trash2 } from 'lucide-react'
import { can, useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { Modal } from './Modal'
import { primaryBtnCls, secondaryBtnCls } from '../styles'
import type { Booking } from '../../types'

const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
const dangerBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60'

export function BookingActions({ booking, variant, onDeleted }: { booking: Booking; variant: 'menu' | 'buttons'; onDeleted?: () => void }) {
  const { user } = useAuth()
  const { setBookingStatus, deleteBooking } = useStore()
  const [confirm, setConfirm] = useState<null | 'cancel' | 'delete'>(null)
  const [busy, setBusy] = useState(false)

  const canEdit = can(user, 'edit_bookings')
  const canCancel = can(user, 'cancel_bookings')
  const isCancelled = booking.status === 'cancelled'
  const invoiceTo = `/bookings/${booking.ref}/invoice`
  const editTo = `/bookings/${booking.ref}/edit`

  async function run() {
    const action = confirm
    setBusy(true)
    if (action === 'cancel') await setBookingStatus(booking.ref, 'cancelled')
    else if (action === 'delete') await deleteBooking(booking.ref)
    setBusy(false)
    setConfirm(null)
    if (action === 'delete' && onDeleted) onDeleted()
  }

  const actions = variant === 'menu' ? (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Link to={invoiceTo} title="Invoice" aria-label="Invoice" className={iconBtn}><FileText size={15} /></Link>
      {canEdit && <Link to={editTo} title="Edit" aria-label="Edit" className={iconBtn}><Pencil size={15} /></Link>}
      {canCancel && !isCancelled && <button title="Cancel booking" aria-label="Cancel booking" onClick={() => setConfirm('cancel')} className={iconBtn}><CircleX size={15} /></button>}
      {canCancel && <button title="Delete booking" aria-label="Delete booking" onClick={() => setConfirm('delete')} className={`${iconBtn} hover:text-red-600`}><Trash2 size={15} /></button>}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <Link to={invoiceTo} className={secondaryBtnCls}><FileText size={15} /> Invoice</Link>
      {canEdit && <Link to={editTo} className={secondaryBtnCls}><Pencil size={15} /> Edit</Link>}
      {canCancel && !isCancelled && <button onClick={() => setConfirm('cancel')} className={dangerBtn}><CircleX size={15} /> Cancel</button>}
      {canCancel && <button onClick={() => setConfirm('delete')} className={dangerBtn}><Trash2 size={15} /> Delete</button>}
    </div>
  )

  return (
    <>
      {actions}
      {confirm && (
        <div onClick={(e) => e.stopPropagation()}>
          <Modal title={confirm === 'delete' ? 'Delete booking?' : 'Cancel this booking?'} onClose={() => { if (!busy) setConfirm(null) }}>
            <p className="text-sm leading-relaxed text-slate-600">
              {confirm === 'delete' ? (
                <>Permanently delete <span className="font-semibold text-slate-900">{booking.ref}</span> — {booking.guest}? This also removes its payment history and <span className="font-semibold">cannot be undone.</span></>
              ) : (
                <>Mark <span className="font-semibold text-slate-900">{booking.ref}</span> — {booking.guest} as <span className="font-semibold">cancelled</span>? You can still find it in the bookings list.</>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} disabled={busy} className={secondaryBtnCls}>Keep it</button>
              <button onClick={run} disabled={busy} className={confirm === 'delete' ? dangerBtn : primaryBtnCls}>
                {busy ? 'Working…' : confirm === 'delete' ? 'Delete' : 'Cancel booking'}
              </button>
            </div>
          </Modal>
        </div>
      )}
    </>
  )
}
