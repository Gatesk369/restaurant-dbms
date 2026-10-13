import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listStaffMenu } from "~/lib/api/menu";
import {
  changeOrderStatus,
  listStaffOrders,
  placeOrder,
  resetOrderCapabilities,
  toOrder,
} from "~/lib/api/orders";
import { fetchTables } from "~/lib/api/tables";

type Reply = { status?: number; body?: unknown };

/** Routes fetch by "METHOD /path" and records each call's headers and body. */
function mockFetch(routes: Record<string, Reply | (() => Reply)>) {
  const calls: { key: string; headers: Record<string, string>; body: unknown }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    calls.push({
      key,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const route = routes[key];
    const reply = typeof route === "function" ? route() : route;
    if (!reply) return Promise.resolve(new Response("{}", { status: 404 }));
    return Promise.resolve(
      new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 }),
    );
  });
  return calls;
}

const wireOrder = {
  order_id: 1047,
  table_id: 6,
  order_status: "pending",
  order_time: "2026-10-11T09:41:00Z",
  items: [
    {
      order_item_id: 1,
      menu_item_id: 6,
      item_name: "Rolex",
      unit_price: "5000.00",
      quantity: 2,
      item_subtotal: "10000.00",
      special_instructions: null,
    },
  ],
  total: "10000.00",
};

beforeEach(() => resetOrderCapabilities());
afterEach(() => vi.restoreAllMocks());

describe("toOrder", () => {
  it("converts decimal strings to whole shillings", () => {
    const order = toOrder(wireOrder as never);
    expect(order.total).toBe(10000);
    expect(order.items[0]).toMatchObject({ unit_price: 5000, item_subtotal: 10000 });
  });

  it("sums the lines when the response has no total", () => {
    const { total: _total, ...withoutTotal } = wireOrder;
    expect(toOrder(withoutTotal as never).total).toBe(10000);
  });

  it("keeps fields the backend may add later", () => {
    const order = toOrder({
      ...wireOrder,
      paid: true,
      customer_name: "Atim Joan",
      waiter: "okello.peter",
    } as never);
    expect(order).toMatchObject({ paid: true, customer_name: "Atim Joan", waiter: "okello.peter" });
  });
});

describe("reading", () => {
  it("asks the queue for the statuses given", async () => {
    const calls = mockFetch({ "GET /api/staff/orders/": { body: [wireOrder] } });
    const orders = await listStaffOrders(["confirmed", "served"]);
    expect(orders).toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/staff/orders/?status=confirmed%2Cserved",
      expect.anything(),
    );
  });

  it("maps menu prices and fills the interim category", async () => {
    mockFetch({
      "GET /api/staff/menu/": {
        body: [
          {
            menu_item_id: 6,
            item_name: "Rolex",
            description: null,
            price: "5000.00",
            availability_status: true,
          },
        ],
      },
    });
    const [item] = await listStaffMenu();
    expect(item).toMatchObject({ price: 5000, category: "Snacks" });
  });

  it("returns null while the tables endpoint is missing, and rows when it exists", async () => {
    mockFetch({});
    expect(await fetchTables()).toBeNull();

    vi.restoreAllMocks();
    mockFetch({
      "GET /api/tables/": {
        body: [
          { table_id: 1, free_status: true, seats: 2 },
          { table_id: 2, free_status: false },
        ],
      },
    });
    expect(await fetchTables()).toEqual([
      { table_id: 1, free_status: true, seats: 2 },
      { table_id: 2, free_status: false, seats: undefined },
    ]);
  });

  it("lets other table errors through", async () => {
    mockFetch({ "GET /api/tables/": { status: 500 } });
    await expect(fetchTables()).rejects.toMatchObject({ status: 500 });
  });
});

describe("changing status", () => {
  it("posts the new status and returns the updated order", async () => {
    const calls = mockFetch({
      "POST /api/staff/orders/1044/status/": {
        body: { ...wireOrder, order_id: 1044, order_status: "preparing" },
      },
    });
    const order = await changeOrderStatus(1044, "preparing");
    expect(order.order_status).toBe("preparing");
    expect(calls[0].body).toEqual({ status: "preparing" });
  });

  it("surfaces the server's transition error", async () => {
    mockFetch({
      "POST /api/staff/orders/1044/status/": {
        status: 400,
        body: { status: "Can't move an order from pending to served." },
      },
    });
    await expect(changeOrderStatus(1044, "served")).rejects.toMatchObject({
      status: 400,
      fields: { status: "Can't move an order from pending to served." },
    });
  });
});

describe("placing an order", () => {
  const lines = [{ menu_item_id: 6, quantity: 2, special_instructions: "no onions" }];

  it("uses the staff endpoint when it exists", async () => {
    const calls = mockFetch({ "POST /api/staff/orders/": { status: 201, body: wireOrder } });
    const order = await placeOrder(6, lines);
    expect(order.order_id).toBe(1047);
    expect(calls.map((c) => c.key)).toEqual(["POST /api/staff/orders/"]);
    expect(calls[0].body).toEqual({ table_id: 6, items: lines });
  });

  it("falls back to a customer session when the endpoint is missing, and remembers", async () => {
    const calls = mockFetch({
      "POST /api/staff/orders/": { status: 405, body: { detail: 'Method "POST" not allowed.' } },
      "POST /api/customers/": {
        status: 201,
        body: { customer_id: 9, table_id: 6, session_token: "tok-9" },
      },
      "POST /api/my/orders/": { status: 201, body: wireOrder },
    });

    const order = await placeOrder(6, lines);
    expect(order.order_id).toBe(1047);
    expect(calls.map((c) => c.key)).toEqual([
      "POST /api/staff/orders/",
      "POST /api/customers/",
      "POST /api/my/orders/",
    ]);
    expect(calls[1].body).toEqual({ table_id: 6 });
    expect(calls[2].headers["X-Session-Token"]).toBe("tok-9");
    expect(calls[2].body).toEqual({ items: lines });

    // The second order skips the endpoint that is known to be missing.
    calls.length = 0;
    await placeOrder(6, lines);
    expect(calls.map((c) => c.key)).toEqual(["POST /api/customers/", "POST /api/my/orders/"]);
  });

  it("does not treat a validation error as a missing endpoint", async () => {
    const calls = mockFetch({
      "POST /api/staff/orders/": { status: 400, body: { items: "Not available right now: Rolex" } },
    });
    await expect(placeOrder(6, lines)).rejects.toMatchObject({
      status: 400,
      fields: { items: "Not available right now: Rolex" },
    });
    expect(calls).toHaveLength(1);
  });

  it("does not store the temporary customer session", async () => {
    mockFetch({
      "POST /api/staff/orders/": { status: 405 },
      "POST /api/customers/": {
        status: 201,
        body: { customer_id: 9, table_id: 6, session_token: "tok-9" },
      },
      "POST /api/my/orders/": { status: 201, body: wireOrder },
    });
    await placeOrder(6, lines);
    expect(sessionStorage.getItem("rdbms.customer")).toBeNull();
  });
});
