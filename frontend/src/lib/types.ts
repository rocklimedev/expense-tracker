export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'REIMBURSEMENT_CANCELLED';

export interface ExpenseCategory {
  code: string;
}

export interface Me {
  id: string;
  name: string;
  role: string;
  roleId: string;
  permissions: string[];
}

export interface ApprovalStep {
  id?: string;
  stepOrder: number;
  label: string;
  requiredPermission: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  actedById?: string | null;
  actedAt?: string | null;
  comment?: string | null;
}

export interface HistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string;
  comment: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  editableUntil?: string | null;
  employeeId: string;
  trackerId: string | null;
  scheduleId: string | null;
  occurrenceDate: string | null;
  category: string;
  amount: number | string;
  currency: string;
  expenseDate: string;
  description: string | null;
  toldBy?: string | null;
  reason?: string | null;
  paidTo?: string | null;
  reimbursementCancellationReason?: string | null;
  status: ExpenseStatus;
  paidAmount: number | string;
  submittedAt: string | null;
  rejectionReason: string | null;
  employee?: { id: string; name: string };
  approvals?: ApprovalStep[];
  history?: HistoryEntry[];
}

export interface Attachment {
  id: string;
  expenseId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  expenseId: string;
  amount: number | string;
  paidOn: string;
  reference: string | null;
  recordedById: string;
}

export type TransactionExpense = Pick<
  Expense,
  'id' | 'category' | 'description' | 'expenseDate' | 'currency' | 'amount' | 'status' | 'employee'
> & { payments: Pick<Payment, 'id' | 'amount' | 'paidOn' | 'reference'>[] };

export interface Tracker {
  id: string;
  employeeId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  budgetAmount: number | string | null;
  status: 'ACTIVE' | 'CLOSED';
  employee?: { id: string; name: string };
}

export interface TrackerSchedule {
  id: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  amount: number | string;
  category: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  generatedThrough: string | null;
  active: boolean;
}

export interface TrackerSummary {
  totals: {
    committed: number;
    paid: number;
    outstanding: number;
    budget: number | null;
    budgetRemaining: number | null;
  };
  byStatus: { status: ExpenseStatus; count: number; total: number; paid: number }[];
  byMonth: { month: string; total: number }[];
}

export interface PolicyStep {
  id: string;
  stepOrder: number;
  label: string;
  requiredPermission: string;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  category: string | null;
  minAmount: number | string;
  priority: number;
  isActive: boolean;
  steps: PolicyStep[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role?: { id: string; name: string };
}
