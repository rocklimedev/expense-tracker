import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Banknote,
  ClipboardCheck,
  Grid2X2,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Receipt,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
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
    title: 'Spending',
    items: [
      {
        to: '/expenses',
        label: 'Expenses',
        icon: Receipt,
        perms: ['expense.view.own', 'expense.view.all'],
      },
      {
        to: '/trackers',
        label: 'Budgets',
        icon: PiggyBank,
        perms: ['expense.view.own', 'expense.view.all'],
      },
    ],
  },
  {
    title: 'Approvals',
    items: [
      { to: '/approvals', label: 'To approve', icon: ClipboardCheck, perms: ['expense.approve'] },
      { to: '/payments', label: 'Reimbursements', icon: Banknote, perms: ['payment.record'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        to: '/policies',
        label: 'Approval rules',
        icon: ShieldCheck,
        perms: ['approval.policy.manage'],
      },
      { to: '/users', label: 'Team', icon: Users, perms: ['user.manage'] },
      { to: '/roles', label: 'Roles', icon: UserRoundCog, perms: ['role.manage'] },
      {
        to: '/permissions-matrix',
        label: 'Permissions matrix',
        icon: Grid2X2,
        perms: ['role.manage'],
      },
    ],
  },
];

export function AppHome() {
  const { can } = useAuth();
  const firstPage = GROUPS.flatMap((group) => group.items).find((item) => item.perms.some(can));
  if (firstPage) return <Navigate to={firstPage.to} replace />;
  if (can('expense.create')) return <Navigate to="/expenses/new" replace />;
  return (
    <p className="text-sm text-muted-foreground">Your role currently has no available pages.</p>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', dark && 'text-white')}>
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          dark ? 'bg-teal-400 text-slate-950' : 'bg-primary text-primary-foreground',
        )}
      >
        <Wallet className="h-4 w-4" />
      </span>
      <span className="font-semibold tracking-tight">Expense Tracker</span>
    </div>
  );
}

function Nav({
  groups,
  dark = false,
  onNavigate,
}: {
  groups: typeof GROUPS;
  dark?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
      {groups.map((group) => (
        <div key={group.title}>
          <div
            className={cn(
              'px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider',
              dark ? 'text-slate-500' : 'text-muted-foreground',
            )}
          >
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    dark
                      ? isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      : isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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

function UserCard({
  initials,
  name,
  role,
  onSignOut,
  onNavigate,
  dark = false,
}: {
  initials: string;
  name?: string;
  role?: string;
  onSignOut: () => void;
  onNavigate?: () => void;
  dark?: boolean;
}) {
  return (
    <div className={cn('border-t p-4', dark && 'border-white/10')}>
      <div className="flex items-center gap-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              dark ? 'hover:bg-white/10' : 'hover:bg-muted',
              isActive && (dark ? 'bg-white/10' : 'bg-muted'),
            )
          }
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              dark ? 'bg-white/10 text-white' : 'bg-accent text-accent-foreground',
            )}
          >
            {initials}
          </span>
          <span className="min-w-0">
            <span className={cn('block truncate text-sm font-medium', dark && 'text-white')}>
              {name}
            </span>
            <span
              className={cn(
                'block truncate text-xs',
                dark ? 'text-slate-400' : 'text-muted-foreground',
              )}
            >
              {role ? `Profile · ${role}` : 'Profile'}
            </span>
          </span>
        </NavLink>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className={cn(
            'rounded-md p-2 transition-colors',
            dark
              ? 'text-slate-400 hover:bg-white/10 hover:text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.perms.some((p) => can(p))),
  })).filter((g) => g.items.length > 0);
  const flat = groups.flatMap((g) => g.items);
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const roleName = user?.role
    ?.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar: dark, so the page content reads as the main thing. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 lg:flex">
        <div className="px-5 py-6">
          <Brand dark />
        </div>
        {can('expense.create') && (
          <Link
            to="/expenses/new"
            className="mx-3 mb-6 flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
          >
            <Plus className="h-4 w-4" /> New expense
          </Link>
        )}
        <Nav groups={groups} dark />
        <UserCard dark initials={initials} name={user?.name} role={roleName} onSignOut={signOut} />
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
          <UserCard
            initials={initials}
            name={user?.name}
            role={roleName}
            onSignOut={signOut}
            onNavigate={() => setMenuOpen(false)}
          />
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
