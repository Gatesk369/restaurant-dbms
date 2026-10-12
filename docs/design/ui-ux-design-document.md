# Restaurant DBMS — UI/UX Design Document

Oct 11, 2026 · @Kaddu Jordan

This document specifies the UI and UX of two clickable prototypes for the Restaurant DBMS (Makerere University CSC2107 group project): a staff app for running the restaurant, and a separate customer self-order station. Both use the rest-dbms design system and sample data in Ugandan shillings (UGX).

## Overview

The two prototypes are independent: separate canvases, no shared sign-in and no shared state. They share only the design system and the sample menu.

| Prototype | Used by | Covers | Artboards |
| --- | --- | --- | --- |
| Staff app | Cashier, Wait Staff, Kitchen Staff, Manager | Role-based sign-in and startup menu, order creation and processing, payment (cash or mobile money), menu management, textual and graphical reports | 5, each 1360 px wide: Main, Orders, Payments, Menu, Reports |
| Ordering station | Customers seated at a table | Table choice, menu browsing, order review with payment choice, order status | 1 artboard, 1280 × 800 px, four states |

Both are mock-ups: no real backend, authentication or payment. Every figure is sample data, and the prototypes only demonstrate the interaction and the database activity (triggers) the plan describes.

## Users and roles

Four staff roles share one app, and each sees only the screens its job needs. Customers use the ordering station and never sign in.

| Role | Sample user | Main goal | Screens unlocked |
| --- | --- | --- | --- |
| Cashier | Nakato Sarah | Takes payments | Orders, Payments |
| Wait Staff | Okello Peter, Namukasa Grace | Creates orders | Orders |
| Kitchen Staff | Mugisha Brian | Updates order status | Orders |
| Manager | Tumusiime Ruth | Maintains the menu and reads reports | Orders, Payments, Menu, Reports |
| Customer | None (guest name optional) | Orders and pays for their own table | Ordering station only |

Role gating is shown on the startup menu: tiles a role cannot use stay visible but read "Locked for \<role>" instead of disappearing, so staff learn what the system offers. Navigation inside each screen stays open for every role so reviewers can move through the whole prototype.

## Design principles and visual language

Both prototypes follow the rest-dbms design system: a warm off-white page, forest-green text and moss-green actions, set in Lato. Four principles guide the layouts:

1. One job per screen. Each screen does one thing (take an order, take a payment, edit the menu, read a report) and names it in its heading.
2. Show what the database does. Staff screens carry a "Database activity" panel so the triggers behind each action are visible.
3. Never rely on colour alone. Status, errors and selection always add a word or an icon.
4. Fit the device. The staff app is built for a desk or counter screen; the ordering station uses 56 px or larger touch targets.

### Colour

| Token | Hex | Used for |
| --- | --- | --- |
| Page | #f3ede3 | Page background |
| Forest | #18442a | Text, headers, sidebar |
| Moss | #45644a | Primary buttons, selected states, focus ring |
| Tea | #e4dbc4 | Soft grounds, secondary buttons, panel borders |
| Field | #f0e9dd | Input fill |
| Error | #ba1a1a | Validation errors (always with a word and an icon) |

White text appears only on moss, forest or error fills.

### Type, shape and focus

- Lato 400 and 700. Page headings 24/32, section headings 16/24 bold, body 14/20, captions 12/16.
- Corner radii of 4 (chips), 8 (buttons, cards, inputs) and 16 (large surfaces).
- Panels are outlined with a 1 px tea border rather than filled white.
- Every interactive element shows a 2 px moss focus ring; on forest headers the ring turns off-white.

## Staff app: navigation and startup menu

&#91;embedded content: staff app navigation · 5 artboards\]

Sign-in and the startup menu share the Main artboard. Each work screen has its own artboard and a 240 px forest sidebar that lists the screens and the signed-in user.

- Under 880 px wide the sidebar collapses into a row above the content.
- The sidebar is sticky, so navigation stays in reach while long screens such as Reports scroll.
- Each screen opens with a persona for its role: Wait Staff on Orders, Cashier on Payments, Manager on Menu and Reports.

## Staff app screens

Each screen is one artboard, 1360 px wide, with a sidebar on the left and the working area on the right.

### Main: sign-in and startup menu

- Four role cards (Cashier, Wait Staff, Kitchen Staff, Manager) work as a radio group; choosing one fills in that role's sample username.
- A username and a password of at least 4 characters are required. Otherwise a red error with an icon reads "Error: enter your username and a password of at least 4 characters." Colour is never the only signal.
- After sign-in the startup menu shows four tiles (Orders, Payments, Menu, Reports). Tiles the role may use are links; the others read "Locked for \<role>".

