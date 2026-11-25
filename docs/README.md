# Expense Tracker: Project Documentation

Backend for an internal expense tracker. Employees submit expenses, a multi-level approval chain (CA, then Admin where required) reviews them, and Finance records payments, partial or full. Recurring costs are grouped under trackers, and receipts are stored on an in-house file server.

Stack: NestJS, MySQL, Sequelize (sequelize-typescript), TypeScript, JWT auth, SFTP-backed file storage, nginx for public assets.

---

## 1. Goals

- Employees claim expenses of different categories (travel, meals, supplies, accommodation, and so on) and attach receipts.
- Claims go through a configurable approval chain. Small claims need one approver. Large claims need a CA and then an Admin.
- CA can approve many claims in one batch, with per-item results.
- Finance records payments against approved claims, including partial payments, and sees what is still outstanding.
- Trackers group the expenses of one task or project (for example, "Client site visits Q4"), including recurring costs such as monthly rent or subscriptions.
- Receipts and public images are stored on the company's own server, not a third-party cloud.
- Every status change is recorded, so the full history of a claim can be audited.

---

## 2. Roles

| Role | Purpose |
|---|---|
| SUPER_ADMIN | Configures the system. Holds every permission. Manages approval policies and roles. |
| ADMIN | Manages users, approves high-value steps, batch-approves, views all expenses. |
| CA | Creates and submits expenses. Reviews, approves, batch-approves, and rejects other users' claims. |
| FINANCE_EXECUTIVE | Creates and submits expenses, views all expenses, and records payments on approved claims. |
| EMPLOYEE | Creates expenses and trackers, uploads receipts, submits, resubmits rejected claims. |

Access control is **permission based**, not role based. Each role is a list of permissions (for example `expense.approve`, `expense.approve.high`, `payment.record`). Code checks permissions, so Super Admin can change what a role can do without a code change.

### Permissions

| Permission | Meaning |
|---|---|
| `expense.create` | Create expenses and trackers, upload receipts, submit |
| `expense.view.own` | See own expenses |
| `expense.view.all` | See all expenses and trackers |
| `expense.approve` | Approve a step that requires standard approval |
| `expense.approve.high` | Approve a step that requires senior/high-value approval |
| `expense.reject` | Reject a claim at its current step |
| `expense.batch_approve` | Approve multiple claims in one request |
| `payment.record` | Record payments against approved claims |
| `user.manage` | Create and list users |
| `role.manage` | Create roles and edit permission grants in Admin |
| `approval.policy.manage` | Create, list, and deactivate approval policies |

---

## 3. Feature status

### Built

| Area | What it does |
|---|---|
| Users and roles | Users with a role; seed script creates roles and the first Super Admin |
| Auth | JWT login; permissions are read from the database on every request, so role changes apply immediately |
| Expenses | Create, view (scoped by permission), submit, approve, reject, resubmit |
| Expense workflow | Explicit status transitions (DRAFT, SUBMITTED, APPROVED, REJECTED, PARTIALLY_PAID, PAID) |
| Audit trail | `expense_history` row for every status change, with actor and comment |
| Multi-level approval | Approval chain snapshotted per expense at submit; strict step order; no self-approval; no two steps by the same person |
| Approval policies | Chains selected by amount and category, with priority; Super Admin manages them; preview endpoint |
| Approver queue | `GET /expenses/queue/pending` shows claims waiting at the caller's step |
| Batch approval | Approve many claims per request; per-item success and failure |
| Payments | Partial and full payments; row locks prevent double payment; overpayment blocked |
| Receipts (attachments) | Upload to the in-house file server over SFTP; file type checked by magic bytes; 5 MB limit; private download through the API with permission checks |
| Trackers | Group expenses by task or project, with date range and optional budget |
| Tracker summary | Committed, paid, outstanding, budget remaining, totals by status and by month |
| Recurring schedules | Daily, weekly, or monthly rules that create draft expenses; idempotent; resume from checkpoint |
| Daily generation job | Cron job at 01:00 in the app timezone generates due recurring expenses |
| Bulk submit | Submit a tracker's drafts by date range or schedule; dry-run preview; up to 200 per call |
| Public assets CDN | nginx serves `/public/` from the file server; receipts are never exposed publicly |

### Planned (next steps)

