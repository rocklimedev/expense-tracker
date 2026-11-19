import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Wallet, Zap } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';

const HIGHLIGHTS = [
  { icon: Zap, text: 'Submit a claim in under a minute, with receipts attached.' },
  { icon: ShieldCheck, text: 'See exactly who needs to approve it, and what happens next.' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/expenses" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/expenses', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Wallet className="h-5 w-5" />
          </span>
          Expense Tracker
        </div>
        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Every claim, from receipt to reimbursement.</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-primary-foreground/90">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">Approvals, payments and receipts in one place.</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 font-semibold lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            Expense Tracker
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in with your company email.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <Field label="Work email">
              <Input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                className="h-11"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <Notice kind="error">{error}</Notice>}
            <Button type="submit" className="h-11 w-full text-sm" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
