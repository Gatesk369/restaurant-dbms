import type { ActivityEntry } from "~/components/ui/ActivityLog";
import type { Order, OrderStatus } from "~/lib/api/types";

/** The panel keeps the six most recent lines, newest first. */
export const LOG_LIMIT = 6;

export function pushEntries(
  log: readonly ActivityEntry[],
  entries: readonly ActivityEntry[],
): ActivityEntry[] {
  return [...entries, ...log].slice(0, LOG_LIMIT);
}

/** Trigger effects of placing an order, from the order the API returned. */
export function orderPlacedEntries(order: Order, time: string): ActivityEntry[] {
  const rows = order.items.length;
  return [
    {
      time,
      text: `ORDER_ITEMS: ${rows} ${rows === 1 ? "row" : "rows"} inserted, item_subtotal = quantity × price`,
    },
    { time, text: `TABLES: Table ${order.table_id} free_status set to FALSE` },
    { time, text: `ORDERS: ORD-${order.order_id} inserted with status ${order.order_status}` },
  ];
}

export function statusChangedEntry(
  orderId: number,
  status: OrderStatus,
  time: string,
): ActivityEntry {
  return { time, text: `ORDERS: ORD-${orderId} order_status set to ${status}` };
}
