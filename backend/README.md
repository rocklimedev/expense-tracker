# Expense Tracker API

NestJS + MySQL + Sequelize (TypeScript) backend for expense claims with multi-level approval,
batch approval, payments, receipts on an in-house SFTP file server, trackers, and recurring expenses.

See `docs/README.md` for the full documentation, API reference, and roadmap.

## Quick start

    cp .env.example .env        # then edit values
    npm install
    mysql -u root -p -e "CREATE DATABASE expense_tracker;"
    npm run seed                # roles + first Super Admin
    npm run start:dev

## Upgrade an existing integer-key database

Stop the backend and any other writers, then back up the MySQL database. Apply the migration
once from the repository root before starting the UUID version of the app.

```sh
mysql -h HOST -u USER -p DB_NAME < backend/migrations/001-integer-keys-to-uuid.sql
```

MySQL implicitly commits schema changes. If the migration fails, restore the backup before
retrying. Existing API clients must use the new UUIDs, and users must sign in again because
existing tokens contain integer user IDs. Fresh databases initialized with the updated models
already use UUIDs.

## Upgrade existing roles to RBAC tables

Stop the backend and other database writers, then back up the database. On MySQL 8.0.21 or
later, apply this migration from the repository root before starting the updated backend.
For integer-key databases, apply migration 001 first.

```sh
mysql -h HOST -u USER -p DB_NAME < backend/migrations/002-role-permission-tables.sql
```

The migration copies the existing JSON grants into `permissions` and `role_permissions`,
then drops the legacy column. Restore the backup if migration fails. Fresh development
databases create these tables automatically. The app registers supported permission codes on
startup, and `npm run seed` applies default grants only when it creates a role.

Use **Admin → Roles** to create a role and **Admin → Permissions Matrix** to grant or revoke
access. Changes apply to subsequent API requests, including requests with existing tokens.
An administrator can refresh the app to pick up menu changes made by another session.

## Upgrade existing databases to the expense category catalog

Stop the backend and other database writers, then back up the database. Apply migration 003
before starting the updated backend. It preserves categories already used on expenses,
recurring schedules, and approval policies and links those records to the category catalog.

```sh
mysql -h HOST -u USER -p DB_NAME < backend/migrations/003-expense-categories.sql
```
