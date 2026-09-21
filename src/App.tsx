import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth, RequireRight } from './auth/guards'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Calendar } from './pages/Calendar'
import { Bookings } from './pages/Bookings'
import { NewBooking } from './pages/NewBooking'
import { EditBooking } from './pages/EditBooking'
import { BookingInvoice } from './pages/BookingInvoice'
import { BookingDetail } from './pages/BookingDetail'
import { Accounting } from './pages/Accounting'
import { Expenses } from './pages/Expenses'
import { Reports } from './pages/Reports'
import { Rooms } from './pages/Rooms'
import { Users } from './pages/Users'
import { Roles } from './pages/Roles'
import { Invoice } from './pages/Invoice'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<RequireRight right="view_calendar"><Calendar /></RequireRight>} />
          <Route path="bookings" element={<RequireRight right="view_bookings"><Bookings /></RequireRight>} />
          <Route path="bookings/new" element={<RequireRight right="view_bookings"><NewBooking /></RequireRight>} />
          <Route path="bookings/:ref/edit" element={<RequireRight right="edit_bookings"><EditBooking /></RequireRight>} />
          <Route path="bookings/:ref/invoice" element={<RequireRight right="view_bookings"><BookingInvoice /></RequireRight>} />
          <Route path="bookings/:ref" element={<RequireRight right="view_bookings"><BookingDetail /></RequireRight>} />
          <Route path="accounting" element={<RequireRight right="view_accounting"><Accounting /></RequireRight>} />
          <Route path="expenses" element={<RequireRight right="view_expenses"><Expenses /></RequireRight>} />
          <Route path="reports" element={<RequireRight right="view_reports"><Reports /></RequireRight>} />
          <Route path="rooms" element={<RequireRight right="view_villas"><Rooms /></RequireRight>} />
          <Route path="users" element={<RequireRight right="view_users"><Users /></RequireRight>} />
          <Route path="roles" element={<RequireRight right="manage_users"><Roles /></RequireRight>} />
          <Route path="invoice" element={<RequireRight right="edit_invoice"><Invoice /></RequireRight>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
