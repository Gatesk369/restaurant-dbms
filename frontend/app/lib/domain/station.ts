import { MENU_CATEGORIES, type MenuCategory, type OrderStatus } from "~/lib/api/types";

export const STATION_CATEGORIES: readonly MenuCategory[] = MENU_CATEGORIES;

export const STATION_STEPS = ["Table", "Menu", "Review", "Done"] as const;

export type StationScreen = "start" | "menu" | "review" | "done";

export const SCREEN_INDEX: Record<StationScreen, number> = {
  start: 0,
  menu: 1,
  review: 2,
  done: 3,
};

export type PayChoice = "till" | "momo";

/**
 * The tracker has three rows: Pending, Preparing, Served. The kitchen's
 * statuses map onto them (plan D6); a cancelled order has no row.
 */
export function trackerStep(status: OrderStatus): 0 | 1 | 2 | null {
  switch (status) {
    case "pending":
    case "confirmed":
      return 0;
    case "preparing":
    case "ready":
      return 1;
    case "served":
      return 2;
    default:
      return null;
  }
}

export const TRACKER = [
  { label: "Pending", hint: "The kitchen has your order" },
  { label: "Preparing", hint: "Your food is being cooked" },
  { label: "Served", hint: "A waiter has brought it to your table" },
] as const;

/** Initials for the placeholder plate: "Matoke & Beef Stew" is "MB". */
export function initials(name: string): string {
  return name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * The card image until a photo URL is set (gap G7): a plate with initials,
 * exactly the mock-up's generated SVG.
 */
export function placeholderImage(name: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="96" viewBox="0 0 240 96">' +
    '<rect width="240" height="96" fill="#f0e9dd"/>' +
    '<circle cx="120" cy="48" r="38" fill="#e4dbc4" stroke="#45644a" stroke-width="2"/>' +
    '<circle cx="120" cy="48" r="26" fill="none" stroke="#45644a" stroke-width="1" opacity=".5"/>' +
    '<text x="120" y="56" text-anchor="middle" font-family="Lato,sans-serif" font-size="24" font-weight="700" fill="#18442a">' +
    initials(name) +
    "</text></svg>";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** "Table 6" or "Table 6 · Atim" (the name stays on this device, gap G4). */
export function orderFor(table: number | null, guestName: string): string {
  const label = table ? `Table ${table}` : "No table chosen";
  const name = guestName.trim();
  return name ? `${label} · ${name}` : label;
}

export function payNote(
  pay: PayChoice,
  orderNo: string,
  totalText: string,
  phone: string,
  network: string,
): string {
  return pay === "till"
    ? `Pay at the till when you are ready. Quote ${orderNo} to the cashier.`
    : `A payment request for ${totalText} was sent to ${phone.trim() || "your phone"} on ${network}. Approve it on your phone.`;
}
