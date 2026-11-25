import { Permission, Permissions } from '../common/permissions';

// Seed grants only for newly created default roles.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permissions),
  ADMIN: [
    Permissions.USER_MANAGE,
    Permissions.EXPENSE_VIEW_ALL,
    Permissions.EXPENSE_APPROVE,
    Permissions.EXPENSE_APPROVE_HIGH,
    Permissions.EXPENSE_REJECT,
    Permissions.EXPENSE_BATCH_APPROVE,
  ],
  CA: [
    Permissions.EXPENSE_CREATE,
    Permissions.EXPENSE_VIEW_ALL,
    Permissions.EXPENSE_APPROVE,
    Permissions.EXPENSE_REJECT,
    Permissions.EXPENSE_BATCH_APPROVE,
  ],
  FINANCE_EXECUTIVE: [
    Permissions.EXPENSE_CREATE,
    Permissions.EXPENSE_VIEW_ALL,
    Permissions.PAYMENT_RECORD,
  ],
  EMPLOYEE: [Permissions.EXPENSE_CREATE, Permissions.EXPENSE_VIEW_OWN],
};
