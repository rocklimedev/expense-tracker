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

## Usability pass (round 2)
- **Dates are local.** `todayIso()` used UTC, so between midnight and 05:30 IST the default date, the "Today" shortcut and the date limit were one day behind. All screens now use local calendar dates through `toIsoDate`, `todayIso` and `daysAgoIso`.
- **Labels are linked to their fields.** `Field` ties its label to the control with `htmlFor`, so clicking the label focuses the field and screen readers read the label. Pass `htmlFor` when the control sits inside a wrapper.
- **Keyboard access to claims.** Rows in the expenses table can be reached with Tab and opened with Enter or Space.
- **Phone shortcut for new claims.** A floating "New expense" button sits above the tab bar on phones, because the header button scrolls out of view.
- **Back button on the new-claim form** returns to the previous screen inside the app, and falls back to the expenses list when the page was opened directly.
- **Receipts.** Removing a receipt asks for confirmation. The upload area shows a focus ring for keyboard users. Opened receipts free their temporary URL after a minute.
- **Login.** The password field has a show/hide toggle.

## Round 3: spending first, not pipeline
The app had been laid out like a sales CRM: status tabs, stat tiles and tables of records. It now reads as a personal finance tool.
- **Expenses is a spending overview.** The top card shows what was spent this month, the change from last month, a six-month bar chart, and the amounts awaiting approval and waiting to be reimbursed. "Where it went" shows the category split as a stacked bar with a ranked list. Claims are a transaction feed grouped by day, with Today and Yesterday headings and a day total.
- **A claim is a receipt.** The amount sits on a paper-style card with line items, a dashed tear line and a payment bar. The title is what the money was for.
- **Navigation uses money words.** Trackers are now Budgets, Approvals is To approve, Payments is Reimbursements, Policies is Approval rules, and Users is Team. The sidebar is dark and has a New expense button.
- **Categories have colours.** Each category has a solid bar colour for the breakdown, alongside its icon.
