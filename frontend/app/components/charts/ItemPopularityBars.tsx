import type { TopItemRow } from "~/lib/api/types";
import { cx } from "~/lib/cx";
import { formatAmount, formatUgx } from "~/lib/money";

interface ItemPopularityBarsProps {
  rows: readonly TopItemRow[];
}

const HEIGHT = "h-[180px]";

/**
 * A round axis for counts: at most five steps of 1, 2 or 5 times a power of
 * ten. `niceAxis` starts at hundreds because it is meant for UGX amounts.
 */
export function unitAxis(max: number): { axisMax: number; step: number } {
  if (max <= 0) return { axisMax: 5, step: 1 };
  for (let exp = 0; ; exp++) {
    for (const base of [1, 2, 5]) {
      const step = base * 10 ** exp;
      const intervals = Math.ceil(max / step);
      if (intervals <= 5) return { axisMax: intervals * step, step };
    }
  }
}

/**
 * Units sold per menu item as vertical bars, drawn the same way as
 * RevenueBars: the best seller is darker and every bar carries its count.
 * The figures are repeated in the top-selling table.
 */
export function ItemPopularityBars({ rows }: ItemPopularityBarsProps) {
  if (rows.length === 0) {
    return <p className="m-0 text-body text-moss">No items sold in this range.</p>;
  }

  const max = Math.max(0, ...rows.map((r) => r.units_sold));
  const { axisMax, step } = unitAxis(max);
  const ticks: number[] = [];
  for (let value = 0; value <= axisMax; value += step) ticks.push(value);

  // The rows arrive ranked, so the first one is the best seller.
  const label = `Bar chart of units sold per menu item: ${rows
    .map((r) => `${r.item_name} ${r.units_sold}`)
    .join(", ")}`;

  return (
    <div role="img" aria-label={label} className="flex gap-2 pt-6">
      <div className={cx("relative w-8 flex-none", HEIGHT)}>
        {ticks.map((value) => (
          <span
            key={value}
            className="absolute right-0 text-label tracking-caption text-moss tabular-nums"
            style={{ bottom: `${(value / axisMax) * 100}%`, transform: "translateY(50%)" }}
          >
            {value}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-auto">
        <div className={cx("relative box-content border-b border-moss", HEIGHT)}>
          {ticks.map((value) => (
            <div
              key={value}
              className="absolute inset-x-0 border-t border-tea"
              style={{ bottom: `${(value / axisMax) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 box-border flex gap-3 px-2">
            {rows.map((row, i) => (
              <div
                key={row.menu_item_id}
                className="flex h-full min-w-0 flex-[1_1_0] items-end justify-center"
              >
                <div
                  title={`${row.item_name}: ${formatAmount(row.units_sold)} sold, ${formatUgx(row.revenue)}`}
                  className="relative w-full max-w-[56px] rounded-t-chip hover:brightness-125"
                  style={{
                    height: `${(row.units_sold / axisMax) * 100}%`,
                    background: i === 0 ? "var(--color-forest)" : "var(--color-moss)",
                  }}
                >
                  <span
                    className="absolute bottom-full left-1/2 pb-0.5 text-label font-bold tracking-micro whitespace-nowrap text-forest tabular-nums"
                    style={{ transform: "translateX(-50%)" }}
                  >
                    {formatAmount(row.units_sold)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="box-border flex gap-3 px-2 pt-2">
          {rows.map((row) => (
            <div
              key={row.menu_item_id}
              title={row.item_name}
              className="min-w-0 flex-[1_1_0] truncate text-center text-label tracking-caption"
            >
              {row.item_name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
