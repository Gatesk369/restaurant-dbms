import { describe, expect, it, vi } from "vitest";

import {
  clearCustomerSession,
  clearStaffSession,
  getCustomerSession,
  getStaffSession,
  setCustomerSession,
  setStaffSession,
} from "~/lib/session";

const staff = {
  token: "tok",
  staff: { staff_id: 7, username: "demo_amina", role: "cashier" as const },
};

describe("session storage", () => {
  it("round-trips a staff session and clears it", () => {
    expect(getStaffSession()).toBeNull();
    setStaffSession(staff);
    expect(getStaffSession()).toEqual(staff);
    clearStaffSession();
    expect(getStaffSession()).toBeNull();
  });

  it("round-trips a customer session independently of staff", () => {
    const customer = { customer_id: 3, table_id: 6, session_token: "uuid" };
    setCustomerSession(customer);
    setStaffSession(staff);
    clearStaffSession();
    expect(getCustomerSession()).toEqual(customer);
    clearCustomerSession();
    expect(getCustomerSession()).toBeNull();
  });

  it("ignores malformed or tampered values", () => {
    sessionStorage.setItem("rdbms.staff", "{not json");
    expect(getStaffSession()).toBeNull();
    sessionStorage.setItem(
      "rdbms.staff",
      JSON.stringify({ token: "t", staff: { staff_id: 1, username: "x", role: "owner" } }),
    );
    expect(getStaffSession()).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setStaffSession(staff)).not.toThrow();
  });
});
