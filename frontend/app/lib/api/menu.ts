import { parseUgx } from "../money";
import { categoryOf } from "../domain/menu-categories";
import { request } from "./client";
import type { MenuItem } from "./types";

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
