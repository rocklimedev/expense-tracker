export const CATEGORIES = ['TRAVEL', 'MEALS', 'SUPPLIES', 'ACCOMMODATION', 'OTHER'] as const;

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const APPROVAL_PERMISSIONS = [
  { value: 'expense.approve', label: 'Standard approval (expense.approve)' },
  { value: 'expense.approve.high', label: 'High-value approval (expense.approve.high)' },
];

// Role IDs follow the seed script's insertion order on a fresh database.
// If your database differs, update these values (or add a roles endpoint).
export const ROLE_OPTIONS = [
  { id: 1, name: 'SUPER_ADMIN' },
  { id: 2, name: 'ADMIN' },
  { id: 3, name: 'CA' },
  { id: 4, name: 'FINANCE_EXECUTIVE' },
  { id: 5, name: 'EMPLOYEE' },
];