### Orders (Wait Staff)

- A grid of 12 tables. Tables 2, 3, 4, 5, 7, 9 and 11 are occupied and cannot be picked; free tables are selectable.
- A menu picker grouped by category adds items to the "New order" ticket. The ticket has quantity steppers, an item subtotal per line, a notes field, the order total and a Place order button.
- The "Active orders" board lists each order with a status chip (Pending, Preparing, Served) that always includes the status word. A button advances the status; a served order offers "Take payment".
- "Database activity" logs what the triggers did, for example: ORDER\_ITEMS rows inserted with item\_subtotal = quantity × price, and TABLES free\_status set to FALSE for the chosen table.

### Payments (Cashier)

- A queue of served orders waiting for payment (ORD-1039, 1041, 1042 and 1045 in the sample data) sits beside the checkout panel for the selected order.
- Checkout shows the order lines and total, then a choice of Cash or Mobile money.
- Cash: amount received, quick-amount chips and the change due. If the amount is below the total, the error reads "Error: \<amount> short of the total. Ask for the full amount." and the payment is not recorded.
- Mobile money: a network selector and a phone number that must be 10 digits starting with 07; otherwise an inline error says so.
- Recording a payment creates a payment ID (for example PAY-0388), shows a receipt and a Next order button, and logs two trigger effects: SALES\_RECORD gets the amount added to today's sales, and TABLES free\_status is set back to TRUE.

### Menu (Manager)

- A list of 18 items (MI-001 to MI-018) with search, category chips and a "Show archived" toggle. MI-005 is shown as unavailable and MI-017 as archived.
- The Add/Edit form needs a name and a price above zero; errors appear inline under the field ("enter a name for the item", "price must be a whole number greater than 0").
- Items are archived and restored rather than deleted.

### Reports (Manager)

- A range toggle switches between This week and Last 4 weeks. The summary strip shows revenue and order count: UGX 10,820,000 from 345 orders for the week, UGX 40,540,000 from 1,321 orders for four weeks.
- Graphical reports: a revenue bar chart, a payment-methods donut, and top-selling items as bars. Every chart is labelled directly with its values and has a table beside it.
- Textual reports: a sales table, waiter performance and table turnover.

## Ordering station

A single 1280 × 800 touch artboard. A 72 px forest header carries the product name, a progress stepper and a Call a waiter button; the step below fills the remaining 728 px.

&#91;embedded content: ordering station flow · 4 steps, 3 ways back\]

### Header

- The stepper shows four numbered circles joined by lines. Finished steps show a check, the current step is bold, and upcoming steps are outlined; the lines fill in as the customer moves forward. Each step also has a text label and a screen-reader label such as "Step 2 of 4, Menu, current".
- Call a waiter shows a toast for 4 seconds: "A waiter is on the way to Table \<n>."

### 1 Table

- An optional guest name and a 4 × 3 grid of 12 tables. Tables 2, 3, 4, 5, 7, 9 and 11 are in use: disabled and labelled "In use".
- Start order stays disabled until a table is chosen, and the hint reads "Choose a table to continue."

### 2 Menu

- A category rail (Mains, Snacks, Sides, Drinks, Desserts) with 64 px buttons, three columns of item cards, and a 340 px cart panel with steppers, the total and Review order.
- Each card has an image, name, description and price. A plus icon marks items that can be added, and a ×n chip shows the quantity already in the cart.
- The image comes from an image field per menu item. Until a photo URL is set, the card shows a placeholder plate with the item's initials.
- Grilled Goat Ribs is sold out: dashed border, dimmed image, a "Sold out" chip, and the card is disabled.

### 3 Review

