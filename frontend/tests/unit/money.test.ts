import { describe, expect, it } from "vitest";

import { formatAmount, formatUgx, parseUgx } from "~/lib/money";

describe("money", () => {
  it("parses DRF decimal strings to whole shillings", () => {
    expect(parseUgx("18000.00")).toBe(18000);
    expect(parseUgx("7999.50")).toBe(8000);
    expect(parseUgx(25000)).toBe(25000);
  });

  it("rejects values that are not amounts", () => {
    expect(() => parseUgx("abc")).toThrow(TypeError);
  });

  it("formats like the mock-ups", () => {
    expect(formatUgx(10820000)).toBe("UGX 10,820,000");
    expect(formatAmount(31362)).toBe("31,362");
  });
});
