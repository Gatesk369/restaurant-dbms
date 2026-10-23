import type { IconName } from "~/components/ui/Icon";
import type { Role } from "./api/types";

export type ScreenKey = "orders" | "payments" | "menu" | "reports";

export interface Screen {
  key: ScreenKey;
  path: string;
  /** Sidebar tab label. */
  nav: string;
  /** Startup tile and page title. */
  title: string;
  icon: IconName;
  /** Startup tile description, verbatim from the mock-up. */
  description: string;
  /** Page subtitle, verbatim from the mock-up. */
  subtitle: string;
  roles: readonly Role[];
}

/**
 * Screens in sidebar order, and who may use them (design document, "Users and
 * roles"). The API enforces the same rules; this only decides what the UI
 * offers; hidden navigation never replaces API authorization.
 */
export const SCREENS: readonly Screen[] = [
  {
    key: "orders",
    path: "/orders",
    nav: "Orders",
    title: "Orders",
    icon: "orders",
    description: "Create orders and follow them from pending to served.",
    subtitle: "Open an order for a table, add items, then send it to the kitchen.",
    roles: ["cashier", "wait_staff", "kitchen", "manager"],
  },
  {
    key: "payments",
    path: "/payments",
    nav: "Payments",
    title: "Payments",
    icon: "payments",
    description: "Check out served orders with cash or mobile money.",
    subtitle: "Check out served orders with cash or mobile money.",
    roles: ["cashier", "manager"],
  },
  {
    key: "menu",
    path: "/menu",
    nav: "Menu",
    title: "Menu management",
    icon: "menu",
    description: "Add, update, archive and search food and drink items.",
    subtitle: "Add, update, archive and search the food and drink items staff can order.",
    roles: ["manager"],
  },
  {
    key: "reports",
    path: "/reports",
    nav: "Reports",
    title: "Reports",
    icon: "reports",
    description: "Daily sales, top items, waiter performance and table turnover.",
    // The mock-up prints the selected date range here; Phase 5 supplies it.
    subtitle: "",
    roles: ["manager"],
  },
];

export function getScreen(key: ScreenKey): Screen {
  const screen = SCREENS.find((s) => s.key === key);
  if (!screen) throw new Error(`Unknown screen: ${key}`);
  return screen;
}

export function canAccess(role: Role, key: ScreenKey): boolean {
  return getScreen(key).roles.includes(role);
}

/** Destinations available to the authenticated role, in navigation order. */
export function screensForRole(role: Role): readonly Screen[] {
  return SCREENS.filter((screen) => canAccess(role, screen.key));
}
