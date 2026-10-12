/**
 * Domain types for the API. Money is whole shillings (see lib/money.ts); the
 * endpoint modules convert from DRF's decimal strings. Fields marked "gap"
 * are not served by the backend yet (docs/frontend-implementation-plan.md,
 * section 4.2) and are optional until they land.
 */

export const ROLES = ["cashier", "kitchen", "wait_staff", "manager"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<Role, string> = {
  cashier: "Cashier",
  wait_staff: "Wait Staff",
  kitchen: "Kitchen Staff",
  manager: "Manager",
};

export interface Staff {
  staff_id: number;
  username: string;
  role: Role;
  /** Gap G9: full name, falls back to username in the UI. */
  display_name?: string;
}

export interface StaffSession {
  token: string;
  staff: Staff;
}

export interface CustomerSession {
  customer_id: number;
  table_id: number;
  session_token: string;
}

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const MENU_CATEGORIES = ["Mains", "Snacks", "Sides", "Drinks", "Desserts"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export type PaymentMethod = "Cash" | "Mobile Money";

export interface MenuItem {
  menu_item_id: number;
  item_name: string;
  description: string | null;
  price: number;
  availability_status: boolean;
  /** Gap G5. */
  category?: MenuCategory;
  /** Gap G6: removed from the menu but kept on past orders. */
  archived?: boolean;
  /** Gap G7. */
  image_url?: string | null;
}

export interface OrderItem {
  order_item_id: number;
  menu_item_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  item_subtotal: number;
  special_instructions: string | null;
}

export interface Order {
  order_id: number;
  table_id: number;
  order_status: OrderStatus;
  order_time: string;
  /** Present on staff responses only. */
  staff_id?: number | null;
  waiter?: string | null;
  items: OrderItem[];
  total: number;
  /** Gap G10. */
  paid?: boolean;
}

export interface Table {
  table_id: number;
  free_status: boolean;
  /** Gap G2. */
  seats?: number;
}

export interface Payment {
  payment_id: number;
  order_id: number;
  amount: number;
  payment_method: PaymentMethod;
  cashier_id: number;
  transaction_time: string;
}

export interface SalesRecord {
  sales_record_id: number;
  order_id: number;
  payment_id: number;
  total_amount: number;
  sale_date: string;
}

export interface DailySalesRow {
  sale_date: string;
  orders: number;
  revenue: number;
}

export interface TopItemRow {
  menu_item_id: number;
  item_name: string;
  units_sold: number;
  revenue: number;
}

export interface WaiterRow {
  staff_id: number;
  username: string;
  orders_handled: number;
  revenue: number;
  avg_order_value: number;
}

export interface TableTurnoverRow {
  table_id: number;
  orders_paid: number;
  parties_served: number;
  revenue: number;
  turnover_per_day: number;
  /** Gap G2. */
  seats?: number;
  /** Gap G13. */
  avg_stay_minutes?: number;
}

export interface PaymentMethodRow {
  payment_method: PaymentMethod;
  payments: number;
  revenue: number;
}