1. **Migrations.** Replace `synchronize: true` with versioned Sequelize migrations before production.
2. **Notifications.** Notify the next step's approvers when a claim reaches them, and the employee on each decision (email or in-app).
3. **Escalation.** Remind or reroute a step pending longer than a set number of days.
4. **Delegation.** Let an approver hand their queue to a colleague while away.
5. **Finance payment queue.** A view of approved and partially paid claims, filterable by tracker, employee, and date.
6. **Roles endpoint.** Super Admin creates roles and edits their permissions through the API.
7. **Schedule editing.** PATCH endpoint for recurring amounts, with an effective-from date.
8. **Multi-level approval for tracker expenses.** Apply thresholds to tracker totals, not just single claims.
9. **Virus scanning.** ClamAV on receipt uploads before they are accepted.
10. **Streaming downloads.** Stream large receipts instead of loading them into memory.
11. **Swagger docs and automated tests.** `@nestjs/swagger`, unit tests for recurrence and workflow, and end-to-end tests for the approval chain.
12. **Frontend.** Employee, CA, Finance, and Admin screens. Design after the API is stable.

---

## 4. Expense lifecycle

```
DRAFT ──submit──▶ SUBMITTED ──(all approval steps approved)──▶ APPROVED
                     │  ▲                                          │
                     │  └── resubmit ◀── REJECTED ◀── reject       │
                     │                                             │
                     └──────── reject at any step ──▶ REJECTED     │
                                                                   ▼
                                       PARTIALLY_PAID ──▶ PAID
                                             ▲                 ▲
                                             └── payments ─────┘
```

- **Submit** creates the approval chain for the expense from the matching policy.
- **Approve** completes the current step. If more steps remain, the expense stays SUBMITTED and the next step becomes current. When the last step is approved, the expense becomes APPROVED.
- **Reject** at any step sets the expense to REJECTED with a reason. The employee can edit receipts and resubmit, which creates a fresh chain.
- **Payments** are allowed only on APPROVED or PARTIALLY_PAID expenses. The status becomes PARTIALLY_PAID or PAID depending on the running total.
- Receipts can change only while the expense is DRAFT or REJECTED.

---

## 5. Approval design

- **Policies** decide the chain. A policy has an optional category, a minimum amount, a priority, and ordered steps. The matching active policy with the highest priority wins. Ties go to the higher minimum amount, then the earliest creation time, with the UUID as a stable final tie-breaker.
- **Fallback.** If no policy matches, a single `expense.approve` step applies.
- **Snapshot at submit.** Steps are copied into `expense_approvals` when the expense is submitted. Changing or deactivating a policy does not affect claims already in progress.
- **Strict order.** Only the first pending step can be acted on.
- **No self-approval.** The claim owner cannot act on their own claim.
- **Segregation of duties.** The same person cannot approve two steps of one claim.
- **Batch approval** approves each claim at its current step. Failures include the reason (for example, "This step requires: Admin sign-off").

Example policies:

| Policy | Min amount | Priority | Steps |
|---|---|---|---|
| Standard claims | 0 | 0 | CA review (`expense.approve`) |
| High value | 25,000 | 10 | CA review, then Admin sign-off (`expense.approve.high`) |

---

## 6. Trackers and recurring expenses

A **tracker** is a task or project with a start date, optional end date, and optional budget. Its expenses have dates inside that range.

A **schedule** is a recurring rule on a tracker: frequency (DAILY, WEEKLY, MONTHLY), interval, amount, category, start date, and optional end date.

- Generation creates **DRAFT** expenses on each due date, up to today or the tracker's end date.
- Each schedule keeps a `generatedThrough` checkpoint, so runs compute only new dates.
- A unique index on `(scheduleId, occurrenceDate)` prevents duplicates, even if the cron job and a manual trigger overlap.
- Monthly rules on the 31st land on the last day of shorter months.
- Changing a schedule affects future occurrences only.
- Generated drafts are not submitted automatically. The employee submits them, individually or with bulk submit.
- Closing a tracker stops generation. Existing drafts can still be submitted.
- Budget totals count committed spend (everything except rejected expenses).

---

## 7. Receipts and file storage

- Files are uploaded to the file server over **SFTP** under `/srv/expense-files/private/receipts/YYYY/MM/<uuid>.<ext>`.
- Uploads write to a `.part` file and rename it, so a broken upload never looks valid.
- The file type is detected from its first bytes (JPEG, PNG, WEBP, PDF). The client's MIME type and file name are not trusted.
- Maximum size is 5 MB and maximum 10 receipts per expense.
- Storage keys are random UUIDs. The original file name is stored as metadata only.
- Receipts are **never** public. They are streamed through the API after a permission check.
- **Public assets** (logos, letterheads) go in `/srv/expense-files/public/` and are served by nginx at `/public/`.
- Storage sits behind a `StorageProvider` interface, so S3 or another backend can replace SFTP without changing the services.

