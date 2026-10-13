import type { ChipTone } from "~/components/ui/Chip";
import type { MenuFeatures } from "~/lib/api/menu";
import type { MenuItem } from "~/lib/api/types";
import { categoryOf } from "./menu-categories";

/** "MI-001": the menu item id padded to three digits. */
export function menuItemNumber(id: number): string {
  return `MI-${String(id).padStart(3, "0")}`;
}

export type ItemStatus = "available" | "unavailable" | "archived";

/**
 * With an `archived` column (gap G6) the three states are separate. Without
 * it the API has one flag, and a hidden item is shown as Archived: that is
 * what the Archive button does, and it can be restored.
 */
export function itemStatus(item: MenuItem, features: MenuFeatures): ItemStatus {
  if (features.archived) {
    if (item.archived) return "archived";
    return item.availability_status ? "available" : "unavailable";
  }
  return item.availability_status ? "available" : "archived";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  available: "Available",
  unavailable: "Unavailable",
  archived: "Archived",
};

export const STATUS_TONE: Record<ItemStatus, ChipTone> = {
  available: "active",
  unavailable: "neutral",
  archived: "outline",
};

export interface MenuFilter {
  search: string;
  category: string;
  showArchived: boolean;
}

/** Search, category and archived filters, combined as in the mock-up. */
export function filterMenu(
  items: readonly MenuItem[],
  features: MenuFeatures,
  filter: MenuFilter,
): MenuItem[] {
  const query = filter.search.trim().toLowerCase();
  return items.filter((item) => {
    if (itemStatus(item, features) === "archived" && !filter.showArchived) return false;
    if (filter.category !== "All" && categoryOf(item) !== filter.category) return false;
    if (query && !item.item_name.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function archivedCount(items: readonly MenuItem[], features: MenuFeatures): number {
  return items.filter((item) => itemStatus(item, features) === "archived").length;
}
