import type { PaymentMethodRow } from "~/lib/api/types";

export type RangeKey = "week" | "month";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "Last 4 weeks" },
];

export function parseRange(value: string | null): RangeKey {
  return value === "month" ? "month" : "week";
}

// --- Dates: plain YYYY-MM-DD strings, handled in UTC so no zone can shift them.

const DAY = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parse(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function format(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function parts(date: string) {
  const ms = parse(date);
  const d = new Date(ms);
  return {
    ms,
    day: d.getUTCDate(),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    weekday: d.getUTCDay(),
  };
}

/** Monday and Sunday of the week containing `date`. */
export function weekBounds(date: string): { monday: string; sunday: string } {
  const { ms, weekday } = parts(date);
  const monday = ms - ((weekday + 6) % 7) * DAY;
  return { monday: format(monday), sunday: format(monday + 6 * DAY) };
}

/**
 * This week is Monday to Sunday (days after today count as zero); the longer
 * range is the four weeks ending that Sunday.
 */
export function rangeFor(key: RangeKey, today: string): { from: string; to: string } {
  const { monday, sunday } = weekBounds(today);
  return key === "week"
    ? { from: monday, to: sunday }
    : { from: format(parse(monday) - 21 * DAY), to: sunday };
}

/** "5 to 11 October 2026" or "14 September to 11 October 2026". */
export function rangeLabel(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  const left =
    a.month === b.month && a.year === b.year ? `${a.day}` : `${a.day} ${MONTHS_LONG[a.month]}`;
  return `${left} to ${b.day} ${MONTHS_LONG[b.month]} ${b.year}`;
}

/** "Mon 5 Oct". */
export function dayLabel(date: string): string {
  const p = parts(date);
  return `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS_SHORT[p.month]}`;
}

/** "5–11 Oct" or "28 Sep–4 Oct" for the week starting on `monday`. */
export function weekLabel(monday: string): string {
  const a = parts(monday);
  const b = parts(format(a.ms + 6 * DAY));
  return a.month === b.month
    ? `${a.day}–${b.day} ${MONTHS_SHORT[a.month]}`
    : `${a.day} ${MONTHS_SHORT[a.month]}–${b.day} ${MONTHS_SHORT[b.month]}`;
}

// --- Series for the chart and the sales table.

export interface DailyInput {
  sale_date: string;
  orders: number;
  revenue: number;
}

export interface Period {
  /** Full label for tooltips and the sales table: "Sat 10 Oct", "5–11 Oct". */
  label: string;
  /** Short label under the bar: "Sat", "5–11 Oct". */
  axis: string;
  orders: number;
  revenue: number;
}

export function dailyPeriods(rows: readonly DailyInput[]): Period[] {
  return rows.map((row) => ({
    label: dayLabel(row.sale_date),
    axis: WEEKDAYS[parts(row.sale_date).weekday],
    orders: row.orders,
    revenue: row.revenue,
  }));
}

/** Sums daily rows into Monday-to-Sunday weeks, in order. */
export function weeklyPeriods(rows: readonly DailyInput[]): Period[] {
  const weeks = new Map<string, Period>();
  for (const row of rows) {
    const monday = weekBounds(row.sale_date).monday;
    const label = weekLabel(monday);
    const week = weeks.get(monday) ?? { label, axis: label, orders: 0, revenue: 0 };
    week.orders += row.orders;
    week.revenue += row.revenue;
    weeks.set(monday, week);
  }
  return [...weeks.values()];
}

export interface Summary {
  revenue: number;
  orders: number;
  average: number;
  /** Label of the period with the most revenue, or null when nothing sold. */
  best: string | null;
}

export function summarise(periods: readonly Period[]): Summary {
  const revenue = periods.reduce((sum, p) => sum + p.revenue, 0);
  const orders = periods.reduce((sum, p) => sum + p.orders, 0);
  let best: Period | null = null;
  for (const p of periods) {
    if (p.revenue > 0 && (best === null || p.revenue > best.revenue)) best = p;
  }
  return {
    revenue,
    orders,
    average: orders > 0 ? Math.round(revenue / orders) : 0,
    best: best?.label ?? null,
  };
}

// --- Chart scale.

/**
 * A round axis with at most five intervals: steps of 1, 2, 3 or 5 times a
 * power of ten, the smallest that covers the largest value.
 */
export function niceAxis(max: number): { axisMax: number; step: number } {
  if (max <= 0) return { axisMax: 1_000_000, step: 250_000 };
  for (let exp = 2; exp <= 12; exp++) {
    for (const base of [1, 2, 3, 5]) {
      const step = base * 10 ** exp;
      const intervals = Math.ceil(max / step);
      if (intervals <= 5) return { axisMax: intervals * step, step };
    }
  }
  return { axisMax: max, step: max };
}

/** "0", "0.5M", "3M", "50k". */
export function tickLabel(value: number): string {
  if (value === 0) return "0";
  if (value >= 100_000) return `${value / 1_000_000}M`;
  return `${value / 1000}k`;
}

/** Value printed above a bar and in the donut: "1.24M", "0.98M", "45k", "0". */
export function compactUgx(value: number): string {
  if (value >= 100_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

// --- Payment methods.

export interface Slice {
  name: string;
  amount: number;
  /** Whole percent; the slices of one donut add up to 100. */
  percent: number;
  /** Exact share, 0 to 100, for drawing. */
  share: number;
  color: string;
}

/** Whole percents that add up to 100 (largest remainder). */
export function wholePercents(values: readonly number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, rest: x - Math.floor(x) }))
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

const SLICE_COLORS: Record<string, string> = {
  Cash: "#18442a",
  "MTN Mobile Money": "#8aa58f",
  "Mobile Money": "#8aa58f",
  "Airtel Money": "#e4dbc4",
};

export function toSlices(rows: readonly PaymentMethodRow[]): Slice[] {
  const total = rows.reduce((sum, r) => sum + r.revenue, 0);
  const percents = wholePercents(rows.map((r) => r.revenue));
  return rows.map((row, i) => ({
    name: row.payment_method,
    amount: row.revenue,
    percent: percents[i],
    share: total > 0 ? (row.revenue / total) * 100 : 0,
    color: SLICE_COLORS[row.payment_method] ?? "#45644a",
  }));
}

/** conic-gradient with thin page-coloured gaps between slices, as the mock-up. */
export function donutGradient(slices: readonly Slice[]): string {
  const gap = 0.6;
  const page = "#f3ede3";
  if (slices.every((s) => s.share === 0)) return `conic-gradient(#e4dbc4 0% 100%)`;
  const stops: string[] = [];
  let at = 0;
  for (const slice of slices) {
    const start = at;
    const end = at + slice.share;
    stops.push(`${page} ${start}% ${start + gap / 2}%`);
    stops.push(`${slice.color} ${start + gap / 2}% ${end - gap / 2}%`);
    stops.push(`${page} ${end - gap / 2}% ${end}%`);
    at = end;
  }
  return `conic-gradient(${stops.join(", ")})`;
}
