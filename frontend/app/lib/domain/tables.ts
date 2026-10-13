import type { Order, Table } from "~/lib/api/types";

/** "1-12" or "1001,1002,1003" to a list of ids. Anything else is ignored. */
export function parseTableIds(spec: string): number[] {
  const ids: number[] = [];
  for (const part of spec.split(",")) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      for (let id = from; id <= to && ids.length < 500; id++) ids.push(id);
    } else if (/^\d+$/.test(part.trim())) {
      ids.push(Number(part.trim()));
    }
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

/** An order holds its table until it is paid. */
function holdsTable(order: Order): boolean {
  if (order.order_status === "cancelled") return false;
  if (order.order_status === "served") return order.paid !== true;
  return true;
}

/**
 * Interim table list for gap G1 (no tables endpoint yet): the configured ids,
 * occupied when a visible order holds them. Wait staff only see their own
 * orders, so this under-reports; GET /api/tables/ replaces it.
 */
export function deriveTables(ids: readonly number[], orders: readonly Order[]): Table[] {
  const held = new Set(orders.filter(holdsTable).map((o) => o.table_id));
  return ids.map((table_id) => ({ table_id, free_status: !held.has(table_id) }));
}

export function tableLabel(table: Pick<Table, "table_id">): string {
  return `T${table.table_id}`;
}

/** Tile sub-label: seats when the API provides them (gap G2), else the state. */
export function tableSub(table: Table, busyLabel = "Occupied"): string {
  if (!table.free_status) return busyLabel;
  return table.seats ? `${table.seats} seats` : "Free";
}

export function tableAriaLabel(table: Table, busyLabel = "occupied"): string {
  if (!table.free_status) return `Table ${table.table_id}, ${busyLabel}`;
  return table.seats
    ? `Table ${table.table_id}, ${table.seats} seats`
    : `Table ${table.table_id}, free`;
}