- The order lines with steppers, a special-instructions box, and two payment cards: "At the till" (cash or mobile money with the cashier) and "Mobile money now" (MTN or Airtel, from the customer's phone).
- Mobile money asks for a network and a phone number of 10 digits starting 07; an invalid number shows an inline error and blocks sending.
- If the customer removes the last item, the screen returns to the menu.
- The bottom bar offers Back to menu and "Send to kitchen · UGX \<total>".

### 4 Done

- "Order sent to the kitchen" with the order ID (ORD-1047 in the prototype) and a three-step tracker: Pending, Preparing, Served.
- A note repeats the payment choice, and a summary panel lists the items and total.
- "Start a new order" resets the station. A "Prototype only" button advances the tracker so reviewers can see each state.

## Shared interaction patterns

The two prototypes reuse the same patterns so staff and customers meet familiar behaviour.

- **Status always has a word.** Order status chips read Pending, Preparing or Served; sold-out items carry a "Sold out" chip. Colour only reinforces.
- **Errors are inline and worded.** An error sits directly under its field, starts with "Error:", carries an icon, and turns the field's bottom line red. The field is marked invalid for screen readers.
- **Selection is explicit.** Category and filter buttons are toggle buttons with a pressed state. Role and payment choices are large radio cards with a visible focus outline.
- **Quantities use steppers.** Plus and minus buttons with spoken labels such as "Remove one Rolex"; there is no free typing of quantities.
- **Totals are computed, never typed.** Item subtotals, order totals, change due and report sums are calculated from the same sample data, so every screen agrees.
- **Tables of records are ARIA tables.** Lists such as orders, sales and menu items are built as grids with table roles so they stay readable by assistive technology.

### Database activity

The staff app makes the database visible. A "Database activity" panel on Orders and Payments logs the trigger effects of each action as it happens.

| Action | Screen | Logged effect |
| --- | --- | --- |
| Place order | Orders | ORDER\_ITEMS rows inserted, item\_subtotal = quantity × price; TABLES free\_status set to FALSE for the chosen table |
| Record payment | Payments | SALES\_RECORD receives the amount added to today's sales; TABLES free\_status set to TRUE |
| Read reports | Reports | Totals and charts are drawn from SALES\_RECORD |

## Accessibility and responsiveness

- **Focus.** Every interactive element shows a 2 px moss outline on keyboard focus; on the forest header the outline is off-white.
- **Contrast.** White text is used only on moss, forest and error fills. Body text is forest on off-white.
- **Not colour alone.** Statuses, errors, selected steps and sold-out items always add a word, an icon or a shape (the progress stepper adds a check mark).
- **Touch targets.** On the ordering station, buttons are 56 px tall (44 px for small ones) and category buttons are 64 px. Staff tabs and buttons are at least 44 px.
- **Screen readers.** The current step is marked as such, with labels like "Step 2 of 4, Menu, current". Toggle buttons expose a pressed state, invalid fields are flagged, and item images are decorative because the name sits beside them.
- **Charts.** The report palette passes the colour-blind checks but is low in chroma and lightness range because of the brand greens. Every chart is therefore labelled directly with its values and paired with a table.
- **Layouts.** The staff app collapses its sidebar into a top row under 880 px. The ordering station is a fixed 1280 × 800 landscape layout for a wall- or table-mounted touch screen; a portrait or phone layout is not designed yet.

## Sample data, assumptions and deviations

### Sample data

- **Menu (UGX).** Matoke & Beef Stew 18,000; Chicken Luwombo 25,000; Fried Tilapia & Chips 32,000; Pilau Beef 20,000; Rolex 5,000; Samosas 3,000; Chapati 2,000; Passion and Mango Juice 6,000 each; Soda 3,000; Water 2,000. The staff app lists 18 items; the ordering station offers 17.
- **Staff.** Nakato Sarah (Cashier), Okello Peter and Namukasa Grace (Wait Staff), Mugisha Brian (Kitchen), Tumusiime Ruth (Manager).
- **Orders.** ORD-1039 to ORD-1047 in the staff app. The ordering station issues ORD-1047.

### Assumptions

- "Ordering station" means a customer-facing self-order screen, not a waiter or kitchen terminal.
- The station is independent of the staff app: it has no sign-in and shares no state, so an order placed there does not appear on the Orders screen.
- Currency is Ugandan shillings, shown with thousands separators and no decimals.
- Role gating is demonstrated on the startup menu only.

### Deviations from the design system

- Input fields use a #f0e9dd fill with a 1 px moss bottom line rather than a white surface.
- Colours are written as hex values inline instead of through a token bundle, because the token stylesheet was not readable in the build environment.
- The report palette fails the validator's lightness-band and chroma-floor checks. This follows from the low-chroma brand greens and is mitigated with direct value labels and companion tables.

## Open questions and next steps

- [ ] Decide whether orders from the ordering station should flow into the staff app's Active orders board, and how a kitchen display would read them.
- [ ] Decide whether "Mobile money now" on the station should collect payment itself, or only notify the cashier.
- [ ] Add an image field to the staff app's Add/Edit menu item form, so station photos come from menu management.
- [ ] Give Kitchen Staff a dedicated view; today they use the Orders screen.
- [ ] Design a portrait or phone layout for the ordering station.
- [ ] Test both prototypes with a few staff members and customers, then revise.
