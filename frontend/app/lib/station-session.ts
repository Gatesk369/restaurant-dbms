import type { PayChoice, StationScreen } from "./domain/station";

/**
 * What the station keeps across a refresh: the screen, the table, the cart and
 * the choices made so far. Per tab (sessionStorage), never sent anywhere.
 */
export interface StationDraft {
  screen: StationScreen;
  table: number | null;
  guestName: string;
  category: string;
  lines: { menu_item_id: number; quantity: number }[];
  notes: string;
  pay: PayChoice;
  network: string;
  phone: string;
  /** Set once the order was sent. */
  orderId: number | null;
}

const KEY = "rdbms.station";

export const EMPTY_DRAFT: StationDraft = {
  screen: "start",
  table: null,
  guestName: "",
  category: "Mains",
  lines: [],
  notes: "",
  pay: "till",
  network: "MTN Mobile Money",
  phone: "",
  orderId: null,
};

export function loadDraft(): StationDraft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return EMPTY_DRAFT;
    const data = JSON.parse(raw) as Partial<StationDraft>;
    const screens: StationScreen[] = ["start", "menu", "review", "done"];
    if (!data.screen || !screens.includes(data.screen)) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...data };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: StationDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable: a refresh will start over.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
