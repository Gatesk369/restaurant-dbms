import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ItemPopularityBars, unitAxis } from "~/components/charts/ItemPopularityBars";
import type { TopItemRow } from "~/lib/api/types";

const ROWS: TopItemRow[] = [
  { menu_item_id: 9, item_name: "African Tea", units_sold: 46, revenue: 138_000 },
  { menu_item_id: 8, item_name: "Beef Stew", units_sold: 43, revenue: 602_000 },
  { menu_item_id: 4, item_name: "Grilled Tilapia", units_sold: 28, revenue: 840_000 },
];

describe("unitAxis", () => {
  it("rounds up to at most five whole-number steps", () => {
    expect(unitAxis(3)).toEqual({ axisMax: 3, step: 1 });
    expect(unitAxis(7)).toEqual({ axisMax: 8, step: 2 });
    expect(unitAxis(46)).toEqual({ axisMax: 50, step: 10 });
    expect(unitAxis(120)).toEqual({ axisMax: 150, step: 50 });
  });

  it("keeps a visible axis when nothing sold", () => {
    expect(unitAxis(0)).toEqual({ axisMax: 5, step: 1 });
  });
});

describe("ItemPopularityBars", () => {
  it("describes every item and its count for screen readers", () => {
    render(<ItemPopularityBars rows={ROWS} />);
    expect(
      screen.getByRole("img", {
        name: "Bar chart of units sold per menu item: African Tea 46, Beef Stew 43, Grilled Tilapia 28",
      }),
    ).toBeInTheDocument();
  });

  it("draws one bar per item, scaled to the axis, with the best seller darker", () => {
    render(<ItemPopularityBars rows={ROWS} />);
    const tea = screen.getByTitle("African Tea: 46 sold, UGX 138,000");
    const stew = screen.getByTitle("Beef Stew: 43 sold, UGX 602,000");
    expect(tea).toHaveStyle({ height: "92%", background: "var(--color-forest)" }); // 46 / 50
    expect(stew).toHaveStyle({ height: "86%", background: "var(--color-moss)" });
    expect(screen.getByText("Grilled Tilapia")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("says so when nothing sold in the range", () => {
    render(<ItemPopularityBars rows={[]} />);
    expect(screen.getByText("No items sold in this range.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
