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
