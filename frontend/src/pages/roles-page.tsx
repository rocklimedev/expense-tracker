import { useRef, useState, type FormEvent } from 'react';
import { ChevronRight, Plus, Shield } from 'lucide-react';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { label } from '@/lib/format';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface RolePermissions {
  permissions: string[];
  roles: Role[];
}

const roleNamePattern = '[a-zA-Z0-9]+(?:[ _]+[a-zA-Z0-9]+)*';

const permissionLabels: Record<string, string> = {
  'expense.create': 'Create expenses',
  'expense.view.own': 'View own expenses',
  'expense.view.all': 'View all expenses',
  'expense.approve': 'Approve expenses',
  'expense.approve.high': 'Approve high-value expenses',
  'expense.reject': 'Reject expenses',
  'expense.batch_approve': 'Approve expenses in batches',
  'payment.record': 'Record reimbursement payments',
  'approval.policy.manage': 'Manage approval rules',
  'user.manage': 'Manage users',
  'role.manage': 'Manage roles and permissions',
};

const permissionGroups = [
  { title: 'Expenses', prefixes: ['expense.create', 'expense.view.'] },
  { title: 'Approvals', prefixes: ['expense.approve', 'expense.reject', 'expense.batch_approve', 'approval.'] },
  { title: 'Reimbursements', prefixes: ['payment.'] },
  { title: 'Administration', prefixes: ['user.', 'role.'] },
];

function groupPermissions(permissions: string[]) {
  const groups = permissionGroups.map(({ title, prefixes }) => ({
    title,
    codes: permissions.filter((code) => prefixes.some((prefix) => code.startsWith(prefix))),
  }));
  const grouped = new Set(groups.flatMap(({ codes }) => codes));
  return [...groups, { title: 'Other permissions', codes: permissions.filter((code) => !grouped.has(code)) }]
    .filter(({ codes }) => codes.length > 0);
}

