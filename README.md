# Split

A simple, privacy-friendly group expense splitter. Create a group, record what everyone paid and what everyone owes, and Split keeps track of the rest.

Built with **React + TypeScript + Vite**, styled with **Tailwind CSS v4**, and validated with **Zod**. A frontend-only application today — all data lives in the browser via `localStorage`.

## What problem does it solve?

Splitting costs with friends, roommates, or colleagues usually means a spreadsheet, a group-chat ledger, or a pile of "you still owe me" texts. Split replaces that with a small, focused tool:

- decide who is in the group;
- record each expense exactly as it happened — who **paid** (possibly several people) and who **owes** (possibly several people);
- let Split calculate the totals and, in the future, the final transfers.

Because everything is stored locally in the browser, there is no account, no backend, and no one else's server holding your financial data.

## Features

- **Create a group** and give it a name.
- **Manage people** — add and remove people before the group is created.
- **Record expenses** with a description, a total amount, and per-person detail:
  - multiple people can **pay** one expense, with **custom amounts** per payer;
  - multiple people can **owe** for one expense, with **custom share amounts** per person.
- **Edit and delete** recorded expenses.
- **Validation** at the model level — payments, shares, and the expense total must agree, and negative amounts are rejected.
- **Integer-paise money handling** — amounts are entered in rupees and stored as whole paise, avoiding floating-point drift.
- **Local persistence** — the current group and all of its expenses survive a page refresh (`localStorage`, key `split.group.v1`), and corrupted or missing stored data safely falls back to a clean state.

## Tech stack

| Layer            | Choice                        |
| ---------------- | ----------------------------- |
| Language         | TypeScript                    |
| UI               | React                         |
| Build tool       | Vite                          |
| Styling          | Tailwind CSS v4               |
| Validation       | Zod                           |
| Testing          | Vitest                        |

The application is deliberately structured into three layers:

- `src/domain/` — pure money and settlement calculation logic, with no UI or storage concerns.
- `src/model/` — the group and expense data model: validation and mutation of groups, people, and expenses.
- `src/` (App + components/hooks/lib) — React UI and local persistence, wired to the domain and model.

## How it works

Money is handled as **integer paise** throughout. The UI accepts rupee amounts (`e.g. 12.50`), converts them with `rupeesToPaise`, and domain validation and calculation operate only on integer paise. Display formatting goes back through `paiseToRupees`.

Expenses are validated against three rules (enforced by a Zod schema in `src/domain/expense.schema.ts`):

1. the total must be a positive whole number of paise;
2. the sum of all payment amounts must equal the expense total;
3. the sum of all share amounts must equal the expense total.

### Example: one expense, multiple payers, custom shares

Say a dinner costs **₹3,000**. Nia pays the full bill, while the cost is shared between Nia, Rahul, and Anu. The expense is recorded as:

- **Description:** `Dinner at the casa`
- **Total:** `3000.00` (stored as `300000` paise)
- **Payments (who paid):**
  - Nia — ₹3,000.00
- **Shares (who owes):**
  - Nia — ₹1,000.00
  - Rahul — ₹1,000.00
  - Anu — ₹1,000.00

What if Rahul also paid part of the bill? The expense simply gains a second payment:

- **Payments:**
  - Nia — ₹2,500.00
  - Rahul — ₹500.00
- **Shares:**
  - Nia — ₹1,000.00
  - Rahul — ₹1,000.00
  - Anu — ₹1,000.00

In both cases the payments total ₹3,000 and the shares total ₹3,000, so the expense passes validation.

## Project structure

```
src/
├── domain/        # Pure calculation & validation (money, balances, settlements, Zod schema)
│   ├── money.ts           # Paise conversion and formatting
│   ├── expense.ts         # Balances and settlements calculation engine
│   └── expense.schema.ts  # Zod validation for expenses
├── model/         # Data model: groups, people, and expense records
│   ├── group.ts           # createGroup, addPerson, removePerson, renamePerson
│   ├── expense.ts         # recordExpense, updateExpense, removeExpense
│   └── toDomain.ts        # Maps model expense records to the domain expense shape
├── lib/
│   └── storage.ts         # localStorage persistence (load/save/clear)
├── hooks/
│   └── usePersistedGroup.ts  # Restores and auto-saves the group
└── components/    # UI: GroupSetupScreen, GroupScreen, ExpenseFormScreen, ...
```

## Getting started

Requires **Node.js** with a recent npm.

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Available scripts

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Vite dev server                     |
| `npm run build`   | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally          |
| `npm run lint`    | Run ESLint                                    |
| `npm run typecheck` | Type-check the project with `tsc -b`        |
| `npm run test`    | Run the Vitest test suite once                |
| `npm run test:watch` | Run Vitest in watch mode                    |

## Testing

Tests live next to the code they cover and are run with **Vitest**:

- **Domain & model tests** — money conversion, expense validation, group/person rules, expense CRUD (`src/domain/*.test.ts`, `src/model/*.test.ts`).
- **Persistence tests** — saving, restoring, and corrupted-data fallbacks for `localStorage`, using an in-memory storage mock so the suite runs in a Node environment without a browser (`src/lib/storage.test.ts`).
- **Component smoke tests** — server-render checks that screens render their expected structure (`src/components/*.test.tsx`).

```bash
npm run test
```

## Current status & roadmap

**Implemented**

- Group creation and people management
- Expense creation, editing, and deletion with custom payments and shares
- Expense validation and integer-paise money handling
- Balance/settlement **calculation engine** in the domain layer
- Local persistence through `localStorage`

**Not yet implemented**

- **Equal split** — automatically dividing a total evenly across a set of people
- **Settlement UI** — a screen that shows the suggested final transfers between people (the calculation engine exists, but there is no user-facing view of settlements yet)
- Multi-group management
- Backend, authentication, accounts, or any server-side storage
- Sharing/collaboration between users

The application is currently **frontend-only** and single-group.

## Project

- Repository: [github.com/nia-thegreat/split](https://github.com/nia-thegreat/split)