Server layout:

```
/srv/expense-files/
├── private/   ← receipts; readable only by the API's SFTP user
└── public/    ← served by nginx at https://cdn.yourcompany.internal/public/
```

---

## 8. API reference

All routes except `POST /auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | none | Returns JWT and user info |

### Users
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/users` | `user.manage` | Create a user |
| GET | `/users` | `user.manage` | List users |
| GET | `/users/roles` | `user.manage` | List roles and their UUIDs |

### Expenses
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/expenses` | `expense.create` | Create a draft expense |
| GET | `/expenses` | view own or all | List (filters: `status`, `employeeId`) |
| GET | `/expenses/queue/pending` | `expense.approve` | Claims waiting at the caller's step |
| POST | `/expenses/batch/approve` | `expense.batch_approve` + `expense.approve` | Approve many claims |
| GET | `/expenses/:id` | view own or all | Expense with approval steps and history |
| POST | `/expenses/:id/submit` | owner | Submit and create approval chain |
| POST | `/expenses/:id/approve` | step permission | Approve current step |
| POST | `/expenses/:id/reject` | `expense.reject` | Reject with reason |

### Approval policies
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/approval-policies` | `approval.policy.manage` | Create a policy with ordered steps |
| GET | `/approval-policies` | `approval.policy.manage` | List policies |
| GET | `/approval-policies/preview?amount=&category=` | any signed-in user | Chain that would apply |
| POST | `/approval-policies/:id/deactivate` | `approval.policy.manage` | Deactivate a policy |

### Payments
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/expenses/:expenseId/payments` | `payment.record` | Record a payment (amount, paidOn, reference) |
| GET | `/expenses/:expenseId/payments` | `payment.record` | List payments for an expense |

### Attachments
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/expenses/:expenseId/attachments` | owner, `expense.create` | Upload a receipt (form field `file`) |
| GET | `/expenses/:expenseId/attachments` | view own or all | List receipts (no storage paths) |
| GET | `/attachments/:id/download` | view own or all | Download a receipt |
| DELETE | `/attachments/:id` | owner | Delete a receipt (draft or rejected only) |

### Trackers
| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/trackers` | `expense.create` | Create a tracker |
| GET | `/trackers` | view own or all | List trackers |
| GET | `/trackers/:id` | view own or all | Tracker details |
| POST | `/trackers/:id/close` | owner | Close tracker and stop its schedules |
| GET | `/trackers/:id/summary` | view own or all | Totals and breakdowns |
| GET | `/trackers/:id/expenses?from=&to=&status=` | view own or all | Tracker expenses |
| POST | `/trackers/:id/expenses` | owner | Add an expense inside the tracker date range |
| GET | `/trackers/:id/schedules` | view own or all | List recurring schedules |
| POST | `/trackers/:id/schedules` | owner | Create a recurring schedule (backfills due drafts) |
| POST | `/trackers/:id/schedules/:scheduleId/stop` | owner | Stop a schedule |
| POST | `/trackers/:id/generate` | owner | Generate due drafts now |
| POST | `/trackers/:id/submit-drafts` | owner | Bulk submit drafts (`from`, `to`, `scheduleId`, `dryRun`) |

---

## 9. Setup

### Prerequisites
- Node.js 18 or later, npm
- MySQL 8
- SSH access to the file server with an SFTP key for the API user

### Install

```bash
npm install
mysql -u root -p -e "CREATE DATABASE expense_tracker;"
```

### Environment (`.env`)

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=yourpassword
DB_NAME=expense_tracker
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES=1d

SFTP_HOST=files.internal.yourcompany.com
SFTP_PORT=22
SFTP_USER=expense-api
SFTP_PRIVATE_KEY_PATH=/etc/expense-api/id_ed25519
SFTP_BASE_PATH=/srv/expense-files/private

APP_TIMEZONE=Asia/Kolkata

SEED_ADMIN_EMAIL=superadmin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

### Seed roles and the first Super Admin

```bash
npm run seed
```

Run it again after permission changes; it syncs default permissions to existing roles.

### Start

```bash
npm run start:dev
```

### File server (one-time)

```bash
sudo useradd -m -s /usr/sbin/nologin expense-api
sudo mkdir -p /srv/expense-files/{private,public}
sudo chown -R expense-api:www-data /srv/expense-files
sudo chmod -R 750 /srv/expense-files
```

Restrict the API user to SFTP in `/etc/ssh/sshd_config`:

```
Match User expense-api
    ForceCommand internal-sftp
    PasswordAuthentication no
    AllowTcpForwarding no
    X11Forwarding no
