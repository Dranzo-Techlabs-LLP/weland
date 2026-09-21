import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  FileText,
  Home,
  Landmark,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  right: string
  end?: boolean
}

// Exact order from the spec. `right` gates visibility per role.
export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, right: 'view_dashboard', end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, right: 'view_calendar' },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck2, right: 'view_bookings' },
  { to: '/accounting', label: 'Accounting', icon: Landmark, right: 'view_accounting' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, right: 'view_expenses' },
  { to: '/reports', label: 'Reports', icon: BarChart3, right: 'view_reports' },
  { to: '/rooms', label: 'Rooms', icon: Home, right: 'view_villas' },
  { to: '/users', label: 'Users', icon: Users, right: 'view_users' },
  { to: '/roles', label: 'Roles & Rights', icon: ShieldCheck, right: 'manage_users' },
  { to: '/invoice', label: 'Invoice', icon: FileText, right: 'edit_invoice' },
]
