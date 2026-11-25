import { useState, type FormEvent } from 'react';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { label } from '@/lib/format';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { useAuth } from '@/context/auth-context';

interface RolePermissions {
  permissions: string[];
  roles: { id: string; name: string; permissions: string[] }[];
}

export default function RolesPage({ matrix = false }: { matrix?: boolean }) {
  const { data, error, reload } = useApiQuery<RolePermissions>('/rbac/roles');
  const { user, refreshPermissions } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const title = matrix ? 'Permissions matrix' : 'Roles';

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await writeApi('/rbac/roles', {
        method: 'POST',
        json: { name: name.trim().toUpperCase().replace(/[ _]+/g, '_') },
      });
      setName('');
      setMessage({ kind: 'ok', text: 'Role created. Use the permissions matrix to grant access.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function updateGrant(
    role: RolePermissions['roles'][number],
    code: string,
    granted: boolean,
  ) {
    setSaving(true);
    setMessage(null);
    try {
      await writeApi(`/rbac/roles/${role.id}/permissions/${encodeURIComponent(code)}`, {
        method: 'PUT',
        json: { granted },
      });
      setMessage({
        kind: 'ok',
        text: `${code} ${granted ? 'granted to' : 'revoked from'} ${label(role.name)}.`,
      });
      if (role.id === user?.roleId) {
        await refreshPermissions().catch(() => {
          setMessage({
            kind: 'error',
            text: 'Grant saved. Reload the page to refresh your menu access.',
          });
        });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        description={
          matrix
            ? 'Check or clear permissions to update access immediately.'
            : 'Create roles and review their access.'
        }
      />
      {message && (
        <div className="mb-4">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      )}
      {!matrix && data && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="font-semibold">New role</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRole} className="flex flex-wrap items-end gap-3">
              <Field label="Role name">
                <Input
                  required
                  maxLength={50}
                  pattern="[a-zA-Z0-9]+(?:[ _]+[a-zA-Z0-9]+)*"
                  placeholder="e.g. Regional Approver"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saving}
                />
              </Field>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create role'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {error ? (
        <div className="space-y-3">
          <Notice kind="error">{error}</Notice>
          <Button variant="outline" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading roles…
        </p>
      ) : data.roles.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No roles are configured.</Card>
      ) : matrix ? (
        <Card>
          <Table aria-label={title} className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="sticky left-0 z-10 bg-card">
                  Permission
                </TableHead>
                {data.roles.map((role) => (
                  <TableHead key={role.id} scope="col" className="whitespace-nowrap text-center">
                    {label(role.name)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.permissions.map((permission) => (
                <TableRow key={permission}>
                  <TableHead
                    scope="row"
                    className="sticky left-0 z-10 whitespace-nowrap bg-card font-mono text-xs text-foreground"
                  >
                    {permission}
                  </TableHead>
                  {data.roles.map((role) => {
                    const granted = role.permissions.includes(permission);
                    const ownRoleManagement =
                      permission === 'role.manage' && role.id === user?.roleId;
                    return (
                      <TableCell key={role.id} className="text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 align-middle accent-primary disabled:opacity-60"
                          aria-label={`${label(role.name)} · ${permission}`}
                          title={
                            ownRoleManagement
                              ? 'You cannot remove role management from your own role'
                              : undefined
                          }
                          checked={granted}
                          disabled={saving || ownRoleManagement}
                          onChange={(event) =>
                            void updateGrant(role, permission, event.target.checked)
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <Table aria-label={title}>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col">Granted permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.roles.map((role) => (
                <TableRow key={role.id}>
                  <TableHead scope="row" className="py-3 text-foreground">
                    {label(role.name)}
                  </TableHead>
                  <TableCell>
                    {role.permissions.length} of {data.permissions.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
