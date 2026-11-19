export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export const ALLOWED_TRANSITIONS: Record<ExpenseStatus, ExpenseStatus[]> = {
  [ExpenseStatus.DRAFT]: [ExpenseStatus.SUBMITTED],
  [ExpenseStatus.SUBMITTED]: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED],
  [ExpenseStatus.REJECTED]: [ExpenseStatus.SUBMITTED],
  [ExpenseStatus.APPROVED]: [ExpenseStatus.PARTIALLY_PAID, ExpenseStatus.PAID],
  [ExpenseStatus.PARTIALLY_PAID]: [ExpenseStatus.PAID],
  [ExpenseStatus.PAID]: [],
};
