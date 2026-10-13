/** Client-side rules, ported from the mock-ups. The database re-checks them. */

export const CREDENTIALS_ERROR =
  "Error: enter your username and a password of at least 4 characters.";

/** Sign-in: a username and a password of at least 4 characters. */
export function canSignIn(username: string, password: string): boolean {
  return username.trim() !== "" && password.length >= 4;
}

/** Ugandan mobile number: ten digits starting 07, spaces allowed. */
export function isValidPhone(value: string): boolean {
  return /^07\d{8}$/.test(value.replace(/\s+/g, ""));
}

export const PHONE_ERROR = "Error: enter a 10-digit number that starts with 07.";

/** Digits typed into "Amount received" as whole shillings (blank is 0). */
export function parseTendered(value: string): number {
  return Number.parseInt(value || "0", 10) || 0;
}

/** How far a cash amount falls short of the total (0 when it covers it). */
export function cashShortfall(received: number, total: number): number {
  return Math.max(total - received, 0);
}

export function changeDue(received: number, total: number): number {
  return Math.max(received - total, 0);
}

export function shortfallMessage(shortfall: number): string {
  return `Error: UGX ${shortfall.toLocaleString("en-US")} short of the total. Ask for the full amount.`;
}

/** Quick amounts under "Amount received": the exact total and two notes. */
export function quickAmounts(total: number): { label: string; value: number }[] {
  return [
    { label: "Exact amount", value: total },
    { label: "UGX 50,000", value: 50000 },
    { label: "UGX 100,000", value: 100000 },
  ];
}
