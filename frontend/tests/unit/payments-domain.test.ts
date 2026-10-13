import { describe, expect, it } from "vitest";

import type { Order } from "~/lib/api/types";
import {
  apiMethod,
  awaitingPayment,
  canRecordPayments,
  paymentNumber,
  receiptMethod,
} from "~/lib/domain/payments";
import {
  cashShortfall,
  changeDue,
  isValidPhone,
  parseTendered,
  quickAmounts,
  shortfallMessage,
} from "~/lib/validation";
import { addToPaymentsTally, clearStaffSession, getPaymentsTally } from "~/lib/session";

const NOW = new Date("2026-10-11T12:00:00Z");

function order(id: number, extra: Partial<Order> = {}): Order {
  return {
    order_id: id,
    table_id: 5,
    order_status: "served",
    order_time: "2026-10-11T08:00:00Z",
    items: [],
    total: 1000,
    ...extra,
  };
}

describe("payment numbers and methods", () => {
  it("pads the payment id to four digits", () => {
    expect(paymentNumber(388)).toBe("PAY-0388");
    expect(paymentNumber(7)).toBe("PAY-0007");
    expect(paymentNumber(12345)).toBe("PAY-12345");
  });

  it("sends the API's two methods and prints the network on the receipt", () => {
    expect(apiMethod("cash")).toBe("Cash");
    expect(apiMethod("momo")).toBe("Mobile Money");
    expect(receiptMethod("cash", "MTN Mobile Money")).toBe("Cash");
    expect(receiptMethod("momo", "Airtel Money")).toBe("Airtel Money");
  });

  it("lets only cashiers record payments", () => {
    expect(canRecordPayments("cashier")).toBe(true);
    expect(canRecordPayments("manager")).toBe(false);
    expect(canRecordPayments("wait_staff")).toBe(false);
  });
});

describe("awaitingPayment", () => {
  it("keeps what the server sent a cashier, oldest first, even from earlier days", () => {
    const list = [
      order(1045, { order_time: "2026-10-11T09:00:00Z" }),
      order(1039, { order_time: "2026-10-09T09:00:00Z" }),
    ];
    expect(awaitingPayment(list, "cashier", NOW).map((o) => o.order_id)).toEqual([1039, 1045]);
  });

  it("drops open, cancelled and paid orders", () => {
    const list = [
      order(1, { order_status: "preparing" }),
      order(2, { order_status: "cancelled" }),
      order(3, { paid: true }),
      order(4),
    ];
    expect(awaitingPayment(list, "cashier", NOW).map((o) => o.order_id)).toEqual([4]);
  });

  it("limits a manager's view to today when paid is unknown", () => {
    const list = [order(1, { order_time: "2026-10-01T09:00:00Z" }), order(2)];
    expect(awaitingPayment(list, "manager", NOW).map((o) => o.order_id)).toEqual([2]);
  });
});

describe("cash arithmetic", () => {
  it("parses typed digits as whole shillings", () => {
    expect(parseTendered("100000")).toBe(100000);
    expect(parseTendered("")).toBe(0);
  });

  it("computes shortfall and change, never negative", () => {
    expect(cashShortfall(39000, 60000)).toBe(21000);
    expect(cashShortfall(60000, 60000)).toBe(0);
    expect(changeDue(100000, 60000)).toBe(40000);
    expect(changeDue(10000, 60000)).toBe(0);
  });

  it("words the shortfall like the mock-up", () => {
    expect(shortfallMessage(21000)).toBe(
      "Error: UGX 21,000 short of the total. Ask for the full amount.",
    );
  });

  it("offers the exact amount and two notes", () => {
    expect(quickAmounts(60000)).toEqual([
      { label: "Exact amount", value: 60000 },
      { label: "UGX 50,000", value: 50000 },
      { label: "UGX 100,000", value: 100000 },
    ]);
  });
});

describe("isValidPhone", () => {
  it("accepts ten digits starting 07, with or without spaces", () => {
    expect(isValidPhone("0772123456")).toBe(true);
    expect(isValidPhone("0772 123 456")).toBe(true);
    expect(isValidPhone("0712345678")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("0772")).toBe(false);
    expect(isValidPhone("1772123456")).toBe(false);
    expect(isValidPhone("07721234567")).toBe(false);
    expect(isValidPhone("07721a3456")).toBe(false);
  });
});

describe("session payment tally", () => {
  it("accumulates and clears with the staff session", () => {
    expect(getPaymentsTally()).toEqual({ count: 0, total: 0 });
    addToPaymentsTally(60000);
    expect(addToPaymentsTally(12000)).toEqual({ count: 2, total: 72000 });
    expect(getPaymentsTally().total).toBe(72000);
    clearStaffSession();
    expect(getPaymentsTally()).toEqual({ count: 0, total: 0 });
  });
});
