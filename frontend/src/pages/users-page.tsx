import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { label } from '@/lib/format';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';

export default function UsersPage() {
  const { data, error, reload } = useFetch<AppUser[]>('/users');
  const { data: roles, error: rolesError } = useFetch<NonNullable<AppUser['role']>[]>('/users/roles');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setRoleId] = useState('');
  const roleId = selectedRoleId || roles?.find((role) => role.name === 'EMPLOYEE')?.id || '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api('/users', { method: 'POST', json: { name, email, password, roleId } });
      setMessage({ kind: 'ok', text: `User ${email} created.` });
      setName(''); setEmail(''); setPassword('');
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Users" description="Create accounts and assign roles." />

      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      {message && <div className="mb-4"><Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>All users</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role ? label(u.role.name) : '—'}</TableCell>
                    <TableCell><StatusBadge status={u.isActive ? 'ACTIVE' : 'CLOSED'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <form onSubmit={onCreate}>
            <CardHeader><CardTitle>New user</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Name"><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Password (min 8 characters)">
                <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Role">
                <Select required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="" disabled>Select a role</option>
                  {roles?.map((role) => <option key={role.id} value={role.id}>{label(role.name)}</option>)}
                </Select>
              </Field>
              {rolesError && <Notice kind="error">{rolesError}</Notice>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={busy || !roleId}>{busy ? 'Creating…' : 'Create user'}</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
