/**
 * The mock-ups' sample data in the shape the app consumes (domain types from
 * ~/lib/api/types, money in whole shillings). Playwright serves this through
 * `page.route` so the real app renders the same orders, tables, menu and
 * reports as the artboards. Fields the backend does not serve yet (seats,
 * category, archived, customer names) are included because the mock-ups show
 * them; see docs/frontend-implementation-plan.md section 4.2.
 */
import type {
  DailySalesRow,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethodRow,
  Table,
  TableTurnoverRow,
  TopItemRow,
  WaiterRow,
} from "../../app/lib/api/types";

// --- Tables: 12, seats as in the mock-ups, occupied 2, 3, 4, 5, 7, 9, 11 -----

const SEATS = [2, 2, 4, 4, 4, 4, 6, 6, 2, 8, 4, 4];
const OCCUPIED = new Set([2, 3, 4, 5, 7, 9, 11]);

export const tables: Table[] = SEATS.map((seats, i) => ({
  table_id: i + 1,
  free_status: !OCCUPIED.has(i + 1),
  seats,
}));

// --- Menu: MI-001 to MI-018 (staff Menu screen) ------------------------------

type MenuRow = [string, MenuCategory, number, string | null, boolean, boolean];

const MENU_ROWS: MenuRow[] = [
  ["Matoke & Beef Stew", "Mains", 18000, "Steamed green banana with beef stew", true, false],
  ["Chicken Luwombo", "Mains", 25000, "Chicken steamed in banana leaves", true, false],
  ["Fried Tilapia & Chips", "Mains", 32000, "Whole fried tilapia served with chips", true, false],
  ["Pilau Beef", "Mains", 20000, "Spiced rice cooked with beef", true, false],
  ["Grilled Goat Ribs", "Mains", 28000, "Charcoal-grilled goat ribs", false, false],
  ["Rolex", "Snacks", 5000, "Chapati rolled with fried egg and vegetables", true, false],
  ["Samosas (2)", "Snacks", 3000, "Two crisp spiced pastries", true, false],
  ["Kikomando", "Snacks", 4000, "Chopped chapati with beans", true, false],
  ["Chapati", "Sides", 2000, "Soft pan-fried flatbread", true, false],
  ["Steamed Rice", "Sides", 5000, "Plain steamed rice", true, false],
  ["Kachumbari Salad", "Sides", 4000, "Tomato, onion and chilli", true, false],
  ["Passion Juice", "Drinks", 6000, "Fresh passion fruit juice", true, false],
  ["Mango Juice", "Drinks", 6000, "Fresh mango juice", true, false],
  ["Soda 300ml", "Drinks", 3000, "Chilled bottled soda", true, false],
  ["Mineral Water 500ml", "Drinks", 2000, "Still bottled water", true, false],
  ["Ugandan Tea", "Drinks", 3000, "Black tea with milk", true, false],
  ["Banana Fritters", "Desserts", 5000, null, false, true],
  ["Fruit Platter", "Desserts", 8000, "Seasonal fresh fruit", true, false],
];

export const menuItems: MenuItem[] = MENU_ROWS.map(
  ([item_name, category, price, description, availability_status, archived], i) => ({
    menu_item_id: i + 1,
    item_name,
    description,
    price,
    availability_status,
    category,
    archived,
    image_url: null,
  }),
);

const idOf = (name: string): number => {
  const item = menuItems.find((m) => m.item_name === name);
  if (!item) throw new Error(`Unknown fixture menu item: ${name}`);
  return item.menu_item_id;
};

/** The staff Orders picker shows only these 12 of the 18 items. */
export const ORDER_PICKER_IDS: number[] = [
  "Matoke & Beef Stew",
  "Chicken Luwombo",
  "Fried Tilapia & Chips",
  "Pilau Beef",
  "Rolex",
  "Samosas (2)",
  "Steamed Rice",
  "Chapati",
  "Passion Juice",
  "Mango Juice",
  "Soda 300ml",
  "Mineral Water 500ml",
].map(idOf);

// --- Orders: ORD-1039 to ORD-1046 (staff Orders and Payments screens) --------

export interface MockOrder extends Order {
  /** Gap G4: the backend has no customer names yet. */
  customer_name: string;
}

type Line = [string, number];

function build(
  order_id: number,
  table_id: number,
  customer_name: string,
  waiter: string,
  order_status: OrderStatus,
  lines: Line[],
): MockOrder {
  const items: OrderItem[] = lines.map(([name, quantity], i) => {
    const menu = menuItems[idOf(name) - 1];
    return {
      order_item_id: order_id * 10 + i,
      menu_item_id: menu.menu_item_id,
      item_name: menu.item_name,
      unit_price: menu.price,
      quantity,
      item_subtotal: menu.price * quantity,
      special_instructions: null,
    };
  });
  return {
    order_id,
    table_id,
    order_status,
    order_time: `2026-10-11T12:${String(order_id - 1000).padStart(2, "0")}:00+03:00`,
    staff_id: waiter.startsWith("Okello") ? 1004 : 1007,
    waiter,
    items,
    total: items.reduce((sum, it) => sum + it.item_subtotal, 0),
    paid: false,
    customer_name,
  };
}

