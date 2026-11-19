export type ExpenseStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_PAID' | 'PAID';

export interface Me {
  id: number;
  name: string;
  role: string;
  permissions: string[];
}

export interface ApprovalStep {
  id?: number;
  stepOrder: number;
  label: string;
  requiredPermission: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  actedById?: number | null;
  actedAt?: string | null;
  comment?: string | null;
}

export interface HistoryEntry {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  actorId: number;
  comment: string | null;
  createdAt: string;
}

export interface Expense {
  id: number;
  employeeId: number;
  trackerId: number | null;
  scheduleId: number | null;
  occurrenceDate: string | null;
  category: string;
  amount: number | string;
  currency: string;
  expenseDate: string;
  description: string | null;
  status: ExpenseStatus;
  paidAmount: number | string;
  submittedAt: string | null;
  rejectionReason: string | null;
  employee?: { id: number; name: string };
  approvals?: ApprovalStep[];
  history?: HistoryEntry[];
}

export interface Attachment {
  id: number;
  expenseId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Payment {
  id: number;
  expenseId: number;
  amount: number | string;
  paidOn: string;
  reference: string | null;
  recordedById: number;
}

export interface Tracker {
  id: number;
  employeeId: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  budgetAmount: number | string | null;
  status: 'ACTIVE' | 'CLOSED';
  employee?: { id: number; name: string };
}

export interface TrackerSchedule {
  id: number;
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
  id: number;
  stepOrder: number;
  label: string;
  requiredPermission: string;
}

export interface ApprovalPolicy {
  id: number;
  name: string;
  category: string | null;
  minAmount: number | string;
  priority: number;
  isActive: boolean;
  steps: PolicyStep[];
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role?: { id: number; name: string };
}
