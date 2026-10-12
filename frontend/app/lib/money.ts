/**
 * Money is whole Ugandan shillings. DRF returns DECIMAL columns as strings
 * ("18000.00"); convert once at the API boundary and never sum floats.
 */

export function parseUgx(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new TypeError(`Not a money amount: ${String(value)}`);
  }
  return Math.round(n);
}

/** "UGX 18,000" (en-US grouping, no decimals). */
export function formatUgx(amount: number): string {
  return `UGX ${amount.toLocaleString("en-US")}`;
}

/** "18,000", for cells that already sit under a UGX heading. */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}