export const orders: MockOrder[] = [
  build(1046, 9, "Birungi Esther", "Namukasa G.", "preparing", [
    ["Fried Tilapia & Chips", 1],
    ["Mango Juice", 1],
  ]),
  build(1045, 7, "Ssemakula David", "Okello P.", "served", [
    ["Matoke & Beef Stew", 3],
    ["Mineral Water 500ml", 3],
  ]),
  build(1044, 4, "Walk-in guest", "Namukasa G.", "pending", [
    ["Chicken Luwombo", 1],
    ["Steamed Rice", 1],
    ["Soda 300ml", 1],
  ]),
  build(1043, 2, "Atim Joan", "Okello P.", "preparing", [
    ["Rolex", 2],
    ["Passion Juice", 2],
  ]),
  build(1042, 3, "Walk-in guest", "Okello P.", "served", [
    ["Pilau Beef", 2],
    ["Soda 300ml", 2],
  ]),
  build(1041, 11, "Opio Martin", "Namukasa G.", "served", [
    ["Fried Tilapia & Chips", 1],
    ["Chapati", 2],
    ["Mango Juice", 1],
    ["Mineral Water 500ml", 1],
  ]),
  build(1039, 5, "Nabirye Agnes", "Okello P.", "served", [
    ["Chicken Luwombo", 2],
    ["Steamed Rice", 2],
    ["Passion Juice", 2],
  ]),
];

/** What the cashier's queue shows: served orders, in ascending order number. */
export const paymentQueue: MockOrder[] = orders
  .filter((o) => o.order_status === "served")
  .sort((a, b) => a.order_id - b.order_id);

// --- Reports: This week (5 to 11 October 2026) and Last 4 weeks --------------

export interface ReportFixture {
  label: string;
  from: string;
  to: string;
  daily: (DailySalesRow & { label: string })[];
  topItems: TopItemRow[];
  waiters: WaiterRow[];
  paymentMethods: PaymentMethodRow[];
  turnover: TableTurnoverRow[];
}

const day = (sale_date: string, label: string, revenue: number, orders: number) => ({
  sale_date,
  label,
  revenue,
  orders,
});

const top = (name: string, price: number, sold: number): TopItemRow => ({
  menu_item_id: idOf(name),
  item_name: name,
  units_sold: sold,
  revenue: sold * price,
});

const waiter = (
  staff_id: number,
  username: string,
  orders_handled: number,
  revenue: number,
): WaiterRow => ({
  staff_id,
  username,
  orders_handled,
  revenue,
  avg_order_value: Math.round(revenue / orders_handled),
});

/** Mock-up table-turnover base values: [seats, turns per day, average stay]. */
const TURNOVER_BASE: [number, number, number][] = [
  [2, 4.0, 42],
  [2, 4.4, 38],
  [4, 5.0, 55],
  [4, 5.2, 52],
  [4, 5.4, 50],
  [4, 4.6, 58],
  [6, 3.0, 74],
  [6, 2.8, 78],
  [2, 3.7, 40],
  [8, 2.2, 95],
  [4, 4.8, 54],
  [4, 4.2, 56],
];

function turnover(totalOrders: number, days: number): TableTurnoverRow[] {
  const factor = totalOrders / days / 49.3;
  return TURNOVER_BASE.map(([seats, turns, stay], i) => ({
    table_id: i + 1,
    orders_paid: 0,
    parties_served: 0,
    revenue: 0,
    turnover_per_day: Number((turns * factor).toFixed(1)),
    seats,
    avg_stay_minutes: stay,
  }));
}

function methods(total: number): PaymentMethodRow[] {
  const cash = Math.round(total * 0.41);
  return [
    { payment_method: "Cash", payments: 0, revenue: cash },
    { payment_method: "Mobile Money", payments: 0, revenue: total - cash },
  ];
}

export const reportWeek: ReportFixture = {
  label: "5 to 11 October 2026",
  from: "2026-10-05",
  to: "2026-10-11",
  daily: [
    day("2026-10-05", "Mon 5 Oct", 1240000, 40),
    day("2026-10-06", "Tue 6 Oct", 980000, 33),
    day("2026-10-07", "Wed 7 Oct", 1115000, 37),
    day("2026-10-08", "Thu 8 Oct", 1360000, 44),
    day("2026-10-09", "Fri 9 Oct", 1985000, 62),
    day("2026-10-10", "Sat 10 Oct", 2410000, 74),
    day("2026-10-11", "Sun 11 Oct", 1730000, 55),
  ],
  topItems: [
    top("Rolex", 5000, 212),
    top("Passion Juice", 6000, 168),
    top("Soda 300ml", 3000, 150),
    top("Matoke & Beef Stew", 18000, 131),
    top("Chicken Luwombo", 25000, 96),
    top("Fried Tilapia & Chips", 32000, 88),
  ],
  waiters: [
    waiter(1004, "Okello Peter", 130, 4310000),
    waiter(1007, "Namukasa Grace", 118, 3640000),
    waiter(1008, "Kizza Moses", 97, 2870000),
  ],
  paymentMethods: methods(10820000),
  turnover: turnover(345, 7),
};

export const reportMonth: ReportFixture = {
  label: "14 September to 11 October 2026",
  from: "2026-09-14",
  to: "2026-10-11",
  daily: [
    day("2026-09-14", "14–20 Sep", 9640000, 318),
    day("2026-09-21", "21–27 Sep", 10210000, 336),
    day("2026-09-28", "28 Sep–4 Oct", 9870000, 322),
    day("2026-10-05", "5–11 Oct", 10820000, 345),
  ],
  topItems: [
    top("Rolex", 5000, 806),
    top("Passion Juice", 6000, 641),
    top("Soda 300ml", 3000, 574),
    top("Matoke & Beef Stew", 18000, 498),
    top("Chicken Luwombo", 25000, 366),
    top("Fried Tilapia & Chips", 32000, 337),
  ],
  waiters: [
    waiter(1004, "Okello Peter", 506, 16520000),
    waiter(1007, "Namukasa Grace", 452, 13900000),
    waiter(1008, "Kizza Moses", 363, 10120000),
  ],
  paymentMethods: methods(40540000),
  turnover: turnover(1321, 28),
};

// --- Payments screen ---------------------------------------------------------

export const nextPaymentNumber = 388;
export const receivedToday = 1215000;
