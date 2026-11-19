import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardCheck, FolderKanban, LogOut, Menu, Receipt, ShieldCheck, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  perms: string[];
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Receipt, perms: ['expense.view.own', 'expense.view.all'] },
      { to: '/trackers', label: 'Trackers', icon: FolderKanban, perms: ['expense.view.own', 'expense.view.all'] },
    ],
  },
  {
    title: 'Approvals',
    items: [
      { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, perms: ['expense.approve'] },
      { to: '/payments', label: 'Payments', icon: Wallet, perms: ['payment.record'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/policies', label: 'Approval policies', icon: ShieldCheck, perms: ['approval.policy.manage'] },
      { to: '/users', label: 'Users', icon: Users, perms: ['user.manage'] },
    ],
  },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="h-4 w-4" />
      </span>
      <span className="font-semibold tracking-tight">Expense Tracker</span>
    </div>
  );
}

function Nav({ groups, onNavigate }: { groups: typeof GROUPS; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
      {groups.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</div>
          <div className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => i.perms.some((p) => can(p))) }))
    .filter((g) => g.items.length > 0);
  const flat = groups.flatMap((g) => g.items);
  const initials = (user?.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const roleName = user?.role?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const userCard = (
    <div className="border-t p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user?.name}</div>
          <div className="truncate text-xs text-muted-foreground">{roleName}</div>
        </div>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <Nav groups={groups} />
        {userCard}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile full menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-20 flex flex-col bg-card lg:hidden">
          <Nav groups={groups} onNavigate={() => setMenuOpen(false)} />
          {userCard}
        </div>
      )}

      {/* Mobile bottom tabs: the four most-used destinations */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.min(flat.length, 4) || 1}, minmax(0, 1fr))` }}
      >
        {flat.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
