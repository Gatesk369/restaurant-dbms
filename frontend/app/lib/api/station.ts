import { toOrder } from "./orders";
import { request } from "./client";
import type { CustomerSession, Order } from "./types";

interface WireCustomer {
  customer_id: number;
  table_id: number;
  session_token: string;
}

/** Open a session for a table. No sign-in; the API throttles this endpoint. */
export async function startTableSession(tableId: number): Promise<CustomerSession> {
  const data = await request<WireCustomer>("/api/customers/", {
    method: "POST",
    body: { table_id: tableId },
    auth: "none",
  });
  return {
    customer_id: data.customer_id,
    table_id: data.table_id,
    session_token: data.session_token,
  };
}

export interface StationLine {
  menu_item_id: number;
  quantity: number;
  special_instructions?: string;
}

/** Send the cart to the kitchen as the table's customer. */
export async function sendOrder(session: CustomerSession, items: StationLine[]): Promise<Order> {
  return toOrder(
    await request("/api/my/orders/", {
      method: "POST",
      body: { items },
      auth: "customer",
      customerToken: session.session_token,
    }),
  );
}

/** The order's current state, for the tracker. */
export async function fetchMyOrder(session: CustomerSession, orderId: number): Promise<Order> {
  return toOrder(
    await request(`/api/my/orders/${orderId}/`, {
      auth: "customer",
      customerToken: session.session_token,
    }),
  );
}
