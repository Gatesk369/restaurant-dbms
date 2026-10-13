/**
 * The fixtures as the API would send them: decimal strings for money, and
 * backend statuses (the mock-up's "pending" is a confirmed order, since only
 * an assigned waiter's order can be started by the kitchen).
 */
import type { MenuItem, OrderStatus } from "../../app/lib/api/types";
import { menuItems, orders, tables, type MockOrder } from "./mockup-data";

const decimal = (n: number) => n.toFixed(2);

const STATUS: Record<string, OrderStatus> = {
  pending: "confirmed",
  preparing: "preparing",
  served: "served",
  ready: "ready",
  confirmed: "confirmed",
};

export function wireMenuItem(item: MenuItem, backendFieldsOnly = true) {
  const base = {
    menu_item_id: item.menu_item_id,
    item_name: item.item_name,
    description: item.description,
    price: decimal(item.price),
    availability_status: item.availability_status,
  };
  // Gap fields (category, archived, image) are not served yet.
  return backendFieldsOnly ? base : { ...base, category: item.category, archived: item.archived };
}

/** `now` makes order times recent so "today" filters keep the orders. */
export function wireOrder(order: MockOrder, now: Date = new Date()) {
  const minutesAgo = Math.max(1050 - order.order_id, 1);
  return {
    order_id: order.order_id,
    table_id: order.table_id,
    order_status: STATUS[order.order_status] ?? order.order_status,
    order_time: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    staff_id: order.staff_id,
    waiter: order.waiter,
    customer_name: order.customer_name,
    total: decimal(order.total),
    items: order.items.map((item) => ({
      order_item_id: item.order_item_id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      unit_price: decimal(item.unit_price),
      quantity: item.quantity,
      item_subtotal: decimal(item.item_subtotal),
      special_instructions: item.special_instructions,
    })),
  };
}

export type WireOrder = ReturnType<typeof wireOrder>;

export function wireTables() {
  return tables.map((t) => ({ table_id: t.table_id, free_status: t.free_status, seats: t.seats }));
}

export function wireOrders(now?: Date) {
  return orders.map((o) => wireOrder(o, now));
}

export { menuItems };
