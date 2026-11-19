export const CATEGORIES = ['TRAVEL', 'MEALS', 'SUPPLIES', 'ACCOMMODATION', 'OTHER'] as const;

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const APPROVAL_PERMISSIONS = [
  { value: 'expense.approve', label: 'Standard approval (expense.approve)' },
  { value: 'expense.approve.high', label: 'High-value approval (expense.approve.high)' },
];
