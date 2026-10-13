import type { ChipTone } from "~/components/ui/Chip";
import type { Order, OrderStatus, Role } from "~/lib/api/types";

/** Plan D6: six backend statuses, the mock-up's three words plus "Ready". */
const LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

const TONES: Record<OrderStatus, ChipTone> = {
  pending: "neutral",
  confirmed: "neutral",
  preparing: "active",
  ready: "active",
  served: "done",
  cancelled: "outline",
};

export function statusLabel(status: OrderStatus): string {
  return LABELS[status];
}

export function statusTone(status: OrderStatus): ChipTone {
  return TONES[status];
}

/** The board's filter chips stay exactly as in the mock-up. */
export const FILTERS = ["All", "Pending", "Preparing", "Served"] as const;
export type Filter = (typeof FILTERS)[number];

export function filterOf(status: OrderStatus): Exclude<Filter, "All"> | null {
  switch (status) {
    case "pending":
    case "confirmed":
      return "Pending";
    case "preparing":
    case "ready":
      return "Preparing";
    case "served":
      return "Served";
    default:
      return null;
  }
}

export type NextAction =
  | { kind: "advance"; label: string; to: OrderStatus }
  | { kind: "pay" }
  | { kind: "note"; text: string };

/**
 * What the "Next step" cell offers. The API enforces who may do what; this
 * mirrors it so a role only sees buttons that will work (plan section 3, D6).
 */
export function nextAction(role: Role, order: Order, staffId: number): NextAction {
  const ownOrder = order.staff_id === staffId;

  switch (order.order_status) {
    case "pending":
      return { kind: "note", text: "Waiting for a waiter" };
    case "confirmed":
      if (role === "kitchen" || role === "manager") {
        return { kind: "advance", label: "Start preparing", to: "preparing" };
      }
      return { kind: "note", text: "Waiting for the kitchen" };
    case "preparing":
      if (role === "kitchen" || role === "manager") {
        return { kind: "advance", label: "Mark ready", to: "ready" };
      }
      return { kind: "note", text: "Being prepared" };
    case "ready":
      if (role === "manager" || (role === "wait_staff" && ownOrder)) {
        return { kind: "advance", label: "Mark served", to: "served" };
      }
      return { kind: "note", text: "Ready to serve" };
    case "served":
      if (order.paid === true) return { kind: "note", text: "Paid" };
      if (role === "cashier" || role === "manager") return { kind: "pay" };
      return { kind: "note", text: "Awaiting payment" };
    default:
      return { kind: "note", text: "" };
  }
}

/**
 * Whether an order belongs on the Active orders board. Cancelled orders never
 * do. Without a `paid` flag from the API (gap G10, issue #14) paid orders stay
 * "served" forever, so older served orders are treated as finished.
 */
export function isActive(
  order: Order,
  now: Date,
  sameDay: (a: Date | string, b: Date | string) => boolean,
): boolean {
  if (order.order_status === "cancelled") return false;
  if (order.order_status !== "served") return true;
  if (order.paid === true) return false;
  if (order.paid === false) return true;
  return sameDay(order.order_time, now);
}
