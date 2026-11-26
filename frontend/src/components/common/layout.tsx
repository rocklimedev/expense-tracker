import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Banknote,
  ChartNoAxesColumn,
  ClipboardCheck,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Receipt,
  List,
  ShieldCheck,
  UserRound,
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
  requireAll?: boolean;
}

function canOpen(item: NavItem, can: (permission: string) => boolean) {
  return item.requireAll ? item.perms.every(can) : item.perms.some(can);
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
      { to: '/reports', label: 'Reports', icon: ChartNoAxesColumn, perms: ['expense.view.all'] },
      { to: '/transactions', label: 'Transactions', icon: List, perms: ['expense.view.all'] },
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
      { to: '/activity', label: 'Activity log', icon: Activity, perms: ['user.manage', 'expense.view.all'], requireAll: true },
      {
        to: '/roles',
        label: 'Roles & Permissions',
        icon: UserRoundCog,
        perms: ['role.manage'],
      },
    ],
  },
];

export function AppHome() {
  const { can } = useAuth();
  const firstPage = GROUPS.flatMap((group) => group.items).find((item) => canOpen(item, can));
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
              'px-3 pb-2 text-xs font-medium text-muted-foreground',
              'text-muted-foreground',
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
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
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
    items: g.items.filter((item) => canOpen(item, can)),
  })).filter((g) => g.items.length > 0);
  const mobileTabs = [
    ...groups
      .flatMap((g) => g.items)
      .slice(0, 4)
          .map(({ to, label, icon }) => ({
        to,
        label: to === '/payments' ? 'Payments' : label,
        icon,
      })),
    { to: '/profile', label: 'Profile', icon: UserRound },
  ];
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
      {/* Desktop sidebar: light and quiet, so the page content is the main thing. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="px-5 py-6">
          <Brand />
        </div>
        {can('expense.create') && (
          <Link
            to="/expenses/new"
            className="mx-3 mb-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" /> New expense
          </Link>
        )}
        <Nav groups={groups} />
        <UserCard initials={initials} name={user?.name} role={roleName} onSignOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? 'mobile-menu' : undefined}
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile full menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {can('expense.create') && (
            <Link
              to="/expenses/new"
              onClick={() => setMenuOpen(false)}
              className="mx-3 my-2 flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> New expense
            </Link>
          )}
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

      <nav
        aria-label="Mobile navigation"
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden',
          menuOpen && 'hidden',
        )}
        style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))` }}
      >
        {mobileTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-0.5 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="px-3 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:ml-64 lg:px-6 xl:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
