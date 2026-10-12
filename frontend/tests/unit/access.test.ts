import { describe, expect, it } from "vitest";

import { SCREENS, canAccess, getScreen } from "~/lib/access";
import { ROLES } from "~/lib/api/types";

describe("screen access", () => {
  it("matches the role table in the design document", () => {
    const allowed = (role: (typeof ROLES)[number]) =>
      SCREENS.filter((s) => canAccess(role, s.key)).map((s) => s.key);

    expect(allowed("cashier")).toEqual(["orders", "payments"]);
    expect(allowed("wait_staff")).toEqual(["orders"]);
    expect(allowed("kitchen")).toEqual(["orders"]);
    expect(allowed("manager")).toEqual(["orders", "payments", "menu", "reports"]);
  });

  it("keeps the sidebar order and labels from the mock-up", () => {
    expect(SCREENS.map((s) => s.nav)).toEqual(["Orders", "Payments", "Menu", "Reports"]);
    expect(getScreen("menu").title).toBe("Menu management");
  });
});
