import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/common/layout';
import { RequireAuth, RequirePermission } from './components/common/guards';
import LoginPage from './pages/login-page';
import ExpensesPage from './pages/expenses-page';
import NewExpensePage from './pages/new-expense-page';
import ExpenseDetailPage from './pages/expense-detail-page';
import ApprovalsPage from './pages/approvals-page';
import PaymentsPage from './pages/payments-page';
import TrackersPage from './pages/trackers-page';
import TrackerDetailPage from './pages/tracker-detail-page';
import PoliciesPage from './pages/policies-page';
import UsersPage from './pages/users-page';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/expenses" replace />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="expenses/new" element={<NewExpensePage />} />
        <Route path="expenses/:id" element={<ExpenseDetailPage />} />
        <Route
          path="approvals"
          element={
            <RequirePermission permission="expense.approve">
              <ApprovalsPage />
            </RequirePermission>
          }
        />
        <Route
          path="payments"
          element={
            <RequirePermission permission="payment.record">
              <PaymentsPage />
            </RequirePermission>
          }
        />
        <Route path="trackers" element={<TrackersPage />} />
        <Route path="trackers/:id" element={<TrackerDetailPage />} />
        <Route
          path="policies"
          element={
            <RequirePermission permission="approval.policy.manage">
              <PoliciesPage />
            </RequirePermission>
          }
        />
        <Route
          path="users"
          element={
            <RequirePermission permission="user.manage">
              <UsersPage />
            </RequirePermission>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