export default function RolesPage() {
  const { data, error, reload } = useApiQuery<RolePermissions>('/rbac/roles');
  const { user, refreshPermissions } = useAuth();
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useState('');
  const roleDialog = useRef<HTMLDialogElement>(null);
  const [editingRole, setEditingRole] = useState<Role>();
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const roles = data?.roles ?? [];
  const query = search.trim().toLowerCase().replace(/_/g, ' ');
  const visibleRoles = roles.filter((role) => label(role.name).toLowerCase().includes(query));
  const selectedRole = roles.find((role) => role.id === selectedId) ?? roles[0];
  const grants = new Set(selectedRole?.permissions);
  const groups = groupPermissions(data?.permissions ?? []);

  function openRoleForm(role?: Role) {
    setEditingRole(role);
    setName(role?.name ?? '');
    setFormError(undefined);
    roleDialog.current?.showModal();
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const normalizedName = name.trim().toUpperCase().replace(/[ _]+/g, '_');
    setSaving(true);
    setFormError(undefined);
    setMessage(null);
    try {
      if (editingRole) {
        await writeApi(`/rbac/roles/${editingRole.id}`, {
          method: 'PATCH',
          json: { name: normalizedName },
        });
      } else {
        const created = await writeApi<Role>('/rbac/roles', {
          method: 'POST',
          json: { name: normalizedName },
        });
        setSearch('');
        setSelectedId(created.id);
      }
      roleDialog.current?.close();
      setMessage({
        kind: 'ok',
        text: editingRole ? `Role renamed to ${label(normalizedName)}.` : `${label(normalizedName)} was created.`,
      });
      if (editingRole && editingRole.id === user?.roleId) {
        await refreshPermissions().catch(() => {
          setMessage({ kind: 'error', text: 'Role renamed. Reload the page to refresh your role name.' });
        });
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: Role) {
    if (!window.confirm(`Delete the ${label(role.name)} role and its permission grants?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      await writeApi(`/rbac/roles/${role.id}`, { method: 'DELETE' });
      setMessage({ kind: 'ok', text: `${label(role.name)} was deleted.` });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function updateGrant(role: Role, code: string, granted: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      await writeApi(`/rbac/roles/${role.id}/permissions/${encodeURIComponent(code)}`, {
        method: 'PUT',
        json: { granted },
      });
      setMessage({
        kind: 'ok',
        text: `${permissionLabels[code] ?? code} ${granted ? 'granted to' : 'revoked from'} ${label(role.name)}.`,
      });
      if (role.id === user?.roleId) {
        await refreshPermissions().catch(() => {
          setMessage({ kind: 'error', text: 'Grant saved. Reload the page to refresh your menu access.' });
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
        title="Roles & Permissions"
        actions={
          <Button type="button" disabled={!data || saving} onClick={() => openRoleForm()}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New Role
          </Button>
        }
      />
      {message && (
        <div className="mb-4">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      )}
      {error ? (
        <div className="space-y-3">
          <Notice kind="error">{error}</Notice>
          <Button variant="outline" onClick={reload}>Retry</Button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-muted-foreground">Loading roles…</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
          <Card>
            <CardHeader className="border-b">
              <h2 className="font-semibold">Roles</h2>
              <p className="text-xs text-muted-foreground">{roles.length} {roles.length === 1 ? 'role' : 'roles'}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Field label="Search roles">
                <Input type="search" placeholder="Search roles…" value={search} onChange={(event) => setSearch(event.target.value)} />
              </Field>
              <ul className="max-h-48 space-y-1 overflow-y-auto p-1 md:max-h-[60vh]" aria-label="Roles">
                {visibleRoles.map((role) => (
                  <li key={role.id}>
                    <button
                      type="button"
                      aria-pressed={role.id === selectedRole?.id}
                      onClick={() => setSelectedId(role.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border-l-2 border-transparent p-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        role.id === selectedRole?.id && 'border-primary bg-accent text-accent-foreground hover:bg-accent',
                      )}
                    >
                      <span className="rounded-md bg-muted p-1.5 text-primary">
                        <Shield className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        <span className="block font-medium">{label(role.name)}</span>
                        <span className="block text-xs text-muted-foreground">{role.permissions.length} granted</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {visibleRoles.length === 0 && (
                <p className="text-sm text-muted-foreground">{roles.length ? 'No matching roles.' : 'No roles are configured.'}</p>
              )}
            </CardContent>
          </Card>

          {selectedRole && (
            <section className="min-w-0 space-y-4" aria-label="Selected role">
              <Card>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-[var(--card-padding)]">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{label(selectedRole.name)}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{grants.size} of {data.permissions.length} permissions granted</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => openRoleForm(selectedRole)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={saving || selectedRole.id === user?.roleId}
                      title={selectedRole.id === user?.roleId ? 'You cannot delete your own role' : undefined}
                      onClick={() => void deleteRole(selectedRole)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold">Permissions</h2>
                </CardHeader>
                {groups.length === 0 && <CardContent>No permissions are configured.</CardContent>}
                {groups.map(({ title, codes }, index) => (
                  <details key={title} open={index === 0 ? true : undefined} className="group border-t">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-90" aria-hidden="true" />
                      <span className="flex-1 font-medium">{title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {codes.filter((code) => grants.has(code)).length} of {codes.length} granted
                      </span>
                    </summary>
                    <ul className="divide-y border-t bg-muted/25 px-4 sm:px-6">
                      {codes.map((code) => {
                        const ownRoleManagement = code === 'role.manage' && selectedRole.id === user?.roleId;
                        return (
                          <li key={code}>
                            <label className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
                              <span className="min-w-0 [overflow-wrap:anywhere]">
                                {permissionLabels[code] ?? code}
                                {ownRoleManagement && (
                                  <span className="block text-xs text-muted-foreground">Required for your role</span>
                                )}
                              </span>
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 accent-primary disabled:opacity-60"
                                checked={grants.has(code)}
                                disabled={saving || ownRoleManagement}
                                onChange={(event) => void updateGrant(selectedRole, code, event.target.checked)}
                              />
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
      <dialog
        ref={roleDialog}
        aria-labelledby="role-form-title"
        className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border bg-card text-card-foreground shadow-xl backdrop:bg-black/60"
        onCancel={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <form onSubmit={saveRole}>
          <CardHeader>
            <h2 id="role-form-title" className="font-semibold">{editingRole ? 'Edit role' : 'New role'}</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Role name">
              <Input
                required
                maxLength={50}
                pattern={roleNamePattern}
                placeholder="e.g. Regional Approver"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={saving}
              />
            </Field>
            {formError && <Notice kind="error">{formError}</Notice>}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" variant="outline" disabled={saving} onClick={() => roleDialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingRole ? 'Save changes' : 'Create role'}
            </Button>
          </CardFooter>
        </form>
      </dialog>
    </>
  );
}
