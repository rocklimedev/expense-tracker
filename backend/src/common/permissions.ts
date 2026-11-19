export const Permissions = {
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_VIEW_OWN: 'expense.view.own',
  EXPENSE_VIEW_ALL: 'expense.view.all',
  EXPENSE_APPROVE: 'expense.approve',
  EXPENSE_APPROVE_HIGH: 'expense.approve.high',
  EXPENSE_REJECT: 'expense.reject',
  EXPENSE_BATCH_APPROVE: 'expense.batch_approve',
  PAYMENT_RECORD: 'payment.record',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  APPROVAL_POLICY_MANAGE: 'approval.policy.manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Permissions that can be used as the approver for a workflow step
export const APPROVAL_PERMISSIONS: Permission[] = [
  Permissions.EXPENSE_APPROVE,
  Permissions.EXPENSE_APPROVE_HIGH,
];

// Default permissions per role, applied by the seed script.
// Super Admin can change these in the database later (roles endpoint is planned).
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
    Permissions.EXPENSE_VIEW_ALL,
    Permissions.EXPENSE_APPROVE,
    Permissions.EXPENSE_REJECT,
    Permissions.EXPENSE_BATCH_APPROVE,
  ],
  FINANCE_EXECUTIVE: [Permissions.EXPENSE_VIEW_ALL, Permissions.PAYMENT_RECORD],
  EMPLOYEE: [Permissions.EXPENSE_CREATE, Permissions.EXPENSE_VIEW_OWN],
};
