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
