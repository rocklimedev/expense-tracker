# Expense Tracker: UI redesign notes

## Direction: "calm finance"
- Warm off-white canvas, white surfaces, one accent (deep teal).
- Status colours are muted except the one that needs attention, so the eye goes to pending work.
- Amounts use tabular numerals so columns line up.

## What changed
- **App shell:** grouped sidebar on desktop (Workspace / Approvals / Admin). On mobile, four bottom tabs plus a full menu.
- **Expenses list:** four summary cards (awaiting approval, approved but unpaid, paid out, drafts). Status tabs with counts replace the dropdown. Search covers category, note, employee and amount. Table on desktop, cards on mobile.
- **New expense:** the amount is the hero field. Category is a tap grid with icons. Date has Today and Yesterday shortcuts. The approval route previews live as the amount is typed. Two actions: Save draft, or Submit for approval.
- **Expense detail:** the amount and payment progress come first. A "Next step" panel sits beside the claim and shows exactly what the current user can do, which moves to the top on mobile. The approval chain is a vertical stepper. Receipts have a clear drop-zone. Activity is a timeline.
- **Login:** split layout with a brand panel on desktop.

## What did not change
- All API calls, auth, routing, permissions, types and status transitions are untouched.
- Shared components keep their props, so the trackers, approvals, payments, policies and users pages pick up the new theme without code changes.

## Run
    npm install
    npm run dev
