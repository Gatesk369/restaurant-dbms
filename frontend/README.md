# Restaurant DBMS frontend

React 19 and React Router 8 (framework mode, SPA), Tailwind CSS 4, TypeScript.
It talks to the Django API in `../backend` and is built to match the mock-ups in
[`../docs/design`](../docs/design). Plan and specs:
[`../docs/frontend-implementation-plan.md`](../docs/frontend-implementation-plan.md)
and [`../docs/design-system.md`](../docs/design-system.md).

## Role-based navigation

Navigation and report links use the authenticated staff role.
Cashiers see Orders and Payments; wait staff and kitchen staff see Orders;
managers see Orders, Payments, Menu management, and Reports. Unavailable
screens are omitted rather than shown as locked cards. Direct visits to a
forbidden screen redirect to the role's default workspace before its loader
requests protected data. API authorization remains independent.

Managers can review served orders in Payments, while payment-entry controls
remain exclusive to cashiers. Cashier receipts offer the next order or a return
to Orders, without a link to manager-only reports.

## Direct workspace entry

After sign-in, cashiers enter Payments; wait staff and kitchen staff enter
Orders; managers enter Orders and can use the sidebar for other permitted
screens. Visiting `/` with a stored session uses the same default. The startup
menu and its tiles have been removed (#37).

The authenticated API role determines the destination, regardless of the role
card selected or URL query parameters. A rejected staff session is cleared before
returning to sign-in with an expiry message, preventing redirect loops. Sign-out
remains in the staff sidebar and clears the session and payment tally.

## Ordering and staff responsibilities

Customers submit orders through `/station`. The database assigns an available
waiter, or queues the order as pending until one becomes available. Staff and
managers use `/orders` to follow fulfillment; they do not create orders.

Wait staff see only their assigned orders with table, items and special
instructions. Kitchen staff start preparation and mark orders ready. The
assigned waiter delivers the order and marks it served; managers retain a
service override. Waiters bring payment options to the table, and cashiers
record payment for served orders.

This workflow supersedes the original staff order-entry mock-up and the G3
customer-session fallback described in the historical frontend plan (#35).

## Run it

```bash
cd frontend
npm ci
cp .env.example .env.local   # set VITE_API_URL if the API is not on 127.0.0.1:8000
npm run dev                  # http://localhost:5173
```

The backend's CORS list allows `http://localhost:5173`. Start the API as
described in the root `README.md`.

## Environment

| Variable                  | Default                 | Purpose                                                                                                                            |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`            | `http://127.0.0.1:8000` | Base URL of the Django API                                                                                                         |
| `VITE_PROTOTYPE_CONTROLS` | `false`                 | Shows the station's "Prototype only" advance button                                                                                |
| `VITE_DEMO_PREFILL`       | `false`                 | Lets the sign-in role cards prefill seeded demo usernames (development only)                                                       |
| `VITE_DEMO_PASSWORD`      | empty                   | Password prefilled with the demo username when `VITE_DEMO_PREFILL=true` (development only)                                         |
| `VITE_TABLE_IDS`          | `1-12`                  | Table ids shown at the ordering station until `GET /api/tables/` exists: a range (`1-12`) or a list (`1001,1002`)                  |
| `VITE_STYLEGUIDE`         | unset                   | `true` adds the `/styleguide` primitives sheet used by the visual tests (the e2e build sets it; never set it for a deployed build) |

`VITE_*` values are inlined at build time.

## Scripts

| Command                                 | What it does                                          |
| --------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                           | Dev server with HMR                                   |
| `npm run build`                         | Static SPA build in `build/client`                    |
| `npm run typecheck`                     | Generates route types and runs `tsc`                  |
| `npm run lint` / `npm run format:check` | ESLint (with jsx-a11y) and Prettier                   |
| `npm test`                              | Vitest unit and component tests (`tests/unit`)        |
| `npm run test:e2e`                      | Playwright against the production build (`tests/e2e`) |
| `npm run capture:references`            | Re-renders the mock-ups into `tests/visual/reference` |

Playwright needs a browser once: `npx playwright install chromium`.

Visual tests keep the original mock-up captures in `tests/visual/reference`.
Approved workflow changes (such as the Orders copy in #35) use separate
Playwright baselines under `tests/e2e/*-snapshots`; review those images when
updating them rather than relaxing the mock-up comparison tolerance.

## Layout

```
app/
  app.css            design tokens (@theme) and base styles
  root.tsx           document shell, error boundary
  routes.ts          route table
  routes/            route modules
  components/
    ui/              primitives: Button, Field/Input, Chip/ToggleChip, RadioCard,
                     Panel, Toast, QuantityStepper, DataTable, TableTile, ...
    staff/           Sidebar, PageHeader
  lib/
    api/             fetch client, ApiError, endpoint modules, domain types
    access.ts        which role may use which screen
    session.ts       staff and customer tokens (sessionStorage)
    money.ts         UGX parsing and formatting
tests/
  unit/              Vitest
  e2e/               Playwright (token and flow tests)
  fixtures/          the mock-ups' sample data in API shape
  visual/            reference captures and the script that makes them
```

## Conventions

- Tokens only: colours, type and radii come from `app/app.css`; do not add
  arbitrary values. The values are documented in `docs/design-system.md`.
- Money is whole shillings; convert DRF decimal strings at the API boundary
  (`lib/money.ts`).
- Tokens live in `sessionStorage`; never log them.
- Where the API cannot yet supply what a mock-up shows, follow the interim
  rendering in section 4.2 of the plan and mark the shim with the gap number.

## Staff task feedback

Orders show status-change confirmations. Payments show
receipts, queue updates, and the session total. Both keep actionable errors.
Database activity panels and their frontend-generated SQL descriptions were
removed in #39; no operational screen queries or synthesizes an audit stream.

Educational trigger explanations remain in the [data dictionary](../docs/data-dictionary.md)
and [historical design notes](../docs/design/ui-ux-design-document.md#database-activity-historical-mock-up).
Backend triggers, payment transactions, and actual audit logging are unaffected.

## Customer ordering and payment

Customers submit their cart and kitchen instructions at `/station` without
choosing a payment method. Review and tracking never initiate a payment request
or claim payment was collected. Older saved drafts retain the cart and notes
while discarding payment-choice, network, and phone fields.

The cashier chooses the actual cash or mobile-money method at checkout. Cash
amount/change and mobile network/phone validation remain in the cashier flow.
The API stores Cash or Mobile Money for receipts and reports; network and phone
remain local cashier details until backend issue #16 is implemented.

## Loading feedback

Pending actions use the existing Button component with a visible progress
indicator, an action-specific label, `aria-busy`, and a live announcement outside
the busy button. Controls disabled for missing required input do not show
progress. Motion-sensitive users get the same indicator without animation.

The initial data load shows Loading; route changes name the destination while
keeping the previous screen visible. Staff background refreshes preserve the
current content and expose busy state without flashing a navigation banner.
Status changes stay locked through queue revalidation. Menu and payment controls
cannot switch targets or modify form values during a mutation; failed requests
restore controls and retain input for retry.

`tests/e2e/loading.spec.ts` holds API responses open to check pending UI and
repeated clicks, injects failures, and verifies retries and single order/payment
creation. Call-a-waiter remains a synchronous prototype toast (backend #18), so
it has immediate feedback rather than a simulated network loading state.

## Responsive workspace

Staff pages fill the viewport height and available width. Below 880px,
navigation becomes a wrapping row above the content. Wide data tables scroll
inside their panels instead of widening the page.

Customer ordering uses responsive columns and normal vertical scrolling, replacing
the original fixed-canvas scaling (#41). Text and touch controls retain their sizes.
Categories move above the menu at 1100px and below; ordering panels stack below
768px. Review and confirmation stack at 1100px. Background polling and draft
persistence work as before.

`tests/e2e/responsive.spec.ts` covers staff at 512, 880, 1024, 1360 and 1920px, and all
ordering steps at 1024×768, 1920×1080, portrait, and a 200% zoom-equivalent CSS
viewport. It checks overflow, keyboard focus, scrolling to actions, and touch
control dimensions. See [before/after captures](../docs/issue-41/README.md).
