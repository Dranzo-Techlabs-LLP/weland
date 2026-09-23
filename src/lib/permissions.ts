// Permission catalog — order matches the Roles & Rights checklist exactly.
export const PERMISSIONS: { key: string; label: string }[] = [
  { key: 'view_payments', label: 'View payments' },
  { key: 'record_payments', label: 'Record payments / refunds' },
  { key: 'view_expenses', label: 'View expenses' },
  { key: 'edit_expenses', label: 'Add / edit expenses' },
  { key: 'view_accounting', label: 'View revenue & accounting' },
  { key: 'view_users', label: 'View users' },
  { key: 'manage_users', label: 'Add / edit users & rights' },
  { key: 'edit_invoice', label: 'Edit invoice number series' },
  { key: 'view_bookings', label: 'View bookings' },
  { key: 'edit_bookings', label: 'Create / edit bookings' },
  { key: 'cancel_bookings', label: 'Cancel bookings' },
  { key: 'view_calendar', label: 'View booking calendar' },
  { key: 'view_dashboard', label: 'View dashboard' },
  { key: 'view_reports', label: 'View & export reports' },
  { key: 'view_villas', label: 'View rooms' },
  { key: 'edit_villas', label: 'Edit room settings' },
]

export const ALL_RIGHTS: string[] = PERMISSIONS.map((p) => p.key)

export const ROLE_DEFAULTS: Record<string, string[]> = {
  Administrator: [...ALL_RIGHTS],
  Manager: [
    'view_dashboard', 'view_calendar', 'view_bookings', 'edit_bookings', 'cancel_bookings',
    'view_accounting', 'view_expenses', 'edit_expenses', 'view_reports', 'view_villas',
    'view_payments', 'record_payments', 'view_users',
  ],
  'Front Desk': [
    'view_dashboard', 'view_calendar', 'view_bookings', 'edit_bookings',
    'view_payments', 'record_payments', 'view_villas',
  ],
  B2B: ['view_dashboard', 'view_calendar', 'view_bookings', 'edit_bookings'],
  Owner: [
    'view_dashboard', 'view_calendar', 'view_bookings', 'view_accounting',
    'view_expenses', 'view_reports', 'view_villas', 'view_payments',
  ],
}

export const EXPENSE_CATEGORIES = [
  'B2B Commission', 'Food', 'Staff', 'Maintenance', 'Cleaning', 'Utilities', 'Supplies', 'Misc',
]

// Soft-tinted pill classes per expense category.
export const CATEGORY_PILL: Record<string, string> = {
  'B2B Commission': 'bg-violet-100 text-violet-700',
  Food: 'bg-slate-100 text-slate-600',
  Staff: 'bg-sky-100 text-sky-700',
  Maintenance: 'bg-amber-100 text-amber-800',
  Cleaning: 'bg-teal-100 text-teal-700',
  Utilities: 'bg-slate-100 text-slate-600',
  Supplies: 'bg-slate-100 text-slate-600',
  Misc: 'bg-slate-100 text-slate-600',
}

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank transfer']

export const BOOKING_STATUSES = [
  'enquiry', 'hold', 'confirmed', 'checked in', 'completed', 'cancelled',
] as const

export const ROLE_NAMES = ['Administrator', 'Manager', 'Front Desk', 'B2B', 'Owner']
