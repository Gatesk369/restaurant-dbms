import { afterEach, describe, expect, it, vi } from "vitest";

import { payOrder } from "~/lib/api/payments";

afterEach(() => vi.restoreAllMocks());

function reply(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("payOrder", () => {
  it("posts only the method and converts the amounts", async () => {
    const spy = reply(201, {
      payment: {
        payment_id: 388,
        order_id: 1045,
        amount: "60000.00",
        payment_method: "Cash",
        cashier_id: 1001,
        transaction_time: "2026-10-11T09:41:00Z",
      },
      sales_record: {
        sales_record_id: 9388,
        order_id: 1045,
        payment_id: 388,
        total_amount: "60000.00",
        sale_date: "2026-10-11",
      },
    });
    const result = await payOrder(1045, "Cash");

    expect(String(spy.mock.calls[0][0])).toBe("http://127.0.0.1:8000/api/staff/orders/1045/pay/");
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ payment_method: "Cash" });
    expect(result.payment).toMatchObject({ payment_id: 388, amount: 60000 });
    expect(result.sales_record).toMatchObject({ total_amount: 60000 });
  });

  it("tolerates a response without a sales record", async () => {
    reply(201, {
      payment: {
        payment_id: 1,
        order_id: 2,
        amount: 5000,
        payment_method: "Mobile Money",
        cashier_id: 1,
        transaction_time: "2026-10-11T09:41:00Z",
      },
    });
    expect((await payOrder(2, "Mobile Money")).sales_record).toBeNull();
  });

  it("maps already-paid, not-served and permission failures", async () => {
    reply(409, { detail: "This order has already been paid." });
    await expect(payOrder(1, "Cash")).rejects.toMatchObject({ isConflict: true });

    reply(400, { detail: "Only served orders can be paid." });
    await expect(payOrder(1, "Cash")).rejects.toMatchObject({
      status: 400,
      detail: "Only served orders can be paid.",
    });

    reply(403, { detail: "You do not have permission to perform this action." });
    await expect(payOrder(1, "Cash")).rejects.toMatchObject({ isForbidden: true });
  });
});
