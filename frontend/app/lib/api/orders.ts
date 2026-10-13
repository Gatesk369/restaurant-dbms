import { parseUgx } from "../money";
import { ApiError, request } from "./client";
import type { Order, OrderItem, OrderStatus } from "./types";

interface WireOrderItem {
  order_item_id: number;
  menu_item_id: number;
  item_name: string;
  unit_price: string | number;
  quantity: number;
  item_subtotal: string | number;
  special_instructions: string | null;
}

interface WireOrder {
  order_id: number;
  table_id: number;
  order_status: OrderStatus;
  order_time: string;
  staff_id?: number | null;
  waiter?: string | null;
  items?: WireOrderItem[];
  total?: string | number;
  paid?: boolean;
  customer_name?: string | null;
}

function toItem(wire: WireOrderItem): OrderItem {
  return {
    order_item_id: wire.order_item_id,
    menu_item_id: wire.menu_item_id,
    item_name: wire.item_name,
    unit_price: parseUgx(wire.unit_price),
    quantity: wire.quantity,
    item_subtotal: parseUgx(wire.item_subtotal),
    special_instructions: wire.special_instructions ?? null,
  };
}

export function toOrder(wire: WireOrder): Order {
  const items = (wire.items ?? []).map(toItem);
  return {
    order_id: wire.order_id,
    table_id: wire.table_id,
    order_status: wire.order_status,
    order_time: wire.order_time,
    staff_id: wire.staff_id ?? null,
    waiter: wire.waiter ?? null,
    items,
    total:
      wire.total !== undefined
        ? parseUgx(wire.total)
        : items.reduce((sum, item) => sum + item.item_subtotal, 0),
    paid: wire.paid,
    customer_name: wire.customer_name ?? null,
  };
}

/**
 * The staff queue. The server scopes it by role: kitchen sees open orders,
 * wait staff their own, cashiers served-and-unpaid, managers everything.
 */
export async function listStaffOrders(statuses?: readonly OrderStatus[]): Promise<Order[]> {
  const rows = await request<WireOrder[]>("/api/staff/orders/", {
    query: { status: statuses?.length ? statuses.join(",") : undefined },
  });
  return rows.map(toOrder);
}

export async function changeOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  return toOrder(
    await request<WireOrder>(`/api/staff/orders/${orderId}/status/`, {
      method: "POST",
      body: { status },
    }),
  );
}

export interface NewOrderLine {
  menu_item_id: number;
  quantity: number;
  special_instructions?: string;
}

/**
 * Whether POST /api/staff/orders/ exists yet (gap G3, issue #14). Decided on
 * the first call and remembered for the life of the page.
 */
let staffCreate: "unknown" | "yes" | "no" = "unknown";

/** Test hook: forget what was learned about the API. */
export function resetOrderCapabilities(): void {
  staffCreate = "unknown";
}

async function placeViaStaffEndpoint(tableId: number, items: NewOrderLine[]): Promise<Order> {
  return toOrder(
    await request<WireOrder>("/api/staff/orders/", {
      method: "POST",
      body: { table_id: tableId, items },
    }),
  );
}

/**
 * Interim path for gap G3: open an anonymous customer session on the table,
 * then post the order with that session's token. The backend assigns the
 * waiter itself.
 */
async function placeViaCustomerSession(tableId: number, items: NewOrderLine[]): Promise<Order> {
  const customer = await request<{ session_token: string }>("/api/customers/", {
    method: "POST",
    body: { table_id: tableId },
    auth: "none",
  });
  return toOrder(
    await request<WireOrder>("/api/my/orders/", {
      method: "POST",
      body: { items },
      auth: "customer",
      customerToken: customer.session_token,
    }),
  );
}

export async function placeOrder(tableId: number, items: NewOrderLine[]): Promise<Order> {
  if (staffCreate !== "no") {
    try {
      const order = await placeViaStaffEndpoint(tableId, items);
      staffCreate = "yes";
      return order;
    } catch (error) {
      const missing = error instanceof ApiError && (error.status === 404 || error.status === 405);
      if (!missing) throw error;
      staffCreate = "no";
    }
  }
  return placeViaCustomerSession(tableId, items);
}