```

Then `sudo systemctl restart ssh`. Install the API's public key in `/home/expense-api/.ssh/authorized_keys`. Serve `/public/` through nginx as shown in the architecture notes in section 7.

---

## 10. Source file manifest

```
expense-tracker-api/
├── .env
├── package.json                        (add "seed" script, see setup)
├── docs/README.md                      (this file)
└── src/
    ├── main.ts
    ├── app.module.ts                   imports ConfigModule, SequelizeModule, ScheduleModule, all feature modules
    ├── seed.ts
    ├── common/
    │   ├── permissions.ts              permission constants, APPROVAL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS
    │   ├── types.ts                    AuthUser
    │   ├── decorators/require-permissions.decorator.ts
    │   └── guards/permissions.guard.ts
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── jwt.strategy.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   ├── dto/create-user.dto.ts
    │   └── models/ role.model.ts, user.model.ts
    ├── expenses/
    │   ├── expenses.module.ts
    │   ├── expenses.controller.ts
    │   ├── expenses.service.ts
    │   ├── expense-workflow.ts         statuses and allowed transitions
    │   ├── dto/ create-expense.dto.ts, reject-expense.dto.ts, batch-approve.dto.ts
    │   └── models/ expense.model.ts, expense-history.model.ts, expense-approval.model.ts
    ├── approvals/
    │   ├── approvals.module.ts
    │   ├── approval-policies.controller.ts
    │   ├── approval-policies.service.ts
    │   ├── dto/create-approval-policy.dto.ts
    │   └── models/ approval-policy.model.ts, approval-policy-step.model.ts
    ├── payments/
    │   ├── payments.module.ts
    │   ├── payments.controller.ts
    │   ├── payments.service.ts
    │   ├── dto/record-payment.dto.ts
    │   └── models/payment.model.ts
    ├── storage/
    │   ├── storage.interface.ts
    │   ├── sftp-storage.provider.ts
    │   └── storage.module.ts
    ├── attachments/
    │   ├── attachments.module.ts
    │   ├── attachments.controller.ts
    │   ├── attachments.service.ts
    │   ├── file-validation.ts
    │   └── models/attachment.model.ts
    └── trackers/
        ├── trackers.module.ts
        ├── trackers.controller.ts
        ├── trackers.service.ts
        ├── trackers.scheduler.ts
        ├── recurrence.ts
        ├── dto/ create-tracker.dto.ts, create-schedule.dto.ts, submit-drafts.dto.ts
        └── models/ tracker.model.ts, tracker-schedule.model.ts
```

### Packages

```bash
npm i @nestjs/config @nestjs/sequelize sequelize sequelize-typescript mysql2 \
      @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt \
      class-validator class-transformer @nestjs/schedule ssh2-sftp-client
npm i -D @types/sequelize @types/passport-jwt @types/bcrypt \
         @types/ssh2-sftp-client @types/multer
```

---

## 11. Fixes to apply while assembling

These came up across the earlier steps. Apply them when you combine the files:

1. **Route order in `expenses.controller.ts`.** `@Get('queue/pending')` and `@Post('batch/approve')` must appear above any `@Get(':id')` or `@Post(':id/...')` route.
2. **Unused import.** Remove `Patch` from the imports in `expenses.controller.ts`.
3. **Expense model.** Add the `Tracker`, `TrackerSchedule`, `Attachment`, and `ExpenseApproval` relations and the `trackerId`, `scheduleId`, and `occurrenceDate` columns, as shown in the tracker and approval sections.
4. **Expense `paidAmount`.** Keep the default of `0` so payments can start from zero.
5. **Roles.** Create roles and change grants in Admin. Grant changes take effect on subsequent API requests. Use `GET /users/roles` to look up the UUID to send as `roleId` when creating a user.
6. **Schema.** Development uses `synchronize: true`, which creates tables from the models. Do not use it in production.

---

## 12. Design principles

- **Permissions, not roles, in code.** Roles are configuration.
- **Explicit state machine.** Every change goes through one transition helper that checks the rules and writes history.
- **Snapshot what was agreed.** Approval chains are copied at submit time. Generated expenses keep their original amounts.
- **Concurrency-safe money.** Row locks protect approvals and payments. Recurring generation is idempotent through a unique index.
- **Partial success for batches.** One bad item never blocks the rest, and every failure says why.
- **Private by default.** Receipts are served only through authorized API calls. Only deliberately placed public assets are served by nginx.
- **Replaceable infrastructure.** Storage is behind an interface and timezone-sensitive scheduling is configured by environment variable.
