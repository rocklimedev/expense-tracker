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
