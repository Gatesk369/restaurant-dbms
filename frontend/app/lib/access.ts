import type { IconName } from "~/components/ui/Icon";
import type { Role } from "./api/types";

export type ScreenKey = "orders" | "payments" | "menu" | "reports";

export interface Screen {
  key: ScreenKey;
  path: string;
  /** Sidebar tab label. */
  nav: string;
  /** Page title. */
  title: string;
  icon: IconName;
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
    subtitle:
      "Kitchen staff prepare orders and mark them ready; assigned wait staff deliver and mark them served.",
    roles: ["cashier", "wait_staff", "kitchen", "manager"],
  },
  {
    key: "payments",
    path: "/payments",
    nav: "Payments",
    title: "Payments",
    icon: "payments",
    subtitle: "Check out served orders with cash or mobile money.",
    roles: ["cashier", "manager"],
  },
  {
    key: "menu",
    path: "/menu",
    nav: "Menu",
    title: "Menu management",
    icon: "menu",
    subtitle: "Add, update, archive and search the food and drink items staff can order.",
    roles: ["manager"],
  },
  {
    key: "reports",
    path: "/reports",
    nav: "Reports",
    title: "Reports",
    icon: "reports",
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

/** Shared landing screen after sign-in, a root visit, or a forbidden URL. */
export function defaultScreenForRole(role: Role): Screen {
  const key = role === "cashier" ? "payments" : "orders";
  if (!canAccess(role, key)) throw new Error(`No permitted default screen for ${role}`);
  return getScreen(key);
}
