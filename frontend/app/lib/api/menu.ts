import { parseUgx } from "../money";
import { categoryOf } from "../domain/menu-categories";
import { request } from "./client";
import type { MenuCategory, MenuItem } from "./types";

interface WireMenuItem {
  menu_item_id: number;
  item_name: string;
  description: string | null;
  price: string | number;
  availability_status: boolean;
  category?: MenuItem["category"];
  archived?: boolean;
  image_url?: string | null;
}

export function toMenuItem(wire: WireMenuItem): MenuItem {
  const item: MenuItem = {
    menu_item_id: wire.menu_item_id,
    item_name: wire.item_name,
    description: wire.description ?? null,
    price: parseUgx(wire.price),
    availability_status: wire.availability_status,
    archived: wire.archived,
    image_url: wire.image_url ?? null,
  };
  // The API's category wins; until it exists the interim lookup fills in.
  item.category = categoryOf({ item_name: item.item_name, category: wire.category }) ?? undefined;
  return item;
}

/** Items staff can order: available by default, `all` includes unavailable ones. */
export async function listStaffMenu(
  options: { all?: boolean; search?: string } = {},
): Promise<MenuItem[]> {
  const rows = await request<WireMenuItem[]>("/api/staff/menu/", {
    query: { include_unavailable: options.all ? "1" : undefined, search: options.search },
  });
  return rows.map(toMenuItem);
}

/** What this API version stores for a menu item (gaps G5, G6, G7). */
export interface MenuFeatures {
  /** Rows carry `category`, so it can be saved. */
  category: boolean;
  /** Rows carry `archived`, so Unavailable and Archived are different. */
  archived: boolean;
}

export interface StaffMenu {
  items: MenuItem[];
  features: MenuFeatures;
}

/**
 * Every item for the Menu management screen, with what the API supports.
 * Features are read from the rows themselves, so they switch on by themselves
 * when the backend adds the columns (issue #13).
 */
export async function loadStaffMenu(): Promise<StaffMenu> {
  const rows = await request<WireMenuItem[]>("/api/staff/menu/", {
    query: { include_unavailable: "1" },
  });
  return {
    items: rows.map(toMenuItem),
    features: {
      category: rows.some((row) => row.category !== undefined),
      archived: rows.some((row) => row.archived !== undefined),
    },
  };
}

export interface MenuItemInput {
  item_name: string;
  price: number;
  availability_status: boolean;
  /** Ignored by the API until it stores categories (gap G5). */
  category?: MenuCategory;
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  return toMenuItem(
    await request<WireMenuItem>("/api/staff/menu/", { method: "POST", body: input }),
  );
}

export async function updateMenuItem(id: number, patch: Partial<MenuItemInput>): Promise<MenuItem> {
  return toMenuItem(
    await request<WireMenuItem>(`/api/staff/menu/${id}/`, { method: "PATCH", body: patch }),
  );
}

/**
 * Archive: a soft delete, so past orders keep the item. Today the API stores
 * this as `availability_status = false`; with an `archived` column (gap G6) it
 * sets that instead.
 */
export async function archiveMenuItem(id: number): Promise<MenuItem> {
  return toMenuItem(await request<WireMenuItem>(`/api/staff/menu/${id}/`, { method: "DELETE" }));
}

/** Put an archived item back on the menu. */
export async function restoreMenuItem(id: number, features: MenuFeatures): Promise<MenuItem> {
  const patch = features.archived
    ? { archived: false, availability_status: true }
    : { availability_status: true };
  return toMenuItem(
    await request<WireMenuItem>(`/api/staff/menu/${id}/`, { method: "PATCH", body: patch }),
  );
}
