import { cx } from "~/lib/cx";
import { compactUgx, niceAxis, tickLabel, type Period } from "~/lib/domain/reports";
import { formatUgx } from "~/lib/money";

interface RevenueBarsProps {
  periods: readonly Period[];
}

const HEIGHT = "h-[220px]";

/**
 * Vertical bars built from divs, as in the mock-up: gridlines and tick labels
 * on a round axis, a value above every bar, the tallest bar darker. The
 * figures are repeated in the sales table, so the picture is decoration.
 */
export function RevenueBars({ periods }: RevenueBarsProps) {
  const max = Math.max(0, ...periods.map((p) => p.revenue));
  const { axisMax, step } = niceAxis(max);
  const ticks: number[] = [];
  for (let value = 0; value <= axisMax; value += step) ticks.push(value);

  // Only the first of equal maxima is dark, and an empty chart has no peak.
  const peak = max > 0 ? periods.findIndex((p) => p.revenue === max) : -1;

  return (
    <div
      role="img"
      aria-label="Bar chart of revenue. The figures are in the sales table below."
      className="flex gap-2 pt-6"
    >
      <div className={cx("relative w-11 flex-none", HEIGHT)}>
        {ticks.map((value) => (
          <span
            key={value}
            className="absolute right-0 text-label tracking-caption text-moss tabular-nums"
            // `transform`, not Tailwind's `translate`: the individual property
            // makes the browser fall back to grayscale text smoothing.
            style={{ bottom: `${(value / axisMax) * 100}%`, transform: "translateY(50%)" }}
          >
            {tickLabel(value)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-auto">
        {/* 220px of plot plus the 1px axis line, as in the mock-up (content-box). */}
        <div className={cx("relative box-content border-b border-moss", HEIGHT)}>
          {ticks.map((value) => (
            <div
              key={value}
              className="absolute inset-x-0 border-t border-tea"
              style={{ bottom: `${(value / axisMax) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 box-border flex gap-3 px-2">
            {periods.map((period, i) => (
              <div
                key={period.label}
                className="flex h-full min-w-0 flex-[1_1_0] items-end justify-center"
              >
                <div
                  title={`${period.label}: ${formatUgx(period.revenue)}, ${period.orders} orders`}
                  className="relative w-full max-w-[56px] rounded-t-chip hover:brightness-125"
                  style={{
                    height: `${(period.revenue / axisMax) * 100}%`,
                    background: i === peak ? "var(--color-forest)" : "var(--color-moss)",
                  }}
                >
                  <span
                    className="absolute bottom-full left-1/2 pb-0.5 text-label font-bold tracking-micro whitespace-nowrap text-forest tabular-nums"
                    style={{ transform: "translateX(-50%)" }}
                  >
                    {compactUgx(period.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="box-border flex gap-3 px-2 pt-2">
          {periods.map((period) => (
            <div
              key={period.label}
              className="min-w-0 flex-[1_1_0] text-center text-label tracking-caption"
            >
              {period.axis}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
