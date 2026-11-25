import { useRef, useState, type FormEvent } from 'react';
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
  const form = useRef<HTMLFormElement>(null);
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
  }

  function edit(member: AppUser) {
    setEditing(member);
    setName(member.name);
    setEmail(member.email);
    setRoleId(member.role?.id ?? '');
    setPassword('');
    setMessage(null);
    form.current?.scrollIntoView({ block: 'nearest' });
  }

  async function remove(member: AppUser) {
    if (!window.confirm(`Delete the account for ${member.name}? They will lose access. Expense and approval history will be kept.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await writeApi(`/users/${member.id}`, { method: 'DELETE' });
      if (editing?.id === member.id) resetForm();
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
      await writeApi(`/users/${resetMember.id}/password`, { method: 'PATCH', json: { password: newPassword } });
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
    setBusy(true);
    setMessage(null);
    try {
      await writeApi(editing ? `/users/${editing.id}` : '/users', {
        method: editing ? 'PATCH' : 'POST',
        json: { name: name.trim(), email: email.trim(), password: password || undefined, roleId },
      });
      setMessage({ kind: 'ok', text: editing ? `Updated ${email}.` : `Created ${email}.` });
      resetForm();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Team" description="Manage user accounts and roles." />

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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All users</CardTitle>
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
                {data?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role ? label(u.role.name) : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.isActive ? 'ACTIVE' : 'CLOSED'} />
                    </TableCell>
                    <TableCell>
                      {u.isActive && roles?.some((role) => role.id === u.role?.id) && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" disabled={busy} aria-label={`Edit ${u.name}`} onClick={() => edit(u)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy} aria-label={`Reset password for ${u.name}`} onClick={() => openReset(u)}>
                            Reset password
                          </Button>
                          {u.id !== user?.id && (
                            <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} aria-label={`Delete ${u.name}`} onClick={() => void remove(u)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <form ref={form} onSubmit={save}>
            <CardHeader>
              <CardTitle>{editing ? 'Edit user' : 'New user'}</CardTitle>
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
                <Select required disabled={editing?.id === user?.id} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
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
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" className="flex-1" disabled={busy || !roleId}>
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
              </Button>
              {editing && <Button type="button" variant="outline" disabled={busy} onClick={resetForm}>Cancel</Button>}
            </CardFooter>
          </form>
        </Card>
      </div>
      <dialog
        ref={resetDialog}
        aria-labelledby="reset-password-title"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-black/60"
        onCancel={(e) => { if (busy) e.preventDefault(); }}
        onClose={() => {
          setResetMember(null);
          setNewPassword('');
          setConfirmedPassword('');
        }}
      >
        <form className="space-y-4" onSubmit={resetPassword}>
          <div>
            <h2 id="reset-password-title" className="text-lg font-semibold">Reset password</h2>
            <p className="text-sm text-muted-foreground">{resetMember?.name} will be signed out of existing sessions.</p>
          </div>
          <Field label="New password" htmlFor="reset-password">
            <Input id="reset-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password"
              value={newPassword} disabled={busy} onChange={(e) => setNewPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-reset-password">
            <Input id="confirm-reset-password" type="password" required autoComplete="new-password"
              value={confirmedPassword} disabled={busy} onChange={(e) => setConfirmedPassword(e.target.value)} />
          </Field>
          {resetError && <Notice kind="error">{resetError}</Notice>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => resetDialog.current?.close()}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
