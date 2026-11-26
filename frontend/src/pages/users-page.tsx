import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Ellipsis, Plus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { label } from '@/lib/format';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';

export default function UsersPage() {
  const { user, logout } = useAuth();
  const { data, error } = useApiQuery<AppUser[]>('/users');
  const { data: roles, error: rolesError } =
    useApiQuery<NonNullable<AppUser['role']>[]>('/users/roles');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setRoleId] = useState('');
  const [editing, setEditing] = useState<AppUser | null>(null);
  const userDialog = useRef<HTMLDialogElement>(null);
  const [saveError, setSaveError] = useState<string>();
  const resetDialog = useRef<HTMLDialogElement>(null);
  const [resetMember, setResetMember] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const [resetError, setResetError] = useState<string>();
  const roleId = selectedRoleId || roles?.find((role) => role.name === 'EMPLOYEE')?.id || '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function resetForm() {
    setEditing(null);
    setName('');
    setEmail('');
    setPassword('');
    setRoleId('');
    setSaveError(undefined);
  }

  function addUser() {
    resetForm();
    userDialog.current?.showModal();
  }

  function edit(member: AppUser) {
    setEditing(member);
    setName(member.name);
    setEmail(member.email);
    setRoleId(member.role?.id ?? '');
    setPassword('');
    setMessage(null);
    setSaveError(undefined);
    userDialog.current?.showModal();
  }

  async function remove(member: AppUser) {
    if (
      !window.confirm(
        `Delete the account for ${member.name}? They will lose access. Expense and approval history will be kept.`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      await writeApi(`/users/${member.id}`, { method: 'DELETE' });
      setMessage({ kind: 'ok', text: `${member.name}’s account was deleted.` });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function openReset(member: AppUser) {
    setResetMember(member);
    setNewPassword('');
    setConfirmedPassword('');
    setResetError(undefined);
    resetDialog.current?.showModal();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetMember || busy) return;
    if (newPassword !== confirmedPassword) {
      setResetError('The passwords do not match.');
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setResetError('Use a password no longer than 72 bytes.');
      return;
    }
    setBusy(true);
    setResetError(undefined);
    try {
      await writeApi(`/users/${resetMember.id}/password`, {
        method: 'PATCH',
        json: { password: newPassword },
      });
      resetDialog.current?.close();
      if (resetMember.id === user?.id) {
        logout();
      } else {
        setMessage({ kind: 'ok', text: `Password reset for ${resetMember.name}.` });
      }
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy || !roleId) return;
    setBusy(true);
    setMessage(null);
    setSaveError(undefined);
    try {
      await writeApi(editing ? `/users/${editing.id}` : '/users', {
        method: editing ? 'PATCH' : 'POST',
        json: { name: name.trim(), email: email.trim(), password: password || undefined, roleId },
      });
      setMessage({ kind: 'ok', text: editing ? `Updated ${email}.` : `Created ${email}.` });
      userDialog.current?.close();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Manage user accounts and roles."
        actions={
          <Button type="button" disabled={busy} onClick={addUser}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      {message && (
        <div className="mb-4">
          <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>
        </div>
      )}

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Active users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data
                  ?.filter((u) => u.isActive)
                  .map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="[overflow-wrap:anywhere]">{u.email}</TableCell>
                      <TableCell>{u.role ? label(u.role.name) : '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status="ACTIVE" />
                      </TableCell>
                      <TableCell>
                        {roles?.some((role) => role.id === u.role?.id) && (
                          <UserActions
                            name={u.name}
                            disabled={busy}
                            onEdit={() => edit(u)}
                            onReset={() => openReset(u)}
                            onDelete={u.id === user?.id ? undefined : () => void remove(u)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <dialog
          ref={userDialog}
          aria-labelledby="user-form-title"
          className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border bg-card text-card-foreground shadow-xl backdrop:bg-black/60"
          onCancel={(e) => {
            if (busy) e.preventDefault();
          }}
          onClose={resetForm}
        >
          <form onSubmit={save}>
            <CardHeader>
              <CardTitle id="user-form-title">{editing ? 'Edit user' : 'New user'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Name">
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  required
                  maxLength={190}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label={editing ? 'New password (optional)' : 'Password (min 8 characters)'}>
                <Input
                  type="password"
                  required={!editing}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Role">
                <Select
                  required
                  disabled={editing?.id === user?.id}
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a role
                  </option>
                  {roles?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {label(role.name)}
                    </option>
                  ))}
                </Select>
              </Field>
              {rolesError && <Notice kind="error">{rolesError}</Notice>}
              {saveError && <Notice kind="error">{saveError}</Notice>}
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => userDialog.current?.close()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !roleId}>
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
              </Button>
            </CardFooter>
          </form>
        </dialog>
      </div>
      <dialog
        ref={resetDialog}
        aria-labelledby="reset-password-title"
        className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border bg-card p-4 sm:p-6 text-card-foreground shadow-xl backdrop:bg-black/60"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        onClose={() => {
          setResetMember(null);
          setNewPassword('');
          setConfirmedPassword('');
        }}
      >
        <form className="space-y-4" onSubmit={resetPassword}>
          <div>
            <h2 id="reset-password-title" className="text-lg font-semibold">
              Reset password
            </h2>
            <p className="text-sm text-muted-foreground">
              {resetMember?.name} will be signed out of existing sessions.
            </p>
          </div>
          <Field label="New password" htmlFor="reset-password">
            <Input
              id="reset-password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={newPassword}
              disabled={busy}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-reset-password">
            <Input
              id="confirm-reset-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmedPassword}
              disabled={busy}
              onChange={(e) => setConfirmedPassword(e.target.value)}
            />
          </Field>
          {resetError && <Notice kind="error">{resetError}</Notice>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => resetDialog.current?.close()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Resetting…' : 'Reset password'}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function UserActions({
  name,
  disabled,
  onEdit,
  onReset,
  onDelete,
}: {
  name: string;
  disabled: boolean;
  onEdit: () => void;
  onReset: () => void;
  onDelete?: () => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const menu = dropdown.current;
    if (!menu) return;
    const sync = () => {
      const visible = menu.matches(':popover-open');
      setOpen(visible);
      const button = trigger.current;
      if (!visible || !button) return;

      const bounds = button.getBoundingClientRect();
      const { offsetWidth, offsetHeight } = menu;
      const { clientWidth, clientHeight } = document.documentElement;
      const below = bounds.bottom + 4;
      menu.style.left = `${Math.max(8, Math.min(bounds.right - offsetWidth, clientWidth - offsetWidth - 8))}px`;
      menu.style.top = `${below + offsetHeight <= clientHeight - 8 ? below : Math.max(8, bounds.top - offsetHeight - 4)}px`;
      menu.querySelector('button')?.focus({ preventScroll: true });
    };
    menu.addEventListener('toggle', sync);
    return () => menu.removeEventListener('toggle', sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => dropdown.current?.hidePopover();
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  function run(action: () => void) {
    dropdown.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
    action();
  }

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        aria-label={`Actions for ${name}`}
        aria-expanded={open}
        aria-controls={id}
        {...{ popovertarget: id }}
      >
        <Ellipsis className="h-5 w-5" aria-hidden="true" />
      </Button>
      <div
        ref={dropdown}
        id={id}
        {...{ popover: 'auto' }}
        role="group"
        aria-label={`Actions for ${name}`}
        className="fixed inset-auto m-0 w-44 max-w-[calc(100vw_-_1rem)] space-y-1 rounded-lg border bg-card p-1 text-card-foreground shadow-lg"
      >
        <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => run(onEdit)}>
          Edit
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-destructive"
            onClick={() => run(onDelete)}
          >
            Delete
          </Button>
        )}
        <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => run(onReset)}>
          Reset Password
        </Button>
      </div>
    </>
  );
}
