# Frontend Implementation Plan

Plan for building the Restaurant DBMS React frontend so that it matches the
approved mock-ups and talks to the existing Django API.

|                  |                                                                                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope            | Staff app (Sign-in and startup menu, Orders, Payments, Menu, Reports) and the customer Ordering station                                                                                                                             |
| Stack            | React 19, React Router 8 (framework mode), Tailwind CSS 4, TypeScript 5.9, Vite 8 (already in `frontend/`)                                                                                                                          |
| Sources of truth | [`docs/design/staff-app-mockups.html`](design/staff-app-mockups.html), [`docs/design/ordering-station-mockup.html`](design/ordering-station-mockup.html), [`docs/design/ui-ux-design-document.md`](design/ui-ux-design-document.md) |
| Companion docs   | [`design-system.md`](design-system.md) (every token and component value), [`data-dictionary.md`](data-dictionary.md) (tables, triggers, endpoints)                                                                                  |
| Frontend lead    | Kaddu Jordan (per the deliverables plan); backend contract questions go to Kamugisha Gates; report queries to Lukundo Susan                                                                                                         |
| Status           | Plan only. No application code has been written yet                                                                                                                                                                                 |

Contents: [1 Goals](#1-goals-and-what-accurate-means) ·
[2 Starting point](#2-starting-point) · [3 Decisions](#3-key-decisions) ·
[4 Backend contract and gaps](#4-backend-contract-and-gaps) ·
[5 Architecture](#5-architecture) · [6 Screen specifications](#6-screen-specifications) ·
[7 Shared domain logic](#7-shared-domain-logic) · [8 Fidelity strategy](#8-fidelity-strategy) ·
[9 Testing](#9-testing-strategy) · [10 Phases](#10-delivery-phases) ·
[11 Risks and open questions](#11-risks-and-open-questions) ·
[12 Definition of done](#12-definition-of-done)

---

## Current access update — issue #36 (23 October 2026)

This update supersedes the original locked-tile navigation specification below.
Sidebar links and startup tiles contain only screens permitted by the signed-in
staff role: cashier → Orders/Payments; wait staff and kitchen → Orders;
manager → all four screens. Locked feature tiles are not part of operational
screens. The subsequent #37 update below removes the startup menu.

Every protected screen checks its permission in its loader before requesting
screen data. Forbidden direct URLs use the role defaults described in #37 below;
unauthenticated visitors still return to sign-in. The API continues to enforce
its own role permissions.

Cashier receipts omit manager-only sales-report links. Managers can review
payment queues and order summaries but do not see cashier-only payment-entry
controls. New visual baselines cover intentionally changed navigation and
receipt layouts; original mock-up comparisons remain for unchanged regions.

## Current entry-flow update — issue #37 (23 October 2026)

This supersedes the original sign-in/startup-menu state machine and the startup
requirements in #2/#20. The root route now renders only the sign-in form for
visitors without a staff session. Successful login and existing sessions at `/`
go directly to a permitted workspace: cashier → Payments; wait staff → Orders;
kitchen → Orders; manager → Orders. The sidebar retains role-permitted navigation
and sign-out. Startup tiles and their unused component/description data are removed.

The role returned by the authentication API determines the landing screen;
role cards and query-string return destinations cannot override it. Forbidden
URLs use the same role default. Expired API sessions are cleared before redirecting
to `/?reason=expired`, so the sign-in route does not send them back into a loop.
Sign-out clears staff credentials and the session payment tally.

## Current workflow update — issue #35 (23 October 2026)

This update supersedes the original staff order-entry mock-ups, G3 workaround,
Phase 2 creation tasks, and any proposal in #14 to add staff order creation.
The separate paid-indicator requirement in #14 remains relevant.

- Customers create orders at `/station` using a customer session. Staff and
  managers have no order-entry form or staff order-creation API. The removed
  staff helper must not fall back to creating a customer session.
- Existing assignment triggers choose an available waiter. If none is free,
  the order stays pending until a waiter becomes available.
- `/orders` is a service board. Wait staff see only their assigned orders,
  including table, items, special instructions and status. They can mark only
  their own ready orders served. They deliver food and physically bring payment
  options to the guest; there is no additional waiter payment selector.
- Kitchen staff advance confirmed → preparing → ready. Only the assigned
  waiter or a manager can advance ready → served. Managers retain the existing
  fulfillment override, but do not create orders.
- Cashiers record payment for served orders. Payment creates the sale and
  releases the table according to the existing transaction/trigger rules.
- The order board polls every 10 seconds and revalidates after a status change.
  Tests assert the revised behavior instead of comparing the removed entry
  form to the old staff-orders artboard.

The detailed Phase 2 mock-up specification below is retained as historical
context; it does not authorize reintroducing staff order entry.

## 1. Goals and what "accurate" means

1. Every screen in the mock-ups exists in the app, built from the same
   layout, tokens, copy and states.
2. The app runs on the real API (login, menu, orders, payments, reports), not
   on the mock-up's sample arrays.
3. Where the real API cannot yet supply what a mock-up shows, the gap is
   named in section 4 with an interim rendering and the backend change that
   closes it. The UI is never quietly changed to fit the API.

"Accurate" is made testable, not left to judgement:

| Level         | Check                                                                                        | How                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Tokens        | Colours, type scale, radii, spacing equal the values in `design-system.md`                   | Computed-style assertions in Playwright                                     |
| Layout        | Same grid, column widths, paddings, breakpoints (880px sidebar collapse, 1280px content max) | Pixel diff against the mock-up rendered at the same size with the same data |
| Copy          | Every label, hint, error and toast matches the mock-up string                                | Copy-deck test (section 8)                                                  |
| Behaviour     | Same validation rules, same enabled/disabled logic, same state machine                       | Unit tests ported from the mock-up logic                                    |
| Accessibility | Same roles, labels, `aria-pressed`, `aria-invalid`, focus ring, target sizes                 | Role queries plus axe                                                       |

Tolerances: pixel diff under 0.5% of pixels per artboard, no layout shift of
more than 1px for any element. Anti-aliasing differences are the only accepted
noise.

## 2. Starting point

### Frontend today

`frontend/` is the untouched React Router template:

| File                                   | State                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `app/root.tsx`                         | Template shell, loads **Inter** from Google Fonts (must become Lato)                   |
| `app/app.css`                          | Tailwind import, Inter font token, white/gray-950 body (must become the design tokens) |
| `app/routes.ts`                        | One route: `index("routes/home.tsx")`                                                  |
| `app/routes/home.tsx`, `app/welcome/*` | Template welcome page, to delete                                                       |
| `react-router.config.ts`               | `ssr: true` (see D1)                                                                   |
| `Dockerfile`                           | Builds and runs `react-router-serve ./build/server/index.js` (see D1)                  |
| `README.md`                            | Template README, to replace                                                            |
| `package.json`                         | No test runner, no lint, no fonts package, no icon set                                 |

### Mock-up inventory

| Mock-up          | Artboard                                    | Screens / states                                        |
| ---------------- | ------------------------------------------- | ------------------------------------------------------- |
| Staff app        | 1360 wide: 780, 1560, 1000, 1500, 2060 high | Sign-in + startup menu, Orders, Payments, Menu, Reports |
| Ordering station | 1280 × 800                                  | Table, Menu, Review, Done                               |

The mock-ups are bundled single files. The exact markup, inline styles and the
sample-data logic are extracted by `docs/design/unpack-mockup.py`; the
extraction is what `design-system.md` and this plan are written from.

### Backend today (summary; full table in section 4)

Django REST Framework, bearer-token staff auth (8 h), `X-Session-Token`
customer sessions (12 h), CORS allows `http://localhost:5173`. Roles are
`cashier`, `kitchen`, `wait_staff`, `manager`. The data model has no table seats,
menu categories, images, customer names, mobile-money network or "archived"
state; the mock-ups assume several of these.

## 3. Key decisions

| #   | Decision                | Recommendation                                                                                               | Why                                                                                                                                 | Cost                                                                                 |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| D1  | Rendering mode          | **SPA** (`ssr: false`), `clientLoader`/`clientAction` only                                                   | Every screen is behind a browser-held token; nothing is public SEO content; SSR would add a server render that cannot see the token | Dockerfile must serve `build/client` as static files instead of `react-router-serve` |
| D2  | Styling                 | Tailwind 4 tokens in `@theme` plus small component primitives; no component library                          | The mock-up is a custom system; a library would fight it                                                                            | None                                                                                 |
| D3  | Data loading            | React Router `clientLoader` + `useRevalidator` polling; no extra data library                                | Few endpoints, simple invalidation after each action                                                                                | Hand-rolled polling hook (30 lines)                                                  |
| D4  | Token storage           | `sessionStorage` for the staff token and the customer session token                                          | Counter terminals are shared; the tab-scoped store clears on close; matches the 8 h and 12 h server expiries                        | A refresh keeps you signed in, closing the tab does not                              |
| D5  | App structure           | One app, two layouts: staff shell and station canvas; no shared state                                        | Matches "independent prototypes" in the design document                                                                             | Two route trees                                                                      |
| D6  | Status vocabulary       | Map backend statuses to the mock-up chips (table below)                                                      | The mock-up has 3 statuses, the backend 6                                                                                           | One additive chip word (`Ready`), needs design sign-off (OQ1)                        |
| D7  | Icons                   | Inline SVG React components using the exact path data from the mock-up                                       | Pixel parity, zero dependencies                                                                                                     | ~15 small components                                                                 |
| D8  | Font                    | `@fontsource/lato` 400 and 700, Latin subset, self-hosted                                                    | Works offline on a kiosk; same Lato v25 glyphs as the mock-up                                                                       | One dependency                                                                       |
| D9  | Charts                  | Hand-built DOM/CSS exactly like the mock-up                                                                  | The mock-up charts are CSS; a chart library would not reproduce them                                                                | A few components                                                                     |
| D10 | Tests                   | Vitest + Testing Library (logic and components), Playwright (visual + e2e)                                   | Fidelity needs real-browser pixel diffs                                                                                             | CI time                                                                              |
| D11 | Station scaling         | Fixed 1280 × 800 canvas, scaled uniformly to fit the viewport                                                | The design is landscape-only and fixed; scaling keeps proportions on any kiosk                                                      | Needs confirmation (OQ5)                                                             |
| D12 | Role card on sign-in    | A shortcut that prefills the demo username; the server's role is authoritative                               | The API decides the role; the card only mirrors the mock-up interaction                                                             | None                                                                                 |
| D13 | Prototype-only controls | The station's "Prototype only: move the order along" button renders only when `VITE_PROTOTYPE_CONTROLS=true` | It is a reviewer aid, not a customer feature                                                                                        | None                                                                                 |

### D6 status mapping

| Backend `order_status` | Chip word | Chip colours                 | Meaning                                      |
| ---------------------- | --------- | ---------------------------- | -------------------------------------------- |
| `pending`              | Pending   | tea / forest                 | Waiting for a waiter to be assigned          |
| `confirmed`            | Pending   | tea / forest                 | Waiter assigned, kitchen not started         |
| `preparing`            | Preparing | moss / white                 | Kitchen is cooking                           |
| `ready`                | Ready     | moss / white                 | Cooked, waiting to be served (additive word) |
| `served`               | Served    | forest / white               | On the table; payable                        |
| `cancelled`            | Cancelled | page / moss, 1px moss border | Hidden from the Active orders board          |

Filter chips on the board stay exactly as in the mock-up (All, Pending,
Preparing, Served); `Pending` counts `pending` + `confirmed`, `Preparing` counts
`preparing` + `ready`.

Next-step buttons depend on role, because the API enforces who may do what:

| Order status      | Kitchen                        | Wait staff (own order)                              | Manager                                                          | Cashier               |
| ----------------- | ------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------- | --------------------- |
| `pending`         | caption "Waiting for a waiter" | same                                                | caption "Waiting for a waiter" (assigning is not in the mock-up) | caption               |
| `confirmed`       | **Start preparing**            | caption "Waiting for the kitchen"                   | **Start preparing**                                              | caption               |
| `preparing`       | **Mark ready**                 | caption "Being prepared"                            | **Mark ready**                                                   | caption               |
| `ready`           | caption "Ready to serve"       | **Mark served**                                     | **Mark served**                                                  | caption               |
| `served` (unpaid) | caption                        | **Take payment** hidden: caption "Awaiting payment" | link **Take payment**                                            | link **Take payment** |

Buttons are `btn-tonal` (primary for Take payment) exactly as in the mock-up;
captions are 12/16 moss text in the same cell.

## 4. Backend contract and gaps

### 4.1 Endpoints the frontend uses

Base URL from `VITE_API_URL` (default `http://127.0.0.1:8000`). JSON in and out.
DRF returns `DECIMAL` values as strings (`"18000.00"`); the client parses them
once at the boundary. Validation errors come back as `{ field: "message" }` or
`{ detail: "message" }`.

| Purpose             | Request                                                                                                                           | Auth                         | Response (fields used)                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in             | `POST /api/auth/login/` `{username, password}`                                                                                    | none                         | `{token, staff:{staff_id, username, role}}`; `401 {detail}`                                                                                                               |
| Current user        | `GET /api/auth/me/`                                                                                                               | Bearer                       | `{staff_id, username, role}`                                                                                                                                              |
| Start table session | `POST /api/customers/` `{table_id}`                                                                                               | none, throttled 30/min       | `201 {customer_id, table_id, session_token}`; `400 {table_id}`                                                                                                            |
| Public menu         | `GET /api/menu/`                                                                                                                  | none                         | `[{menu_item_id, item_name, description, price, availability_status}]`, available items only                                                                              |
| Staff menu          | `GET /api/staff/menu/?search=&include_unavailable=1`                                                                              | Bearer, any role             | same rows                                                                                                                                                                 |
| Create item         | `POST /api/staff/menu/` `{item_name, description?, price, availability_status?}`                                                  | Manager                      | `201` row                                                                                                                                                                 |
| Edit item           | `PATCH /api/staff/menu/{id}/`                                                                                                     | Manager                      | row                                                                                                                                                                       |
| Hide item           | `DELETE /api/staff/menu/{id}/`                                                                                                    | Manager                      | row (sets `availability_status=false`)                                                                                                                                    |
| Place order         | `POST /api/my/orders/` `{items:[{menu_item_id, quantity, special_instructions?}]}`                                                | `X-Session-Token`            | `201 {order_id, table_id, order_status, order_time, items[], total}`                                                                                                      |
| Track order         | `GET /api/my/orders/{id}/`                                                                                                        | `X-Session-Token`            | same shape                                                                                                                                                                |
| Cancel order        | `POST /api/my/orders/{id}/cancel/`                                                                                                | `X-Session-Token`            | order (only `pending`/`confirmed`)                                                                                                                                        |
| Staff queue         | `GET /api/staff/orders/?status=a,b`                                                                                               | Bearer                       | `[{order_id, table_id, order_status, order_time, staff_id, waiter, items[], total}]`, scoped by role (below)                                                              |
| Change status       | `POST /api/staff/orders/{id}/status/` `{status}`                                                                                  | Kitchen, wait staff, manager | order                                                                                                                                                                     |
| Pay                 | `POST /api/staff/orders/{id}/pay/` `{payment_method: "Cash"\|"Mobile Money"}`                                                     | Cashier                      | `201 {payment:{payment_id, amount, payment_method, transaction_time,…}, sales_record:{sales_record_id, total_amount, sale_date,…}}`; `400` not served; `409` already paid |
| Reports             | `GET /api/staff/reports/{daily-sales,top-items,waiter-performance,table-turnover,payment-methods}/?from=YYYY-MM-DD&to=YYYY-MM-DD` | Manager                      | see below                                                                                                                                                                 |

Order line (`items[]`): `{order_item_id, menu_item_id, item_name, unit_price,
quantity, item_subtotal, special_instructions}`.

Queue scoping (server-side, the UI cannot widen it): kitchen sees
`confirmed|preparing|ready`; wait staff see only their own orders in those
statuses unless `?status=` asks for others; cashier sees served orders with no
payment; manager sees everything, filterable.

Report rows:

| Report                     | Fields                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `daily-sales`              | `{from, to, rows:[{sale_date, orders, revenue}], totals:{orders, revenue, avg_order_value}}` (one row per day, zero days included) |
| `top-items` (`limit` 1–50) | `rows:[{menu_item_id, item_name, units_sold, revenue}]`                                                                            |
| `waiter-performance`       | `rows:[{staff_id, username, orders_handled, revenue, avg_order_value}]`                                                            |
| `table-turnover`           | `rows:[{table_id, orders_paid, parties_served, revenue, turnover_per_day}]`                                                        |
| `payment-methods`          | `rows:[{payment_method, payments, revenue}]` (`Cash`, `Mobile Money`)                                                              |

Limits to enforce in the UI: 30 order lines, quantity 1–50 per line, 255
characters per instruction, report range at most 366 days.

### 4.2 Gaps between the mock-ups and the API

Each gap has an **interim rendering** (what ships if the backend change is not
ready, so the frontend is never blocked) and the **backend change** that closes
it. Gaps G1–G9 change what a screen looks like and should be agreed before
Phase 2.

| #   | Mock-up shows                                                                                               | API today                                                                           | Interim rendering                                                                                                                           | Backend change                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| G1  | 12 tables with free/occupied state (Orders, Station)                                                        | No endpoint lists tables                                                            | **Blocked.** Hard-code ids from config for demos only                                                                                       | `GET /api/tables/` (public) → `[{table_id, free_status, seats}]`                                                         |
| G2  | "4 seats" on table tiles; Seats column in Table turnover                                                    | `tables` has no seats                                                               | Tile sub-label reads "Free" / "Occupied"; Seats column hidden                                                                               | `tables.seats INTEGER NOT NULL` + include in G1 and table-turnover                                                       |
| G3  | Waiter creates an order for a table, under their own name                                                   | Only customer-session order creation exists; the waiter is auto-assigned by trigger | Orders screen calls `POST /api/customers/` then `POST /api/my/orders/` with the returned token; "Waiter" shows whoever the trigger assigned | `POST /api/staff/orders/ {table_id, customer_id?, items[]}` for wait staff and manager, setting `staff_id` to the caller |
| G4  | Customer dropdown (Atim Joan…) and guest name                                                               | `customers` has `table_id`, token only                                              | Dropdown shows only "Walk-in guest"; station name is kept in memory and shown on that device                                                | `customers.name VARCHAR(100) NULL`; accept `name` in `POST /api/customers/`; `GET /api/staff/customers/`                 |
| G5  | Category rail, filters and badges (Mains, Snacks, Sides, Drinks, Desserts)                                  | No category column                                                                  | Category comes from a temporary lookup `app/lib/category-fallback.ts` keyed by item name, marked TODO and deleted when G5 lands             | `menu_items.category` with a CHECK over the five values, default `Mains`; accept in create/edit                          |
| G6  | Three item states: Available, Unavailable (can't order today, still listed), Archived (removed, restorable) | One flag, `availability_status`; DELETE sets it false                               | `false` renders as **Archived** only; "Unavailable" and Restore cannot be shown distinctly                                                  | `menu_items.archived BOOLEAN NOT NULL DEFAULT FALSE`; DELETE sets `archived`; PATCH can clear it                         |
| G7  | Item photos on station cards                                                                                | No image field                                                                      | Placeholder plate with initials (this is the mock-up's own fallback, so it looks correct)                                                   | `menu_items.image_url TEXT NULL`; add to create/edit                                                                     |
| G8  | "Sold out" cards on the station                                                                             | Public menu hides unavailable items                                                 | Sold-out cards cannot appear; unavailable items are simply missing                                                                          | `GET /api/menu/` returns every non-archived item including `availability_status` (needs G6)                              |
| G9  | Names: "Okello Peter" in the sidebar, waiter columns, receipts                                              | Login, `me`, reports return `username` only                                         | Show `username` as-is                                                                                                                       | Add `display_name` (`first_name last_name`) to the staff summary, `waiter` in the order queue and `waiter-performance`   |
| G10 | Active orders show "paid"-aware actions                                                                     | Queue has no `paid` flag; paid orders stay `served`                                 | Wait staff and manager boards may list paid orders with "Take payment"; payment returns 409 and shows the server message                    | Add `paid` boolean (or `payment_id`) to the staff order shape; cashier queue already excludes paid                       |
| G11 | Mobile money network (MTN/Airtel) and phone; donut with MTN and Airtel slices                               | Only `payment_method` is stored; reports have two methods                           | Network and phone are collected and validated, not sent; donut shows two slices (Cash, Mobile Money)                                        | `payments.mobile_network`, `payments.payer_phone`; payment-methods report grouped by network                             |
| G12 | "Received today UGX …" chip on Payments (cashier)                                                           | Daily totals are manager-only                                                       | Chip is labelled **Received this session** and sums payments recorded in this browser session                                               | `GET /api/staff/payments/today/` for cashier and manager → `{count, total}`                                              |
| G13 | "Average stay" column in Table turnover                                                                     | Not computed                                                                        | Column hidden                                                                                                                               | Add `avg_stay_minutes` (payment time minus order time) to the table-turnover rows                                        |
| G14 | "Call a waiter" notifies a waiter                                                                           | No endpoint                                                                         | Toast only (as in the mock-up); nothing is sent                                                                                             | `POST /api/my/call-waiter/`                                                                                              |
| G15 | "Mobile money now" collects payment                                                                         | No customer-facing payment flow                                                     | UI-only; the choice is shown on the Done step and not stored (open design question, OQ3)                                                    | Depends on OQ3                                                                                                           |
| G16 | Order tracker reflects kitchen progress                                                                     | Available via polling `GET /api/my/orders/{id}/`                                    | Poll every 5 s                                                                                                                              | None                                                                                                                     |
| G17 | Database activity log of trigger effects                                                                    | The API returns results, not trigger logs                                           | Log lines are built from real responses plus known trigger rules (section 6.2, 6.3)                                                         | None; optional later `GET /api/staff/activity/`                                                                          |

Display identifiers are formatted client-side: `ORD-{order_id}`,
`PAY-{payment_id padded to 4}`, `MI-{menu_item_id padded to 3}`, table label
`T{table_id}`. Demo seed ids (`1001…`) are valid but look different from the
mock-up's `T1…T12`; ask the data lead whether the demo database should be seeded
with table ids 1–12 and menu ids 1–18 (OQ6).

## 5. Architecture

### 5.1 Routes

| Path        | Screen                                                 | Layout         | Roles allowed (UI gate; the API enforces it too) |
| ----------- | ------------------------------------------------------ | -------------- | ------------------------------------------------ |
| `/`         | Sign in, then Startup menu (same artboard, two states) | Sign-in shell  | public                                           |
| `/orders`   | Orders                                                 | Staff shell    | all four roles                                   |
| `/payments` | Payments                                               | Staff shell    | cashier, manager                                 |
| `/menu`     | Menu management                                        | Staff shell    | manager                                          |
| `/reports`  | Reports                                                | Staff shell    | manager                                          |
| `/station`  | Ordering station (steps held in component state)       | Station canvas | public, no staff session                         |

Navigation inside the staff shell stays open for every role (design document).
A role that opens a screen it cannot use sees a **Locked** panel built from the
mock-up's locked-tile style (dashed moss border, lock icon, "Locked for
\<role>") instead of a broken page; the API's 403 is the backstop.

### 5.2 Folder layout (`frontend/app/`)

```
app.css                    tokens (@theme) and base styles
root.tsx                   html shell, Lato, ErrorBoundary
routes.ts                  route table
routes/
  sign-in.tsx              "/"  sign-in and startup menu
  staff-shell.tsx          pathless layout: session guard, sidebar, page container
  orders.tsx  payments.tsx  menu.tsx  reports.tsx
  station.tsx              "/station"
components/
  ui/                      Button, Input, Select, Textarea, Field, FieldError, Chip,
                           ToggleChip, ToggleGroup, RadioCard, Panel, Toast, Stepper,
                           DataTable, TableTile, ActivityLog, Icon (+ icon paths)
  staff/                   Sidebar, PageHeader, StartupTile, LockedPanel, OrderTicket,
                           ActiveOrdersTable, CheckoutPanel, Receipt, MenuEditor, SummaryStrip
  charts/                  RevenueBars, PaymentDonut, HorizontalBar
  station/                 StationCanvas, StationHeader, ProgressStepper, MenuCard,
                           CartPanel, ReviewStep, DoneStep
lib/
  api/                     client.ts (fetch, auth headers, error normalisation), types.ts,
                           auth.ts, menu.ts, orders.ts, payments.ts, reports.ts, tables.ts
  session.ts               staff and customer session storage helpers
  format.ts                money, ids, dates
  validation.ts            phone, price, cash, credentials
  domain/                  order-status.ts, order-math.ts, activity-log.ts, week-range.ts
  hooks/                   use-poll.ts, use-toast.ts
  category-fallback.ts     interim G5 lookup (delete when G5 lands)
tests/
  unit/  visual/  e2e/  fixtures/   (visual/reference holds the mock-up captures)
```

### 5.3 Data and state

- **Loaders.** Each staff route has a `clientLoader` that reads the session
  (redirect to `/` when missing) and fetches that screen's data. Mutations are
  `clientAction`s or direct `fetch` calls followed by `revalidate()`.
- **Polling.** Orders board 10 s, Payments queue 10 s, station tracker 5 s,
  paused while the tab is hidden. Manual refresh is just another navigation.
- **Local UI state** (selected table, cart lines, filters, form fields, "tried"
  flags) lives in the route component with `useReducer`; it mirrors the
  mock-up's `state` objects so the logic ports one to one.
- **Errors.** `api/client.ts` throws `ApiError {status, detail, fields}`.
  `401` on a staff call clears the session and returns to `/` with the notice
  "Your session has ended. Sign in again."; `403` renders the Locked panel;
  field errors map to the mock-up's `Error:` messages; network failures show a
  `role="alert"` banner with Retry.
- **Money.** Parse decimal strings to integers of shillings (`Math.round`),
  format with `toLocaleString('en-US')`, prefix `UGX `. No floats are summed.

### 5.4 Build and deployment changes

- `react-router.config.ts`: `ssr: false`.
- `Dockerfile`: build stage as today; final stage serves `build/client` with a
  static server (nginx or `serve -s`), SPA fallback to `index.html`.
- `.env.example` (frontend): `VITE_API_URL`, `VITE_PROTOTYPE_CONTROLS`,
  `VITE_DEMO_PREFILL` (dev only).
- Backend `CORS_ALLOWED_ORIGINS` needs the deployed frontend origin added.
- CI (`.github/workflows/ci.yml`): add a `frontend` job: `npm ci`,
  `npm run typecheck`, `npm run test`, `npm run build`; Playwright runs in a
  second job against the built app with route-mocked fixtures.

## 6. Screen specifications

Each spec names the mock-up artboard it is built from, the components, the
data, every interaction and the exact copy. Strings are verbatim from the
mock-ups.

### 6.1 Sign-in and Startup menu (`/`)

**Mock-up:** Staff app → "Sign in and startup menu" (1360 × 780).
**Layout:** sign-in shell from `design-system.md`.

**Sign-in state**

| Element      | Detail                                                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title / lede | "Sign in" / "Choose your role. The startup menu then shows the screens that role can use."                                                                                                               |
| Role picker  | Legend "Sign in as"; 4 radio cards in 2 columns: Cashier (Takes payments), Wait Staff (Serves assigned orders), Kitchen Staff (Updates order status), Manager (Menu and reports). Cashier selected first |
| Fields       | Username, Password (labels above, 48px inputs) side by side, wrapping under 440px                                                                                                                        |
| Error        | `Error: enter your username and a password of at least 4 characters.` with icon, `role="alert"`, shown on submit only                                                                                    |
| Submit       | "Sign in", primary, `min-width:160`                                                                                                                                                                      |

Behaviour:

1. Picking a role card sets the username to that role's demo account
   (dev prefill) and clears the error. It does not decide the role.
2. Submit validates `username.trim() !== ''` and `password.length >= 4`
   client-side with the exact message above; otherwise `POST /api/auth/login/`.
3. Server `401` shows `Error: Invalid username or password.` in the same
   error style; network errors use the generic banner.
4. On success store the session (D4) and switch to the Startup menu state.

**Startup menu state**

| Element          | Detail                                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title / subtitle | "Startup menu" / "Signed in as {name}, {role label}" (name is `username` until G9)                                                                                                                                                                                                       |
| Sign out         | tonal button with exit icon; clears the session                                                                                                                                                                                                                                          |
| Tiles            | Orders ("Create orders and follow them from pending to served."), Payments ("Check out served orders with cash or mobile money."), Menu management ("Add, update, archive and search food and drink items."), Reports ("Daily sales, top items, waiter performance and table turnover.") |
| Access           | cashier: Orders, Payments · wait staff: Orders · kitchen: Orders · manager: all four. Locked tiles: dashed, "Locked for {role label}"                                                                                                                                                    |

Role labels: Cashier, Wait Staff, Kitchen Staff, Manager. Tiles link to the
route; sign-in when already signed in goes straight to the startup menu.

**Acceptance:** matches the artboard in both states for each of the four roles;
Enter submits; error text and focus order match; the radio group is
keyboard-operable with arrow keys.

### 6.2 Orders (`/orders`)

**Mock-up:** Staff app → "Orders" (1360 × 1560). **Data:** tables (G1), staff
menu (available items), staff queue (all statuses the role may see), customers
(G4).

Layout (top to bottom): page header (h1 "Orders", subtitle "Open an order for a
table, add items, then send it to the kitchen.", chip `{n} of 12 tables free`);
optional status toast; two columns (left: Table panel, Menu items panel; right:
New order ticket, Database activity); full-width Active orders panel.

| Block            | Behaviour                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table panel      | 6-column grid of TableTiles. Occupied = disabled and dashed. Selecting sets the ticket's Table line to "Table n"                                                                                                                                                                |
| Menu items panel | Toggle chips All, Mains, Snacks, Sides, Drinks; grid `auto-fill minmax(200px,1fr)`; each item is a tea button with name, price, an `×n` chip when in the ticket, and a plus icon; `aria-label` "Add {name}, UGX n"                                                              |
| New order ticket | Heading "New order" + next id `ORD-{n+1}`; Table, Waiter (signed-in user); Customer select (Walk-in guest first); Items list with steppers; "Special instructions" textarea (placeholder "For example: no onions, sauce on the side"); Order total; **Place order**             |
| Place order      | Disabled until a table and at least one item exist. Hint under it: "Choose a table and add at least one item." / "Choose a table." / "Add at least one item."                                                                                                                   |
| Active orders    | Heading "Active orders", caption "Kitchen staff move orders from pending to preparing to served."; filter toggle chips with counts, e.g. `Pending (2)`; table columns Order, Table, Customer (+ waiter caption), Items (`2× Rolex, 2× Passion Juice`), Total, Status, Next step |
| Empty states     | Items: "No items yet. Pick dishes and drinks from the menu."                                                                                                                                                                                                                    |

**Place order sequence**

1. G3 workaround: `POST /api/customers/ {table_id}` → token; then
   `POST /api/my/orders/ {items:[{menu_item_id, quantity, special_instructions}]}`
   using that token. The single notes field is applied to every line (the API
   stores instructions per line).
2. On `201`: clear the ticket (table, lines, notes, customer), toast
   `Order ORD-1048 placed for Table 6. The kitchen can see it as pending.`,
   revalidate tables and queue.
3. Failures: unavailable item → panel error from the API message; table taken
   (`400`) → toast-style `role="alert"`, tables revalidated.

**Database activity** (newest first, max 6, `HH:MM`):

| Trigger of the log line | Text                                                             | Source                                                                 |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Order placed            | `ORDER_ITEMS: 3 rows inserted, item_subtotal = quantity × price` | count and subtotals from the response                                  |
| Order placed            | `TABLES: Table 6 free_status set to FALSE`                       | table from the response; confirmed by the table refetch                |
| Order placed            | `ORDERS: ORD-1048 inserted with status pending`                  | response                                                               |
| Order placed (additive) | `ORDERS: ORD-1048 assigned to {waiter}`                          | `staff_id`/`waiter` in the response, from `assign_waiter_on_new_order` |
| Status change           | `ORDERS: ORD-1044 order_status set to preparing`                 | response                                                               |

**As built (Phase 2)**

- Wait staff and managers get the full screen; kitchen staff and cashiers get
  the Active orders board only (they do not create orders).
- The ticket's id reads **Draft**: the database assigns the id, so predicting
  `ORD-1047` could be wrong when other waiters are working.
- The Customer select holds "Walk-in guest" only until `customers.name` exists
  (gap G4). The notes field is sent on every line, because the API stores
  instructions per line.
- Tables come from `GET /api/tables/` when it exists (gap G1) and otherwise
  from `VITE_TABLE_IDS`, occupied when a visible order holds them, with the
  Free/Occupied sub-label instead of seats (gap G2). Wait staff only see their
  own orders, so the derived list under-reports occupancy.
- Placing an order tries `POST /api/staff/orders/` first (gap G3) and falls
  back to the customer-session route on 404 or 405, remembering the answer for
  the page's life. The backend assigns the waiter in both cases.
- Served orders from earlier days are treated as finished while the API sends
  no `paid` flag (gap G10); once it does, `paid === true` decides.
- The Database activity panel starts empty and fills from real responses; it
  does not show the "assigned to <waiter>" line because the order response
  carries no waiter.
- The picker orders items by category, then menu id. The mock-up lists Steamed
  Rice before Chapati here (and the other way round on the Menu screen).
- Polling is every 10 s and paused while the tab is hidden.

**Acceptance:** with the mock-up's 7 sample orders mocked, the three artboard
states (empty ticket, ticket with items, board filters) match; occupied tables
2, 3, 4, 5, 7, 9, 11 are disabled; stepping below 1 removes the line; filter
counts add up.

### 6.3 Payments (`/payments`)

**Mock-up:** Staff app → "Payments" (1360 × 1000). **Data:** staff queue (cashier
view), pay endpoint.

Layout: header (h1 "Payments", subtitle "Check out served orders with cash or
mobile money.", chips `{n} awaiting payment` and `Received today UGX …`, see
G12); left column: Served orders list + Database activity; right: Checkout,
Receipt or the all-paid panel.

| State         | Content                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Queue         | Buttons `ORD-1039 · Table 5`, customer caption, total; selected = moss/white (`aria-pressed`). Empty: "Nothing to collect. Orders appear here when the assigned waiter marks them served."                                                                                                                                                             |
| Checkout      | Title `ORD-1045 · Table 7`, meta `Ssemakula David · served by Okello P.`, chip "Served"; items table (Item, Qty, Price, Subtotal); "Total due" (32/700); payment method radio cards **Cash** ("Count the notes and give change") and **Mobile money** ("MTN or Airtel"); footer "Recorded by **{name}**, Cashier" and **Record payment · UGX {total}** |
| Cash fields   | "Amount received (UGX)" (digits only, placeholder "For example: 100000"); quick chips **Exact amount**, **UGX 50,000**, **UGX 100,000**; "Change due" box                                                                                                                                                                                              |
| Cash error    | `Error: UGX 21,000 short of the total. Ask for the full amount.` (also sets `aria-invalid`); payment is not sent                                                                                                                                                                                                                                       |
| Mobile fields | Network select (MTN Mobile Money, Airtel Money), "Customer phone number" (placeholder "07XX XXX XXX"); error `Error: enter a 10-digit number that starts with 07.`; note "The customer approves the request on their phone. Record the payment once the confirmation message arrives."                                                                 |
| Receipt       | "Payment recorded", `PAY-0388 for ORD-1045`, definition list (Table "Table 7 is free again", Method, Amount, Change given, Recorded by), **Next order** or **Back to orders**, **See sales report**                                                                                                                                                    |
| All paid      | "All served orders are paid" / "New orders show up here once the assigned waiter marks them served." / **Go to orders**                                                                                                                                                                                                                                |

Rules: phone is valid when, after removing spaces, it matches `^07\d{8}$`.
Cash is valid when `received >= total`. Errors appear only after a failed
attempt (`tried`) and clear on edit. Selecting another order resets the form.

**Record payment sequence:** validate → `POST …/pay/ {payment_method:
"Cash"|"Mobile Money"}` (the amount is never sent; the server computes it) →
on `201` show the receipt with `payment_id`, `amount`, method label (the
network name for mobile money, G11), change = received − amount (client-side),
revalidate queue and tables. `409`: show the server message and refresh the
queue.

**Database activity** (real responses): `SALES_RECORD: UGX 60,000 added to
today's sales`, `TABLES: Table 7 free_status set to TRUE` (written only after the
refetch confirms the table is free; otherwise `TABLES: Table 7 still has an
unpaid order`), `PAYMENTS: PAY-0388 inserted for ORD-1045 (Cash, UGX 60,000)`.
The mock-up's `ORDERS: … order_status set to paid` line is **not** produced: the
backend has no paid status, so the line would be untrue.

**As built (Phase 3)**

- Only cashiers can record payments: the API's pay endpoint is cashier-only
  (403 for managers), although the design lets a manager open the screen. A
  manager sees the queue and checkout with the button disabled and the caption
  "Only cashiers can record payments." Decide whether managers should be able
  to pay (a backend change) or the screen should be read-only for them.
- A cashier's queue is what the server returns (served and unpaid), oldest
  first. A manager's is every served order from today, because no `paid` flag
  exists yet (gap G10).
- The header chip reads **Received this session**: a cashier cannot read
  today's total (gap G12), so it sums payments recorded on this device since
  sign-in and is cleared on sign-out.
- Only the method (`Cash` or `Mobile Money`) is sent. The network and phone
  number are collected and validated for the cashier but not stored (gap G11);
  the receipt prints the network from this device.
- The Database activity panel starts empty. Its lines come from the response:
  `SALES_RECORD` (from the sales record), `TABLES` (confirmed from
  `GET /api/tables/` when it exists, otherwise worded as conditional) and
  `PAYMENTS`. The mock-up's `ORDERS ... set to paid` line is not written
  because the backend has no paid status.
- The receipt's heading sits inside a `role="status"` region (the mock-up put
  the role on the heading itself, which removed its heading semantics).

**Acceptance:** four queued orders from the mock-up render with correct totals
(ORD-1039 UGX 72,000; 1041 UGX 44,000; 1042 UGX 46,000; 1045 UGX 60,000); shortfall error text matches; mobile validation matches;
receipt replaces checkout and Next order selects the next queued order.

### 6.4 Menu management (`/menu`)

**Mock-up:** Staff app → "Menu management" (1360 × 1500). **Data:** staff menu
with unavailable items; G5–G7 fields when present.

Layout: header (h1 "Menu management", subtitle "Add, update, archive and search
the food and drink items staff can order.", primary **Add item** with plus
icon); toast; two columns: list panel (flex 999, min 620) and editor aside.

| Block          | Detail                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search         | Visually hidden label "Search menu items", placeholder "Search by name", left magnifier icon                                                                                                                                                            |
| Show archived  | Checkbox `Show archived (n)` (20px, moss accent)                                                                                                                                                                                                        |
| Category chips | All, Mains, Snacks, Sides, Drinks, Desserts                                                                                                                                                                                                             |
| Table          | ID (`MI-001`), Item, Category, Price (UGX), Status chip (Available / Unavailable / Archived), Actions: **Edit** and **Archive** (or **Restore**) with `aria-label` "Edit {name}" etc. The row being edited has a tea fill                               |
| Footer text    | "Showing {n} of {total} items. Archived items stay on past orders and reports but cannot be ordered."                                                                                                                                                   |
| Empty          | "No items match. Clear the search or pick another category."                                                                                                                                                                                            |
| Editor (empty) | "Item details" / "Choose Edit on a row to change an item, or use Add item to create a new one."                                                                                                                                                         |
| Editor form    | Title "Add item" or "Edit MI-005"; fields Item name, Category (select), Price (UGX) with helper "The database also checks this, so a zero or negative price is rejected there too."; checkbox "Available for ordering today"; **Save item**, **Cancel** |

Validation (on submit, inline, `Error:` prefix): empty name → `Error: enter a name
for the item.`; price must match `^[0-9]+$` and be `> 0` → `Error: price must be a
whole number greater than 0.` Price input strips non-digits.

Toasts: `{name} added as MI-019.`, `{name} updated.`, `{name} archived. Past
orders still show it.`, `{name} restored to the menu.`

Interim (G6): without an `archived` flag, **Archive** calls `DELETE` and the
status reads Archived; **Restore** is shown but needs G6 to clear the flag and
is disabled with a caption until then. Description and image URL are not in the
mock-up editor; adding them is a proposed deviation (OQ2).

**As built (Phase 4)**

- Features switch on from the rows themselves: the screen reads whether the API
  rows carry `category` and `archived` and behaves accordingly, so nothing
  changes in the frontend when backend issue #13 lands.
- Until `archived` exists there is one flag, so a hidden item is shown as
  **Archived** (Unavailable cannot be told apart), is hidden until "Show
  archived" is ticked, and Restore sets `availability_status` back to true.
  Unticking "Available for ordering today" in the editor therefore archives the
  item for now.
- Until `category` exists the Category column comes from the name lookup, the
  select is still sent but ignored by the API, and the form says "Categories
  are not stored yet, so this choice is not saved."
- Items are listed in menu id order (the API sorts by name). Search matches
  the name only. Description and image URL are not on the form (OQ2).
- Only managers load the screen; other roles get the locked panel without a
  request.
- The count in "Show archived (n)" reads "(n)"; the mock-up prints "( n )"
  because its inline-flex label puts a gap around the number.

**Acceptance:** 18 sample rows render with MI-005 Unavailable and MI-017
Archived (hidden until "Show archived"); search, category and archived filters
combine; both validation errors render under the right field with a red 2px
underline.

### 6.5 Reports (`/reports`)

**Mock-up:** Staff app → "Reports" (1360 × 2060). **Data:** the five report
endpoints for the selected range.

Range logic (`lib/domain/week-range.ts`): weeks run Monday to Sunday and are
computed in Africa/Kampala. **This week** = Monday to Sunday of the current
week (days after today appear as zero). **Last 4 weeks** = the 28 days ending
that Sunday. Mock-up labels: `5 to 11 October 2026`, `14 September to 11 October
2026`.

| Block              | Detail                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header             | h1 "Reports", subtitle `{range label}` (the mock-up appends " · sample figures"; drop it for live data), toggle group "Date range": **This week**, **Last 4 weeks** |
| Summary strip      | Revenue (`UGX 10,820,000`), Orders, Average order, Busiest day / Busiest week                                                                                       |
| Revenue chart      | "Daily revenue" / "Weekly revenue", caption "UGX, from the PAYMENTS table. The tallest bar is darker." Weekly view groups the daily rows client-side                |
| Payment methods    | Donut + legend (see G11 for slices)                                                                                                                                 |
| Top-selling items  | Heading "Top-selling menu items", caption "Six best sellers by quantity, from ORDER_ITEMS."; call `top-items?limit=6`                                               |
| Waiter performance | Waiter, Orders, Revenue, Average (G9 for names)                                                                                                                     |
| Daily/Weekly sales | Period, Orders, Revenue, Average order, plus Total row                                                                                                              |
| Table turnover     | Table, Seats (G2), Turns per day, Average stay (G13)                                                                                                                |

All five requests run in parallel in the `clientLoader`; the range toggle is a
search param (`?range=week|month`) so the view is linkable and the back button
works.

**As built (Phase 5)**

- The range is read from `?range=week|month` (anything else is this week) and
  computed from today's date in Africa/Kampala: Monday to Sunday of the
  current week, or the 28 days ending that Sunday. Days after today come back
  as zero rows, so the chart always shows seven bars.
- All five reports are requested together for the same dates. "Last 4 weeks"
  sums the daily rows into Monday-to-Sunday weeks in the browser; the busiest
  period, average and totals are derived from those same rows.
- The chart axis is chosen from the data (steps of 1, 2, 3 or 5 times a power
  of ten, at most five intervals), which gives the artboard's 2.5M and 12M
  scales. Bar values print as `1.24M` from 100k up, `45k` below.
- Payment methods show what the API returns: Cash and Mobile Money today (two
  slices, forest and sage). A split by network (gap G11, #16) appears by
  itself when the rows are named per network.
- The Seats (G2) and Average stay (G13) columns of Table turnover are left out
  until the rows carry them. Waiters show `username` until display names exist
  (G9).
- The subtitle is the date range alone; the mock-up appends "sample figures".
- Report panels are sized like the mock-up's: `flex-basis` excludes padding and
  border (`box-content`), so the 2:1 and 3:2 columns split the width the same
  way.

**Acceptance:** with fixtures equal to the mock-up data, summary figures are
`UGX 10,820,000 / 345 / UGX 31,362 / Sat 10 Oct` for the week and `UGX
40,540,000 / 1,321` for four weeks; chart bars, donut and tables match the
artboard; every chart has its values printed and a table.

### 6.6 Ordering station (`/station`)

**Mock-up:** Ordering station (1280 × 800), four states. **Data:** tables
(G1), public menu (G5–G8), customers, my orders.

The route renders `StationCanvas` (fixed 1280 × 800, scaled per D11) and
holds `{screen, table, guestName, cat, lines, notes, pay, network, phone,
tried, step, toast}` in a reducer, persisted to `sessionStorage` so a refresh
does not lose the cart.

| Step         | Key behaviour and copy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 Table**  | Hero "Order from your table"; lede "Pick your table, choose your food and send it to the kitchen. A waiter brings it to you."; optional name ("Your name (optional)", placeholder "So the waiter knows who to look for"); **Start order** disabled until a table is picked; hint "Choose a table to continue." → "Table 6 selected."; grid note "Tables marked In use already have an order open." On Start: `POST /api/customers/`                                                                                                 |
| **2 Menu**   | Category rail (Mains, Snacks, Sides, Drinks, Desserts), item cards, cart "Your order" with `Table 6 · Name`, empty text "Nothing yet. Tap a dish or drink to add it.", **Review order** disabled when empty, **Change table** returns to step 1                                                                                                                                                                                                                                                                                     |
| **3 Review** | "Check your order"; stepper lines; "Special instructions for the kitchen"; "How will you pay?" with **At the till** ("Cash or mobile money with the cashier") and **Mobile money now** ("MTN or Airtel, from your phone"); till message "Pay the cashier with cash or mobile money when you are ready to leave. Quote your order number."; momo fields Network + Phone, error `Error: enter a 10-digit number that starts with 07.`; removing the last line returns to the menu; **Back to menu**, **Send to kitchen · UGX 52,000** |
| **4 Done**   | "Order sent to the kitchen", `ORD-1047 · Table 6`; tracker Pending ("The kitchen has your order"), Preparing ("Your food is being cooked"), Served ("A waiter has brought it to your table") with chips Now/Done/Next; payment note `Pay at the till when you are ready. Quote ORD-1047 to the cashier.` or `A payment request for UGX 52,000 was sent to 0772 123 456 on MTN Mobile Money. Approve it on your phone.` (G15); **Start a new order**; prototype advance button only when D13 is on                                   |
| **Header**   | Wordmark, 4-step progress stepper with `Step n of 4, Name, current                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | completed | upcoming`, **Call a waiter** → toast `A waiter is on the way to Table 6.` for 4 s (G14) |

Order id comes from the API response (`ORD-{order_id}`), not the mock-up's
fixed `ORD-1047`. The tracker polls the order and maps backend statuses with
the D6 table (`pending|confirmed` → Pending, `preparing|ready` → Preparing,
`served` → Served). If the order is cancelled, show the tea note "This order was
cancelled. Please speak to a waiter." (new string, OQ7).

Error handling: expired customer session (`401`, "Invalid or expired
session…") returns to step 1 with the message; unavailable items on send show
an error panel above the bottom bar and return the cart to the menu.

**As built (Phase 6)**

- `/station` is public and sits outside the staff shell. The 1280 x 800 canvas
  is scaled uniformly to fit the window (plan D11), so a kiosk of any size
  shows the same layout.
- Opening an order calls `POST /api/customers/` once per table and keeps the
  session for "Change table" and back; a different table gets its own. The
  session token and the draft (screen, table, cart, notes, choices) live in
  `sessionStorage`, so a refresh keeps them.
- The order id and the tracker come from the API: the order is read again every
  5 s (paused while the tab is hidden) and after a refresh. A cancelled order
  replaces the tracker with "This order was cancelled. Please speak to a
  waiter." The prototype button only exists when `VITE_PROTOTYPE_CONTROLS=true`.
- "Mobile money now" does not collect payment: the choice and phone are
  validated and echoed on the Done step but only the cart is sent (gap G15,
  open question OQ3). "Call a waiter" shows its toast only (gap G14).
- Without `GET /api/tables/` every configured table is offered as free (a
  customer cannot see which are in use) and tiles say Free instead of seats.
  Without the public menu returning unavailable items, no "Sold out" card can
  appear (gap G8).
- An unreachable or ended session returns to the table step with a message;
  items that became unavailable show the server's message above the buttons.
- After five minutes without a touch on the Table or Done step the station
  forgets the last customer (OQ5 default).

**Acceptance:** each of the four states matches the artboard pixel-for-pixel;
Grilled Goat Ribs renders sold out once G6/G8 land; touch targets are at
least 56px (category 64, tables 96); the stepper announces correctly.

## 7. Shared domain logic

Pure functions in `lib/`, each ported from the mock-up logic and unit-tested:

| Function                           | Rule (from the mock-up)                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `formatUgx(n)`                     | `'UGX ' + n.toLocaleString('en-US')`                            |
| `orderTotal(lines)`                | sum of `qty × price` over lines (server total used once placed) |
| `isValidPhone(s)`                  | `/^07\d{8}$/.test(s.replace(/\s+/g, ''))`                       |
| `isValidPrice(s)`                  | `/^[0-9]+$/.test(s.trim()) && parseInt(s, 10) > 0`              |
| `cashShortfall(received, total)`   | `total - received` when `received < total`                      |
| `changeDue(received, total)`       | `max(received - total, 0)`                                      |
| `canSignIn(u, p)`                  | `u.trim() !== '' && p.length >= 4`                              |
| `quickAmounts(total)`              | Exact amount, 50,000, 100,000                                   |
| `statusChip(status)`               | D6 table                                                        |
| `nextAction(role, order)`          | D6 button matrix                                                |
| `weekRange(today)`                 | Monday to Sunday, Africa/Kampala                                |
| `groupByWeek(daily)`               | sum orders and revenue per week for the 4-week view             |
| `slicePercent(rows)`               | rounding so slices sum to 100                                   |
| `activityEntries(event, response)` | builds the Database activity lines                              |

## 8. Fidelity strategy

1. **Reference captures.** A script renders each mock-up page with Playwright
   at its artboard size (staff 1360 wide at 780, 1560, 1000, 1500, 2060;
   station 1280 × 800 in each of the four states) and writes PNGs to
   `frontend/tests/visual/reference/`. They are committed so reviewers can see
   what "correct" is.
2. **Same data.** `tests/fixtures/` holds the mock-up's sample data in API
   shape. Playwright's `page.route` serves it, so the real app renders the
   same orders, tables, menu and reports as the artboards.
3. **Pixel diff.** `toHaveScreenshot` per artboard and per interactive state
   (selected table, ticket with items, cash shortfall, receipt, editor open,
   range toggle, each station step), threshold in section 1.
4. **Token tests.** Assertions on `getComputedStyle` for the token table in
   `design-system.md` (colours, radii, min-heights, font sizes, letter
   spacing).
5. **Copy test.** A fixture of every string in this plan's screen tables is
   asserted with `getByText`/`getByRole` so wording drift fails CI.
6. **Review gate.** Each phase ends with a side-by-side review at 100% zoom of
   the built page next to the mock-up, signed off by the frontend lead.

## 9. Testing strategy

| Layer         | Tool                                              | Covers                                                                              |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Unit          | Vitest                                            | Section 7 functions, API client error mapping, session helpers                      |
| Component     | Vitest + Testing Library                          | Button/Input/ToggleChip/RadioCard/Stepper states, ARIA, DataTable roles             |
| Integration   | Playwright with route-mocked API                  | Each screen's flows and error states, role gating                                   |
| Visual        | Playwright screenshots                            | Section 8                                                                           |
| End-to-end    | Playwright against Django + a seeded dev database | Sign in as each role, place order → serve → pay → report shows revenue              |
| Accessibility | `@axe-core/playwright` + manual keyboard pass     | No serious violations; full keyboard operation; focus ring visible on every control |

The end-to-end suite uses the dedicated development database described in the
root `README.md` (never the shared Neon branch) and the documented demo
password.

## 10. Delivery phases

Sizes: S ≈ half a day, M ≈ 1–2 days, L ≈ 3–5 days, for one developer. Phases 1
to 6 each end with the review gate from section 8.

### Phase 0: Alignment and foundations

| #   | Task                                                                                            | Size | Done when                                                    |
| --- | ----------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| 0.1 | Agree D1–D13 and gaps G1–G9 with the backend lead; raise backend tickets for G1–G3, G5–G9       | S    | Written decisions in this file, tickets linked               |
| 0.2 | Remove the template (`home.tsx`, `welcome/`, Inter, README); set `ssr:false`; update Dockerfile | S    | `npm run build` produces `build/client`; container serves it |
| 0.3 | Design tokens, Lato, base styles in `app.css`                                                   | S    | Token test passes                                            |
| 0.4 | Tooling: Vitest, Testing Library, Playwright, axe, ESLint/Prettier; CI frontend job             | M    | CI green on an empty suite                                   |
| 0.5 | API client, types, session storage, error model, `.env.example`                                 | M    | Unit tests for 401/403/field errors                          |
| 0.6 | Reference capture script and fixtures                                                           | M    | PNG references and fixtures committed                        |

### Phase 1: Primitives, shell and sign-in

| #   | Task                                                                                                                   | Size | Done when                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| 1.1 | Icon set from the exact path data                                                                                      | S    | Snapshot of all icons                                        |
| 1.2 | `ui/` primitives with all states (Button, Input family, Chip, ToggleChip, RadioCard, Panel, Toast, Stepper, DataTable) | L    | Component tests per state; visual test of a primitives sheet |
| 1.3 | Staff shell: sidebar, sticky behaviour, 880px collapse, page container, session guard, Locked panel                    | M    | Matches shell on all four screens' frames                    |
| 1.4 | Sign-in and Startup menu with real login                                                                               | M    | Section 6.1 acceptance                                       |

### Phase 2: Orders

| #   | Task                                                        | Size | Done when                             |
| --- | ----------------------------------------------------------- | ---- | ------------------------------------- |
| 2.1 | Tables and menu loaders (needs G1; interim config ids)      | S    | Table grid reflects `free_status`     |
| 2.2 | Table panel, menu picker, ticket, steppers, validation      | L    | Section 6.2 ticket states match       |
| 2.3 | Place order (G3 workaround), toast, revalidate              | M    | Order appears on the board as Pending |
| 2.4 | Active orders board, filters, role-aware next step, polling | M    | D6 matrix verified for four roles     |
| 2.5 | Database activity log from responses                        | S    | Lines match the table in 6.2          |

### Phase 3: Payments

| #   | Task                                                | Size | Done when                 |
| --- | --------------------------------------------------- | ---- | ------------------------- |
| 3.1 | Queue and checkout panel                            | M    | Totals match fixtures     |
| 3.2 | Cash and mobile-money forms with validation         | M    | Error copy matches        |
| 3.3 | Record payment, receipt, Next order, all-paid state | M    | Section 6.3 acceptance    |
| 3.4 | Activity log and "Received" chip (G12 interim)      | S    | Lines from real responses |

### Phase 4: Menu management

| #   | Task                                                      | Size | Done when                 |
| --- | --------------------------------------------------------- | ---- | ------------------------- |
| 4.1 | List, search, category chips, archived toggle, ARIA table | M    | Filters combine           |
| 4.2 | Editor form with validation, create, edit                 | M    | Both errors render inline |
| 4.3 | Archive and restore (G6 interim)                          | S    | Toasts match              |

### Phase 5: Reports

| #   | Task                                               | Size | Done when                     |
| --- | -------------------------------------------------- | ---- | ----------------------------- |
| 5.1 | Range logic, parallel loaders, aggregation helpers | M    | Unit tests on week boundaries |
| 5.2 | Summary strip and the five tables                  | M    | Matches fixtures              |
| 5.3 | Revenue bars and donut, hand-built                 | L    | Visual diff within tolerance  |

### Phase 6: Ordering station

| #   | Task                                                                | Size | Done when                                           |
| --- | ------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| 6.1 | Canvas, scaling, header and progress stepper                        | M    | Stepper announcements verified                      |
| 6.2 | Table and Menu steps with cart, MenuCard states and placeholder art | L    | Steps 1 and 2 match                                 |
| 6.3 | Review step and validation                                          | M    | Step 3 matches                                      |
| 6.4 | Send, Done step, tracker polling, reset, error recovery             | M    | Step 4 matches; full order lands in the staff board |

### Phase 7: Hardening and handover

| #   | Task                                                                              | Size | Done when                                    |
| --- | --------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| 7.1 | Keyboard and screen-reader pass, axe, contrast check                              | M    | No serious findings                          |
| 7.2 | Responsive check at 880 / 1024 / 1360; station scaling at 1024 × 768, 1920 × 1080 | M    | No horizontal page scroll                    |
| 7.3 | End-to-end suite on seeded dev DB                                                 | M    | Order-to-report flow green                   |
| 7.4 | Remove interim shims for any gap that landed; update docs                         | S    | `category-fallback.ts` deleted when G5 is in |
| 7.5 | README and run instructions; demo script                                          | S    | New teammate runs the app from docs          |

**Parallel track for the backend** (can start immediately, owners to confirm):
G1 and G2 (tables endpoint, seats), G5 to G8 (menu category, archived, image,
public menu), G3 (staff order creation), G9 (display names), G10 (`paid`
flag), G12/G13 (cashier total, average stay). Phase 2 needs G1; Phase 4 needs G5
and G6 to be complete; Phase 6 needs G1, G5 to G8.

## 11. Risks and open questions

| Risk                                                  | Impact                                                            | Mitigation                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Backend gaps land late                                | Screens ship with interim renderings that differ from the mock-up | Interim column in 4.2 keeps work unblocked; each shim is isolated and listed  |
| Pixel parity drifts as components are reused          | Subtle visual regressions                                         | Visual tests in CI from Phase 1; tokens only, no arbitrary values             |
| Polling load against Neon                             | Egress and connection use                                         | 10 s/5 s intervals, paused when hidden, queue limited to 200 rows server-side |
| Customer tokens in `sessionStorage` on a shared kiosk | Next customer sees a prior session                                | "Start a new order" clears it; add idle reset (OQ5)                           |
| Demo database ids (1001…) differ from mock-up labels  | Reviewers think the UI is wrong                                   | Seed 12 tables and 18 items with low ids for demos (OQ6)                      |

| #   | Open question                                                                                     | Default if unanswered                                         |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| OQ1 | Is the extra `Ready` word acceptable on the Active orders board?                                  | Yes, using the Preparing colours                              |
| OQ2 | Add Description and Image URL fields to the Menu editor (the station needs them)?                 | Not added until design approves                               |
| OQ3 | Should "Mobile money now" collect payment or only notify the cashier? (design document)           | UI-only, as in the mock-up                                    |
| OQ4 | Should station orders appear on the staff board, and how does Kitchen see them? (design document) | They do, through the shared API, with no extra UI             |
| OQ5 | Station scaling on larger kiosks and an idle reset timeout                                        | Scale to fit, 5-minute idle reset on the Done and Table steps |
| OQ6 | Seed 12 tables (ids 1–12) and 18 menu items for demos?                                            | Use whatever ids the database has                             |
| OQ7 | New strings: session ended, order cancelled, locked panel body                                    | Use the wording in this plan                                  |
| OQ8 | Dedicated Kitchen view and portrait/phone station layout (design document)                        | Out of scope for this plan                                    |

## 12. Definition of done

- All six screens built from `design-system.md` tokens, with every state in
  section 6 implemented.
- Visual tests at or under the 0.5% threshold for every artboard and state;
  token and copy tests green.
- Order-to-report works end to end for the four staff roles and the customer
  station against a seeded development database.
- No serious axe findings; keyboard and screen-reader pass documented.
- Each gap in 4.2 is either closed (shim deleted) or recorded as an accepted
  deviation in `design-system.md`.
- `README.md` in `frontend/` explains setup, env vars, tests and how to
  regenerate the reference captures.
- CI runs typecheck, unit, build and visual jobs on every pull request.
