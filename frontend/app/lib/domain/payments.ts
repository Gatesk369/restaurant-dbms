import type { Order, Role } from "~/lib/api/types";
import { isActive } from "./order-status";
import { isSameKampalaDay } from "~/lib/time";

/** Roles that see the Payments screen; only cashiers can record a payment. */
export function canRecordPayments(role: Role): boolean {
  return role === "cashier";
}

/** "PAY-0388": the payment id padded to four digits. */
export function paymentNumber(paymentId: number): string {
  return `PAY-${String(paymentId).padStart(4, "0")}`;
}

/**
 * Served orders waiting for payment. For a cashier the server already returns
 * only unpaid ones, so nothing is dropped by date. A manager gets every served
 * order, so paid ones (when flagged) and earlier days are filtered out.
 */
export function awaitingPayment(orders: readonly Order[], role: Role, now: Date): Order[] {
  const served = orders.filter((o) => o.order_status === "served" && o.paid !== true);
  const scoped =
    role === "cashier" ? served : served.filter((o) => isActive(o, now, isSameKampalaDay));
  return scoped.sort((a, b) => a.order_time.localeCompare(b.order_time) || a.order_id - b.order_id);
}

export type Method = "cash" | "momo";

export const MOBILE_NETWORKS = ["MTN Mobile Money", "Airtel Money"] as const;
export type MobileNetwork = (typeof MOBILE_NETWORKS)[number];

/** What the API stores: it knows Cash and Mobile Money, not the network. */
export function apiMethod(method: Method): "Cash" | "Mobile Money" {
  return method === "cash" ? "Cash" : "Mobile Money";
}

/** What the receipt prints: the network for mobile money (kept on this device). */
export function receiptMethod(method: Method, network: MobileNetwork): string {
  return method === "cash" ? "Cash" : network;
}
