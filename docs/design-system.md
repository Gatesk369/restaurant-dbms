# Restaurant DBMS Design System (frontend reference)

This is the build reference for the React frontend. Every value below was read
from the markup of the two mock-ups in [`docs/design/`](design/), not from the
prose design document, so it is what the screens actually render.

- Sources: [`staff-app-mockups.html`](design/staff-app-mockups.html),
  [`ordering-station-mockup.html`](design/ordering-station-mockup.html),
  [`ui-ux-design-document.md`](design/ui-ux-design-document.md).
- To read the raw markup, run `python3 docs/design/unpack-mockup.py <file> <out-dir>`
  (the mock-ups are bundles; the script decodes them, including the five nested
  staff screens).
- Where the prose document and the markup disagree, **the markup wins** (see
  [Discrepancies](#discrepancies-between-the-design-document-and-the-markup)).

Contents: [Tokens](#tokens) · [Layout](#layout-and-surfaces) ·
[Components](#components) · [Charts](#charts) ·
[Station components](#ordering-station-components) ·
[Accessibility](#accessibility-contract) · [Tailwind mapping](#tailwind-v4-mapping) ·
[Discrepancies](#discrepancies-between-the-design-document-and-the-markup)

---

## Tokens

### Colour

| Token    | Hex       | Role                                                                                                        |
| -------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| `page`   | `#f3ede3` | Page background; also the "hole" colour inside the donut and the fill of disabled/occupied tiles            |
| `forest` | `#18442a` | Text, sidebar, station header, toast, "Served" chip, largest chart bar                                      |
| `moss`   | `#45644a` | Primary buttons, selected/pressed states, focus ring, secondary text, bottom line of inputs, dashed borders |
| `tea`    | `#e4dbc4` | Panel borders, secondary (tonal) buttons, table header rows, unselected cards and chips, "Pending" chip     |
| `field`  | `#f0e9dd` | Input fill, image placeholder fill                                                                          |
| `error`  | `#ba1a1a` | Validation errors only. Always paired with an icon and the word "Error:"                                    |
| `white`  | `#ffffff` | Text on moss, forest and error fills only                                                                   |

Derived values that appear in the markup (add them as tokens, do not inline them):

| Token           | Value                    | Where                                             |
| --------------- | ------------------------ | ------------------------------------------------- |
| `row-hover`     | `#e4dbc44d` (tea at 30%) | Hover on order and menu rows                      |
| `sage`          | `#8aa58f`                | Donut slice for MTN Mobile Money                  |
| `on-forest-dim` | `#c9d3c5`                | Upcoming step label in the station header         |
| `step-outline`  | `#a9b8a6`                | Upcoming step circle border in the station header |
| `toast-shadow`  | `0 4px 8px #18442a33`    | Station toast only. No other element has a shadow |

Rules: body text is `forest` on `page`; secondary text is `moss`; `white` is
never used on `page`, `tea` or `field`. Colour never carries meaning alone: every
state also has a word, an icon or a shape.

### Typography

Family: **Lato** 400 and 700 (Latin). Fallback stack from the markup:
`Lato, system-ui, -apple-system, "Segoe UI", sans-serif`. Buttons, inputs, selects
and textareas inherit the family (`font-family: inherit`).

| Role            | Size / line height | Weight | Letter spacing | Used for                                                                                                  |
| --------------- | ------------------ | ------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| Hero            | 36 / 44            | 400    | 0              | Sign-in brand title, station "Order from your table" and "Order sent to the kitchen"                      |
| Page title      | 32 / 40            | 400    | 0              | Staff page `h1`, "Sign in", "Startup menu", "Check your order", Total due, Revenue figure (700 on totals) |
| Panel title     | 24 / 32            | 400    | 0              | "New order", "Active orders", checkout title, "Your order", "Item details"                                |
| Wordmark        | 22 / 28            | 400    | 0              | "Restaurant DBMS" in sidebar and station header                                                           |
| Figure          | 20 / 28            | 700    | 0              | Change due                                                                                                |
| Section heading | 16 / 24            | 700    | .15px          | Panel `h2` ("Table", "Menu items", "Order quantities")                                                    |
| Body large      | 16 / 24            | 400    | .5px           | Sign-in and station lede paragraphs                                                                       |
| Input text      | 16 / normal        | 400    | .25px          | Inputs, selects, textareas (the markup sets no line height, so a two-row textarea is about 62px tall)     |
| Body            | 14 / 20            | 400    | .25px          | Paragraphs, cells, descriptions                                                                           |
| Body bold       | 14 / 20            | 700    | .1px           | Buttons, tabs, item names, headers                                                                        |
| Label           | 12 / 16            | 700    | .5px           | Field labels, fieldset legends, chips, toggle chips                                                       |
| Caption         | 12 / 16            | 400    | .4px           | Helper text, secondary lines                                                                              |
| Micro           | 11 / 16            | 400    | .3px           | Table tile sub-label ("4 seats")                                                                          |

Buttons, tabs, chips and toggle chips set no line height in the markup either
(`normal`); build them with `leading-[normal]` so the text centres on the same
pixel row as the mock-up.

Numbers in money, quantities and table columns use `font-variant-numeric:
tabular-nums`. Currency is `UGX 18,000` (en-US grouping, no decimals); column
cells that already sit under a "UGX" header show the bare number (`18,000`).

### Shape, borders, focus

| Token             | Value                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `radius-chip`     | 4px: chips, toggle chips                                                                                                                                    |
| `radius-md`       | 8px: buttons, inputs, cards, panels, tiles, rows                                                                                                            |
| `radius-lg`       | 16px: the sign-in shell                                                                                                                                     |
| `radius-full`     | 50%: step circles, receipt check, donut                                                                                                                     |
| Panel border      | `1px solid tea`, no fill, no shadow                                                                                                                         |
| Divider in totals | `1px solid moss` above the total row                                                                                                                        |
| Row divider       | `1px solid tea`                                                                                                                                             |
| Focus ring        | `:focus-visible { outline: 2px solid moss; outline-offset: 2px }`; `page` colour inside the sidebar and the station header; radio cards use `:focus-within` |
| Input underline   | `inset 0 -1px 0 moss`; focus `inset 0 -2px 0 moss`; invalid `inset 0 -2px 0 error`                                                                          |

### Spacing

The markup uses a 4px grid: gaps of 4, 8, 12, 16, 24, 32, 48. Page content
padding is `24 24 48`. Panels pad 16; the checkout and the item editor pad 24;
the sign-in aside and form pad `48 32`.

---

## Layout and surfaces

### Staff shell (all screens except sign-in)

```
┌────────────┬──────────────────────────────────────────────┐
│ sidebar    │ content (fills remaining viewport width)      │
│ 240px      │ padding 24 24 48, column, gap 24             │
│ forest     │                                              │
└────────────┴──────────────────────────────────────────────┘
```

- Wrapper: `display:flex; min-height:100dvh; align-items:stretch; background:page`.
- Sidebar: `flex:0 0 240px; background:forest; color:page`. Inner block is
  `position:sticky; top:env(safe-area-inset-top,0)`, column, gap 24, padding
  `24 12`. It can scroll independently on short landscape screens.
- Content column: `flex:1; min-width:0`, full available width with padding `24 24 48`.
- Below 880px the shell stacks and the sidebar becomes a full-width row; the
  inner block is `position:static` with padding 16, and nav and footer items wrap
  in a row.
- Page header: flex row, wrap, `align-items:flex-end`, `justify-content:space-between`,
  gap 16. Left: `h1` plus a `p` (14/20, moss, margin-top 4). Right: chips, a
  toggle group or a primary button.
- Two-column work areas wrap with `gap:24; align-items:flex-start`. Main column
  `flex: 999 1 560px` (Orders), `flex:999 1 620px` (Menu), `flex:2 1 520px`
  (Payments); side column `flex:1 1 380px` (Orders), `1 1 340px` (Menu),
  `1 1 320px` (Payments).

### Sign-in shell

Full-height `page`, padding `48 16`, content centred. Card: `max-width:1040`
(content-box, so 1042px with its border; build it with `box-content`),
`radius-lg`, `1px tea` border, `overflow:hidden`, flex-wrap. Left aside
(`flex:1 1 320px`) is `forest` with `page` text, padding `48 32`, brand title
(Hero) and lede on top and the course line (12/16) at the bottom. Right main
(`flex:1.5 1 440px`) is `page`, padding `48 32`.

### Ordering station workspace

Issue #41 supersedes the fixed 1280 × 800 artboard and D11 uniform scaling.
The workspace fills the viewport (`min-height:100dvh`) and uses normal document
scrolling. Text and controls retain their CSS sizes; no transform scales them.
The header is at least 72px high. At 1100px and below, progress wraps onto its
own row. Below 768px the progress connectors are hidden, keeping the four
numbered labels visible.

The table introduction and picker share flexible columns, stacking below 768px;
the picker changes from four columns to two. The menu uses a 200px category
rail, a fluid item grid (minimum card width 180px), and a 340px cart. At 1100px
and below, categories wrap above the menu and a 300px cart; below 768px all
three stack. A desktop cart sticks near the top while the document scrolls;
a tall cart remains reachable through normal scrolling. Review and confirmation
stack at 1100px and below. Quantity rows and primary action rows wrap without
shrinking touch targets. No step has a fixed height or nested scrolling list.

Representative before/after captures and verification notes are in
[issue-41/README.md](issue-41/README.md).

---

## Components

Naming below is the component name to use in code; the CSS class in the
mock-up is given where it exists so the markup can be matched side by side.

### Button (`.btn`)

| Variant   | Fill / text  | Hover                     |
| --------- | ------------ | ------------------------- |
| `primary` | moss / white | forest fill               |
| `tonal`   | tea / forest | `filter: brightness(.95)` |

| Size                        | Height | Padding | Type             |
| --------------------------- | ------ | ------- | ---------------- |
| `sm` (compact toggle)       | 36     | 0 12    | 12 / 700 / .5px  |
| `md` (staff default)        | 44     | 0 16    | 14 / 700 / .1px  |
| `lg` (staff primary action) | 48     | 0 20    | 14 / 700         |
| `touch` (station default)   | 56     | 0 24    | 16 / 700 / .15px |
| `touch-sm` (station small)  | 44     | 0 16    | 14 / 700         |

Shared: `display:inline-flex; align-items:center; justify-content:center; gap:8;
border:0; border-radius:8; box-sizing:border-box`. Icons are 18–20px and sit left
of the label. Disabled: `opacity:.5; cursor:not-allowed`, no hover change.
Anchors styled as buttons (`<a class="btn …">`) are used for navigation
("Take payment", "Back to orders"). Icon-only steppers are `44×44` (staff),
`48×48` (station review) with a spoken `aria-label`.

States: default, hover, focus-visible (ring), disabled. No loading state exists
in the mock-up; the frontend adds a pending state (label unchanged, `aria-busy`,
disabled) because the real API is asynchronous.

### Input, select, textarea (`.input`)

`box-sizing:border-box; width:100%; min-height:48 (staff) | 56 (station);
padding:12 (staff) | 14 12 (station); border:0; border-radius:8;
background:field; color:forest; font-size:16; letter-spacing:.25px`, with the
underline described under [Shape](#shape-borders-focus). `textarea` is
`rows=2`, `resize:vertical` (staff) or `none` (station). A select is the same
element styled with `.input`. Search has a 20px magnifier at `left:12` and
`padding-left:44`.

Field wrapper: column, gap 4, label above (Label type). Helper text below is
Caption in moss. Errors replace nothing: they sit under the field (see
[FieldError](#fielderror)).

### FieldError

`role="alert"`, flex row, gap 8, 14/20, 700, colour `error`. A 20px circle-with-bang
icon precedes the text, and the text always starts with `Error:`. The field gets
`aria-invalid="true"` and the red 2px underline. Errors appear only after the
user has tried to submit (`tried` flag), and clear when the field changes.

### Chip (`.chip`)

`inline-flex; min-height:24; padding:0 8; radius 4; 12/700/.5px; gap 4`.

| Meaning                                                      | Fill   | Text   | Border           |
| ------------------------------------------------------------ | ------ | ------ | ---------------- |
| Neutral count ("5 of 12 tables free", "Sold out", "Pending") | tea    | forest | none             |
| Active / quantity (`×2`, "Preparing", "Available")           | moss   | white  | none             |
| Done ("Served")                                              | forest | white  | none             |
| Archived                                                     | page   | moss   | `1px solid moss` |

Every status chip prints its word. Order status mapping lives in the plan.

### ToggleChip (`.pick` on filter and category buttons)

`min-height:36; padding:0 12; border:0; radius 4; 12/700/.5px`. Unselected tea
on forest text; selected moss on white; exposes `aria-pressed`. Group wrapper
is flex-wrap with gap 8. The Reports date-range toggle is the larger variant:
`min-height:44; padding:0 16; radius 8; 14/700/.1px`, in a `role="group"`.

### RadioCard (`.rolecard`)

Visually a card, semantically a radio: a `label` containing a visually hidden
but full-size `input[type=radio]` (`position:absolute; opacity:0; inset:0;
width/height:100%`). Unselected tea / forest with moss caption; selected moss /
white with a 20px check icon at the end. `:focus-within` shows the ring.

| Use                       | Min height | Padding | Grid             |
| ------------------------- | ---------- | ------- | ---------------- |
| Role picker (sign-in)     | 60         | `8 12`  | 2 columns, gap 8 |
| Payment method (checkout) | 64         | `8 16`  | 2 columns, gap 8 |
| Payment choice (station)  | 72         | `8 16`  | 2 columns, gap 8 |

### Panel

`border:1px solid tea; border-radius:8; padding:16 (24 for checkout, editor,
receipt, all-paid); display:flex; flex-direction:column; gap:12 (16 for forms
and the new-order ticket, 24 for checkout)`. A panel header is the section
heading plus an optional Caption line in moss.

Report panels, the chart plot and the legend swatches are **content-box** in
the mock-up: `flex-basis`, `height` and `width` exclude padding and border.
Build them with `box-content`, otherwise the 2:1 and 3:2 report columns come
out 11px and 6px off and the swatches 2px small. Everything else uses
border-box.

### Toast / inline status (`role="status"`)

Staff: full-width row, padding `12 16`, radius 8, tea fill, 14/20/700, 20px check
icon, placed under the page header. Station: floating forest pill with white
text and `toast-shadow`, auto-dismisses after 4s.

### Sidebar and Tab (`.side`, `.tab`)

Brand wordmark (padding `0 12`), a `nav aria-label="Main"` with four tabs, then
a footer separated by `1px moss` containing the signed-in name (14/700), role
(12/400) and a Sign out tab.

Tab: flex, gap 12, `min-height:48`, padding `0 12`, radius 8, `page` text,
14/700/.1px, 20px icon. Hover: moss fill. Current page: tea fill, forest text,
`aria-current="page"`. Icons (24px viewBox, 2px stroke, round caps and joins,
`currentColor`):

| Item        | Icon path                                                            |
| ----------- | -------------------------------------------------------------------- |
| Orders      | `rect x6 y4 w12 h17 rx2` + `M9 4h6v3H9zM9 12h6M9 16h4`               |
| Payments    | `rect x3 y6 w18 h12 rx2` + `circle cx12 cy12 r3`                     |
| Menu        | `M6 3v7a2 2 0 0 0 2 2v9M10 3v7M6 7h4M17 3c-2 2-3 5-3 8h3v10`         |
| Reports     | `M4 20V10M10 20V4M16 20v-8M2 20h20`                                  |
| Sign out    | `M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4` + `M16 17l5-5-5-5M21 12H9` |
| Locked      | `rect x5 y11 w14 h10 rx2` + `M8 11V8a4 4 0 0 1 8 0v3`                |
| Add         | `M12 5v14M5 12h14`                                                   |
| Minus       | `M5 12h14`                                                           |
| Check       | `M5 12l5 5 9-10`                                                     |
| Error       | `circle cx12 cy12 r9` + `M12 7v6M12 16.5v.5`                         |
| Edit        | `M4 20h4L19 9l-4-4L4 16v4z`                                          |
| Archive     | `M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13`                                 |
| Restore     | `M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5`                                  |
| Search      | `circle cx11 cy11 r7` + `M20 20l-4-4`                                |
| Call waiter | `M6 17V11a6 6 0 0 1 12 0v6M4 17h16M10 20h4`                          |

### StartupTile / LockedTile

Grid `repeat(auto-fit, minmax(220px, 1fr))`, gap 16. Tile: column, gap 8,
`min-height:120; padding:16; radius 8`. Available: tea fill, forest text, link;
hover moss fill with white text and a white description. Title row is 16/700
with a 20px icon; description is 14/20 in moss. Locked: transparent,
`1px dashed moss`, moss text, lock icon, second line `Locked for <role label>`,
not focusable.

### TableTile (table pickers)

Button with two lines (label `T7` / sub `4 seats` or `Occupied` or `In use`).

| Context       | Grid              | Min height | Label type        |
| ------------- | ----------------- | ---------- | ----------------- |
| Orders screen | 6 columns, gap 8  | 64         | 16/700, sub 11/16 |
| Station       | 4 columns, gap 12 | 96         | 24/700, sub 12/16 |

States: free (tea / forest, `1px solid transparent`), selected (moss / white,
`aria-pressed=true`), busy (page / moss, `1px dashed moss`, disabled,
`cursor:not-allowed`). `aria-label`: `Table 7, 4 seats` / `Table 7, occupied`
(station says `in use`).

### Stepper (quantity)

`[−] 2 [+]`: two tonal icon buttons with the count between (16/700,
`min-width:24`). Staff 44×44 buttons; station menu cart 44×44; station review
48×48. Labels: `Remove one <item>` / `Add one <item>`. Decrementing to 0 removes
the line. Line subtotal is right aligned, 14/700, tabular.

### DataTable (ARIA grid)

Built from `div`s with `role="table"`, `row`, `columnheader`, `cell` (keep this;
it is how the mock-up is specified). Header row: tea fill, radius 8, padding
`8 12`, 14/700/.1px. Body rows: padding `8 12`, `1px tea` bottom border,
14/20/.25px, `min-height` 44–60. Wrapper `overflow-x:auto` with a `min-width`
inner table so narrow screens scroll the table, not the page.

| Table                  | Columns                                                                                                                  | Inner min-width | Row min-height      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- | ------------------- |
| Active orders          | `96px 64px 1.1fr 2fr 120px 120px 168px` (Order, Table, Customer + waiter caption, Items, Total right, Status, Next step) | 960             | 60                  |
| Order items (checkout) | `minmax(0,1fr) 56px 104px 112px` (Item, Qty, Price, Subtotal; numbers right)                                             | none            | 44                  |
| Menu items             | `76px minmax(0,1.6fr) 100px 112px 124px 200px` (ID, Item, Category, Price right, Status, Actions)                        | 860             | 60                  |
| Top items              | `168px minmax(60px,1fr) 64px 120px` (Item, bar, Sold, Revenue)                                                           | 520             | 48                  |
| Waiter performance     | `minmax(0,1.3fr) 64px 116px 116px`                                                                                       | 420             | 48                  |
| Sales by period        | `minmax(0,1.3fr) 80px 128px 128px`, plus a bold Total row with no divider                                                | 480             | 48                  |
| Table turnover         | `64px 72px minmax(0,1fr) minmax(0,1fr)`                                                                                  | 420             | 44 (padding `6 12`) |

All grids use `gap:12; align-items:center`. Row hover is `row-hover`
(orders and menu only). The row being edited in Menu uses a tea fill.

### Summary strip (Reports)

Panel with padding `16 24`, flex-wrap, gap `16 48`. Each stat: caption (12/700/.5px,
moss) over a 24/32 bold tabular figure. Order: Revenue, Orders, Average order,
Busiest day / Busiest week.

### Database activity panel (historical mock-up)

Removed from Orders, Payments, and the primitives sheet in issue #39. The
following visual specification is retained only as historical documentation;
there is no activity-log component in the current app.

Panel with section heading, Caption, then a `ul` (gap 8) of rows: time
(`HH:MM`, 12/700, moss, tabular, fixed) and text (12/16). Newest first, six rows
kept. Copy is `TABLE_NAME: …` with column names in database spelling
(`TABLES: Table 9 free_status set to FALSE`).

### Receipt

Panel (padding 24) with a 48px moss circle holding a 24px check, title "Payment
recorded" (`role="status"`) and `PAY-0388 for ORD-1045`, then a definition list
(`grid-template-columns:auto 1fr; gap:8 24`; `dt` moss, `dd` bold) with Table
("Table 7 is free again"), Method, Amount, Change given, Recorded by; actions:
Next order (primary) or Back to orders, plus See sales report (tonal).

---

## Charts

All charts are plain DOM/CSS in the mock-up (no chart library) and every chart
is labelled with its values and has a table beside or below it. Keep it that
way: it is what makes them readable without colour.

### Bar chart (revenue by day/week)

- Container `role="img"` with `aria-label="Bar chart of revenue. The figures
are in the sales table below."`, `padding-top:24`.
- Y-axis column 44px wide, plot height 220px. Tick labels right-aligned,
  12/16 moss, positioned at `bottom: <pct>%` with `translateY(50%)`. Labels
  are `0`, then `value / 1,000,000` plus `M` (`0.5M`, `1M`, `1.5M`, `3M`…).
- Plot: `border-bottom:1px solid moss`; one `1px solid tea` gridline per tick.
- Bars: flex row, gap 12, padding `0 8`; each bar `width:100%; max-width:56;
height: <value/axisMax>%; border-radius:4 4 0 0`; fill moss, the tallest bar
  forest (and the sub-title says so). Value label above each bar: 12/700 forest,
  `X.XXM`. Hover: `filter:brightness(1.25)`. `title` tooltip:
  `Mon 5 Oct: UGX 1,240,000, 40 orders`.
- X labels row: same flex gap, centred 12/16.
- Axis maxima: week `2,500,000` step `500,000`; four weeks `12,000,000` step
  `3,000,000`. In production derive these from the data (next "nice" step).

### Donut (payment methods)

- 176×176 circle painted with `conic-gradient`; 0.6% gaps in `page` colour
  between slices; hole is a `page` circle inset 36px (centre label "Total" 12/16
  moss + `UGX 10.82M` 16/700).
- Slice fills: Cash `forest`, MTN Mobile Money `sage`, Airtel Money `tea`.
  Legend swatch 14×14, radius 2, `1px solid moss` (the border keeps the pale
  tea slice visible).
- Legend rows: `Name · 41%` (14/700) over `UGX amount` (12/16 moss).
- `role="img"` with `aria-label` listing every slice and percentage.

### Horizontal bars (top items)

In the third column of the Top items table: `height:14; width:<sold/maxSold>%;
background:moss; border-radius:0 4 4 0`. The numbers sit in the next columns, so
the bar is decorative.

> The report palette fails the chroma and lightness validator because the
> brand greens are low chroma. This is a known, accepted deviation (see the
> design document). Do not introduce new hues; keep direct labels and tables.

---

## Ordering station components

### Header and progress stepper

`ol aria-label="Order progress"`, four `li` (Table, Menu, Review, Done). Each
`li` has `aria-label="Step 2 of 4, Menu, current"` (`completed` / `upcoming`) and
`aria-current="step"` on the current one; the visible circle and label are
`aria-hidden`.

| Step state | Circle fill | Circle border | Content                 | Label              |
| ---------- | ----------- | ------------- | ----------------------- | ------------------ |
| Done       | tea         | tea           | check icon (3px stroke) | page, 400          |
| Current    | tea         | tea           | number                  | page, 700          |
| Upcoming   | transparent | step-outline  | number (page)           | on-forest-dim, 400 |

Circles are 32px with 2px border. Connectors (between steps) are 48×4 with
radius 2 and 8px side margins: tea once reached (`i <= current`), moss
otherwise.

### Table step (1)

Two columns, padding `32 48`, gap 64. Left (flexible, basis 440px): hero title, lede, optional
name field ("Your name (optional)"), full-width **Start order** (disabled until
a table is chosen), hint (`Choose a table to continue.` → `Table 6 selected.`).
Right: "Choose your table" panel title, four-column grid of TableTiles (two columns below 768px), caption "Tables
marked In use already have an order open."

### Menu step (2)

Padding 24, gap 24, three columns:

1. **Category rail** (200px): `nav aria-label="Menu categories"`, five 64px
   category buttons (16/700, radius 8, left aligned, `aria-pressed`), then
   "Change table" (touch-sm).
2. **Item grid** (flex): title = category, auto-fitting columns, gap 12.
3. **Cart** (340px): bordered panel, "Your order" + `Table 6 · Name`, normal-flow
   list with steppers, Total (24/700), full-width **Review order** (disabled when
   empty).

**MenuCard**: button, `min-height:136`, padding `12 16`, column, gap 8, radius 8,
tea fill. Image 96px high, radius 4, `object-fit:cover`, `field` background,
`alt=""`. Name 16/700, description 12/16 moss, price 16/700 tabular. Right of the
price: `×n` chip when in cart; plus icon (24px) when addable. Sold out: page
fill, `1px dashed moss`, image opacity .5, "Sold out" tea chip, disabled,
`aria-label="<name>, sold out"`. Placeholder image (until a photo URL exists):
240×96 SVG, `field` background, tea circle r=38 with 2px moss stroke, inner ring
r=26 at 50% opacity, two-letter initials (24/700 forest).

### Review step (3)

Padding 24, gap 16. Top row: left panel (flex 1.2, padding 24) "Check your
order" (Page title) with normal-flow lines (steppers 48px) and a Total (32/700);
right column (flex 1): kitchen notes textarea, **How will you pay?** radio cards,
then either the till message (tea box) or Network + Phone fields with FieldError.
Bottom bar: "Back to menu" (tonal) left, `Send to kitchen · UGX 52,000`
(primary, `min-width:320`) right.

### Done step (4)

Padding `32 48`, gap 48. Left (flex 1.2): 56px moss check circle, hero title,
`ORD-1047 · Table 6`; tracker `ol aria-label="Order status"` of three rows
(`min-height:72`, padding `8 16`, radius 8): current moss/white, done
forest/white, next tea/forest, each with a numbered (or ✓) 32px circle, label,
hint and a state chip (`Now` / `Done` / `Next`); payment note in a tea box;
actions "Start a new order" (primary) and the prototype-only advance button.
Right (flex 1): panel "Your order" with lines, optional "Kitchen note: …" and
Total.

---

## Accessibility contract

- Every interactive element is a real `button`, `a`, `input`, `select` or
  `textarea`; the focus ring is never removed.
- Toggle buttons expose `aria-pressed`; radio cards are real radios in a
  `fieldset` with a `legend`.
- Errors: `role="alert"`, `aria-invalid` on the field, text begins `Error:`.
- Status messages: `role="status"`.
- Decorative icons and item images: `aria-hidden` / `alt=""`.
- Steppers: spoken labels `Remove one <item>` / `Add one <item>`; no free typing.
- Station touch targets: buttons 56, small 44, category 64, tables 96.
- Staff targets: at least 44 (tables 64).
- Respect `prefers-reduced-motion` if any transition is added (the mock-up has
  none; do not add animation beyond hover colour changes).

---

## Tailwind v4 mapping

The frontend already uses Tailwind v4 (`@tailwindcss/vite`). Declare the tokens
once in `app/app.css` and build components from them; do not use arbitrary
values for anything in the tables above.

```css
@import "tailwindcss";

@theme {
  --font-sans: "Lato", system-ui, -apple-system, "Segoe UI", sans-serif;

  --color-page: #f3ede3;
  --color-forest: #18442a;
  --color-moss: #45644a;
  --color-tea: #e4dbc4;
  --color-field: #f0e9dd;
  --color-error: #ba1a1a;
  --color-sage: #8aa58f;
  --color-row-hover: #e4dbc44d;
  --color-on-forest-dim: #c9d3c5;
  --color-step-outline: #a9b8a6;

  --radius-chip: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;

  --shadow-toast: 0 4px 8px #18442a33;

  --container-content: 1280px; /* styleguide reference width; staff workspace is fluid */
  --container-signin: 1040px; /* sign-in shell: max-w-signin */

  --text-hero: 36px;
  --text-hero--line-height: 44px;
  --text-title: 32px;
  --text-title--line-height: 40px;
  --text-panel: 24px;
  --text-panel--line-height: 32px;
  --text-wordmark: 22px;
  --text-wordmark--line-height: 28px;
  --text-figure: 20px;
  --text-figure--line-height: 28px;
  --text-heading: 16px;
  --text-heading--line-height: 24px;
  --text-body: 14px;
  --text-body--line-height: 20px;
  --text-label: 12px;
  --text-label--line-height: 16px;
  --text-micro: 11px;
  --text-micro--line-height: 16px;
}

@layer base {
  html,
  body {
    background: var(--color-page);
    color: var(--color-forest);
  }
  button,
  input,
  select,
  textarea {
    font-family: inherit;
  }
  :focus-visible {
    outline: 2px solid var(--color-moss);
    outline-offset: 2px;
  }
  .on-forest :focus-visible {
    outline-color: var(--color-page);
  }
}
```

Letter spacing is not part of Tailwind's type scale; add `tracking-*` utilities
in `@theme` (`--tracking-body: .25px`, `--tracking-bold: .1px`,
`--tracking-heading: .15px`, `--tracking-lede: .5px`, `--tracking-caption: .4px`,
`--tracking-label: .5px`) or bake letter spacing into small `@utility` helpers
(`text-body`, `text-body-bold`, `text-caption`, `text-label`) so a component
never has to remember the pairing.

Component implementation rule: one file per component in
`app/components/ui/`, styled with token utilities only, one story/fixture per
state listed above, and a `data-testid` or role that the fidelity tests can
target.

---

## Discrepancies between the design document and the markup

| #   | Design document says                                                | Markup does                                                                                                                       | Build to                                                                                     |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Page headings 24/32                                                 | Page `h1` is 32/40; 24/32 is the panel title                                                                                      | Markup                                                                                       |
| 2   | Section headings 16/24 bold                                         | Same, plus `.15px` tracking                                                                                                       | Markup                                                                                       |
| 3   | Staff Orders picker "grouped by category"                           | Single grid filtered by category toggle chips (All, Mains, Snacks, Sides, Drinks) with 12 items                                   | Markup                                                                                       |
| 4   | Staff app lists 18 items                                            | Menu screen lists 18; the Orders picker has 12 (no Grilled Goat Ribs, Kikomando, Kachumbari, Tea, Fruit Platter, Banana Fritters) | Menu = real data; Orders picker = available, non-archived items from the API                 |
| 5   | Sidebar lists "the screens"                                         | Nav labels: Orders, Payments, **Menu**, Reports (tile and `h1` say "Menu management")                                             | Markup                                                                                       |
| 6   | Reviewers can move through the whole prototype                      | Sidebar signed-in persona differs per screen (Okello Peter, Nakato Sarah, Tumusiime Ruth)                                         | Show the real signed-in user                                                                 |
| 7   | Role gating on the startup menu only                                | Nav stays open                                                                                                                    | Keep nav open (fidelity) but render a Locked state on a screen the API refuses; see the plan |
| 8   | Status "Preparing/Pending/Served"                                   | Chip colours: Pending tea/forest, Preparing moss/white, Served forest/white                                                       | Markup                                                                                       |
| 9   | The Dart theme in the project folder (`app_theme.dart`, Cabin font) | Lato; roles differ                                                                                                                | Ignore the Dart file; it is a stale Flutter theme                                            |

When a mock-up screen shows something the data model cannot supply yet (seats,
categories, customer names, mobile network, average stay), the gap and the
interim rendering are tracked in
[`frontend-implementation-plan.md`](frontend-implementation-plan.md#4-backend-contract-and-gaps).
