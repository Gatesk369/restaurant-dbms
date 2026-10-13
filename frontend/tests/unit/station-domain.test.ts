import { afterEach, describe, expect, it } from "vitest";

import { initials, orderFor, payNote, placeholderImage, trackerStep } from "~/lib/domain/station";
import { EMPTY_DRAFT, clearDraft, loadDraft, saveDraft } from "~/lib/station-session";

afterEach(() => sessionStorage.clear());

describe("tracker", () => {
  it("maps the kitchen's statuses onto Pending, Preparing, Served", () => {
    expect(trackerStep("pending")).toBe(0);
    expect(trackerStep("confirmed")).toBe(0);
    expect(trackerStep("preparing")).toBe(1);
    expect(trackerStep("ready")).toBe(1);
    expect(trackerStep("served")).toBe(2);
    expect(trackerStep("cancelled")).toBeNull();
  });
});

describe("card art", () => {
  it("takes initials from the first two words", () => {
    expect(initials("Matoke & Beef Stew")).toBe("MB");
    expect(initials("Rolex")).toBe("R");
    expect(initials("Samosas (2)")).toBe("S");
    expect(initials("  fried tilapia  ")).toBe("FT");
  });

  it("draws the mock-up's plate as an SVG data URI", () => {
    const uri = placeholderImage("Fried Tilapia & Chips");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    const svg = decodeURIComponent(uri.split(",")[1]);
    expect(svg).toContain('width="240" height="96"');
    expect(svg).toContain("#e4dbc4");
    expect(svg).toContain(">FT</text>");
  });
});

describe("wording", () => {
  it("says which table and, when given, whose", () => {
    expect(orderFor(null, "")).toBe("No table chosen");
    expect(orderFor(6, "")).toBe("Table 6");
    expect(orderFor(6, "  Atim ")).toBe("Table 6 · Atim");
  });

  it("repeats the payment choice", () => {
    expect(payNote("till", "ORD-1047", "UGX 61,000", "", "MTN Mobile Money")).toBe(
      "Pay at the till when you are ready. Quote ORD-1047 to the cashier.",
    );
    expect(payNote("momo", "ORD-1047", "UGX 61,000", " 0772123456 ", "Airtel Money")).toBe(
      "A payment request for UGX 61,000 was sent to 0772123456 on Airtel Money. Approve it on your phone.",
    );
    expect(payNote("momo", "ORD-1047", "UGX 61,000", "", "Airtel Money")).toContain(
      "your phone on",
    );
  });
});

describe("draft storage", () => {
  it("round-trips and clears", () => {
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
    const draft = {
      ...EMPTY_DRAFT,
      screen: "menu" as const,
      table: 6,
      lines: [{ menu_item_id: 1, quantity: 2 }],
    };
    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
    clearDraft();
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
  });

  it("ignores something that is not a draft", () => {
    sessionStorage.setItem("rdbms.station", "{not json");
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
    sessionStorage.setItem("rdbms.station", JSON.stringify({ screen: "payment" }));
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
  });
});
