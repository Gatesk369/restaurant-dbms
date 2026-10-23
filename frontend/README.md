# Restaurant DBMS frontend

React 19 and React Router 8 (framework mode, SPA), Tailwind CSS 4, TypeScript.
It talks to the Django API in `../backend` and is built to match the mock-ups in
[`../docs/design`](../docs/design). Plan and specs:
[`../docs/frontend-implementation-plan.md`](../docs/frontend-implementation-plan.md)
and [`../docs/design-system.md`](../docs/design-system.md).

## Role-based navigation

Navigation, startup tiles, and report links use the authenticated staff role.
Cashiers see Orders and Payments; wait staff and kitchen staff see Orders;
managers see Orders, Payments, Menu management, and Reports. Unavailable
screens are omitted rather than shown as locked cards. Direct visits to a
forbidden screen redirect to the first permitted destination (currently Orders)
before its loader requests protected data. API authorization remains independent.

Managers can review served orders in Payments, while payment-entry controls
remain exclusive to cashiers. Cashier receipts offer the next order or a return
to Orders, without a link to manager-only reports.

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
| `VITE_TABLE_IDS`          | `1-12`                  | Table ids shown on Orders until `GET /api/tables/` exists: a range (`1-12`) or a list (`1001,1002`)                                |
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
