import { describe, expect, it } from "vitest";

import type { PaymentMethodRow } from "~/lib/api/types";
import {
  compactUgx,
  dailyPeriods,
  dayLabel,
  donutGradient,
  niceAxis,
  parseRange,
  rangeFor,
  rangeLabel,
  summarise,
  tickLabel,
  toSlices,
  weekBounds,
  weekLabel,
  weeklyPeriods,
  wholePercents,
} from "~/lib/domain/reports";
import { kampalaDate } from "~/lib/time";

describe("ranges", () => {
  it("runs Monday to Sunday and finds them from any day of the week", () => {
    for (const day of ["2026-10-05", "2026-10-08", "2026-10-11"]) {
      expect(weekBounds(day)).toEqual({ monday: "2026-10-05", sunday: "2026-10-11" });
    }
    // The next Monday starts a new week.
    expect(weekBounds("2026-10-12")).toEqual({ monday: "2026-10-12", sunday: "2026-10-18" });
  });

  it("crosses month and year ends", () => {
    expect(weekBounds("2026-09-30")).toEqual({ monday: "2026-09-28", sunday: "2026-10-04" });
    expect(weekBounds("2026-12-31")).toEqual({ monday: "2026-12-28", sunday: "2027-01-03" });
  });

  it("makes four weeks end on the Sunday of the current week", () => {
    expect(rangeFor("week", "2026-10-11")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(rangeFor("month", "2026-10-11")).toEqual({ from: "2026-09-14", to: "2026-10-11" });
    expect(rangeFor("month", "2026-10-07")).toEqual({ from: "2026-09-14", to: "2026-10-11" });
  });

  it("labels ranges like the mock-up", () => {
    expect(rangeLabel("2026-10-05", "2026-10-11")).toBe("5 to 11 October 2026");
    expect(rangeLabel("2026-09-14", "2026-10-11")).toBe("14 September to 11 October 2026");
    expect(rangeLabel("2026-12-28", "2027-01-03")).toBe("28 December to 3 January 2027");
  });

  it("labels days and weeks", () => {
    expect(dayLabel("2026-10-10")).toBe("Sat 10 Oct");
    expect(weekLabel("2026-10-05")).toBe("5–11 Oct");
    expect(weekLabel("2026-09-28")).toBe("28 Sep–4 Oct");
  });

  it("falls back to this week", () => {
    expect(parseRange("month")).toBe("month");
    expect(parseRange("week")).toBe("week");
    expect(parseRange("forever")).toBe("week");
    expect(parseRange(null)).toBe("week");
  });

  it("reads today in restaurant time, not UTC", () => {
    // 22:00 UTC is already the next day in Kampala.
    expect(kampalaDate(new Date("2026-10-10T22:00:00Z"))).toBe("2026-10-11");
    expect(kampalaDate(new Date("2026-10-10T20:00:00Z"))).toBe("2026-10-10");
  });
});

describe("periods and summary", () => {
  const days = [
    { sale_date: "2026-10-05", orders: 40, revenue: 1_240_000 },
    { sale_date: "2026-10-06", orders: 33, revenue: 980_000 },
    { sale_date: "2026-10-12", orders: 10, revenue: 500_000 },
    { sale_date: "2026-10-13", orders: 0, revenue: 0 },
  ];

  it("keeps days as they are", () => {
    const periods = dailyPeriods(days);
    expect(periods[0]).toMatchObject({ label: "Mon 5 Oct", axis: "Mon", orders: 40 });
    expect(periods).toHaveLength(4);
  });

  it("sums days into Monday-to-Sunday weeks", () => {
    const weeks = weeklyPeriods(days);
    expect(weeks).toEqual([
      { label: "5–11 Oct", axis: "5–11 Oct", orders: 73, revenue: 2_220_000 },
      { label: "12–18 Oct", axis: "12–18 Oct", orders: 10, revenue: 500_000 },
    ]);
  });

  it("summarises with a rounded average and the busiest period", () => {
    const summary = summarise(dailyPeriods(days));
    expect(summary).toEqual({
      revenue: 2_720_000,
      orders: 83,
      average: 32_771,
      best: "Mon 5 Oct",
    });
  });

  it("copes with a range that sold nothing", () => {
    const empty = summarise(dailyPeriods([{ sale_date: "2026-10-05", orders: 0, revenue: 0 }]));
    expect(empty).toEqual({ revenue: 0, orders: 0, average: 0, best: null });
  });

  it("matches the artboard's figures", () => {
    const week = [
      [1_240_000, 40],
      [980_000, 33],
      [1_115_000, 37],
      [1_360_000, 44],
      [1_985_000, 62],
      [2_410_000, 74],
      [1_730_000, 55],
    ].map(([revenue, orders], i) => ({
      sale_date: `2026-10-${String(5 + i).padStart(2, "0")}`,
      revenue,
      orders,
    }));
    const summary = summarise(dailyPeriods(week));
    expect(summary).toMatchObject({
      revenue: 10_820_000,
      orders: 345,
      average: 31_362,
      best: "Sat 10 Oct",
    });
  });
});

describe("chart axis", () => {
  it("chooses the artboard's scales", () => {
    expect(niceAxis(2_410_000)).toEqual({ axisMax: 2_500_000, step: 500_000 });
    expect(niceAxis(10_820_000)).toEqual({ axisMax: 12_000_000, step: 3_000_000 });
  });

  it("never needs more than five intervals and always covers the data", () => {
    for (const max of [1, 900, 45_000, 130_000, 777_777, 4_300_000, 96_000_000]) {
      const { axisMax, step } = niceAxis(max);
      expect(axisMax).toBeGreaterThanOrEqual(max);
      expect(axisMax / step).toBeLessThanOrEqual(5);
    }
  });

  it("has a default scale for an empty chart", () => {
    expect(niceAxis(0)).toEqual({ axisMax: 1_000_000, step: 250_000 });
  });

  it("writes tick and bar labels", () => {
    expect([0, 500_000, 1_000_000, 3_000_000, 50_000].map(tickLabel)).toEqual([
      "0",
      "0.5M",
      "1M",
      "3M",
      "50k",
    ]);
    expect([1_240_000, 980_000, 45_000, 0].map(compactUgx)).toEqual(["1.24M", "0.98M", "45k", "0"]);
  });
});

describe("payment method slices", () => {
  const rows: PaymentMethodRow[] = [
    { payment_method: "Cash", payments: 0, revenue: 4_436_200 },
    { payment_method: "MTN Mobile Money", payments: 0, revenue: 4_111_600 },
    { payment_method: "Airtel Money", payments: 0, revenue: 2_272_200 },
  ];

  it("adds whole percents up to exactly 100", () => {
    expect(wholePercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholePercents([4_436_200, 4_111_600, 2_272_200])).toEqual([41, 38, 21]);
    expect(wholePercents([0, 0])).toEqual([0, 0]);
    for (const values of [[1, 2, 3], [7, 7, 7, 7, 7, 7, 7], [99, 1], [1]]) {
      expect(wholePercents(values).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it("colours Cash forest and mobile money sage, as the mock-up", () => {
    const slices = toSlices(rows);
    expect(slices.map((s) => [s.name, s.percent, s.color])).toEqual([
      ["Cash", 41, "#18442a"],
      ["MTN Mobile Money", 38, "#8aa58f"],
      ["Airtel Money", 21, "#e4dbc4"],
    ]);
  });

  it("draws gaps between slices and survives a total of zero", () => {
    const gradient = donutGradient(toSlices(rows));
    expect(gradient.startsWith("conic-gradient(")).toBe(true);
    expect(gradient).toContain("#18442a 0.3% 40.7%");
    const none = toSlices(rows.map((r) => ({ ...r, revenue: 0 })));
    expect(none.map((s) => s.percent)).toEqual([0, 0, 0]);
    expect(donutGradient(none)).toBe("conic-gradient(#e4dbc4 0% 100%)");
  });
});
