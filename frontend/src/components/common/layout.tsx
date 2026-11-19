import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardCheck, FolderKanban, LogOut, Receipt, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/expenses', label: 'Expenses', icon: Receipt, perms: ['expense.view.own', 'expense.view.all'] },
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, perms: ['expense.approve'] },
  { to: '/payments', label: 'Payments', icon: Wallet, perms: ['payment.record'] },
  { to: '/trackers', label: 'Trackers', icon: FolderKanban, perms: ['expense.view.own', 'expense.view.all'] },
  { to: '/policies', label: 'Approval policies', icon: ShieldCheck, perms: ['approval.policy.manage'] },
  { to: '/users', label: 'Users', icon: Users, perms: ['user.manage'] },
];

export function AppLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((item) => item.perms.some((p) => can(p)));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r bg-card">
        <div className="px-5 py-5">
          <div className="text-lg font-semibold">Expense Tracker</div>
          <div className="mt-1 text-xs text-muted-foreground">{user?.role?.replace(/_/g, ' ')}</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 truncate text-sm font-medium">{user?.name}</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-8">
        <Outlet />
      </main>
    </div>
  );
}
