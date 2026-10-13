import { MENU_CATEGORIES, type MenuCategory, type MenuItem } from "~/lib/api/types";

/**
 * Interim lookup for gap G5: the backend has no category column yet. Keyed by
 * lower-case item name for the mock-up menu and the development seed. Delete
 * this file when `menu_items.category` is served (issue #13).
 */
const FALLBACK: Record<string, MenuCategory> = {
  // Mock-up menu
  "matoke & beef stew": "Mains",
  "chicken luwombo": "Mains",
  "fried tilapia & chips": "Mains",
  "pilau beef": "Mains",
  "grilled goat ribs": "Mains",
  rolex: "Snacks",
  "samosas (2)": "Snacks",
  kikomando: "Snacks",
  chapati: "Sides",
  "steamed rice": "Sides",
  "kachumbari salad": "Sides",
  "passion juice": "Drinks",
  "mango juice": "Drinks",
  "soda 300ml": "Drinks",
  "mineral water 500ml": "Drinks",
  "ugandan tea": "Drinks",
  "banana fritters": "Desserts",
  "fruit platter": "Desserts",
  // Development seed (seed.sql)
  "chicken rolex": "Snacks",
  "beef samosa": "Snacks",
  "vegetable samosa": "Snacks",
  "beef luwombo": "Mains",
  "grilled tilapia": "Mains",
  "matooke and groundnut sauce": "Mains",
  "beef stew and rice": "Mains",
  "chicken pilau": "Mains",
  "vegetable pilau": "Mains",
  "chips and chicken": "Mains",
  katogo: "Mains",
  "fresh passion juice": "Drinks",
  "fresh mango juice": "Drinks",
  soda: "Drinks",
  "mineral water": "Drinks",
  "black tea": "Drinks",
  "african coffee": "Drinks",
};

/** The API's category when present, otherwise the interim lookup, otherwise none. */
export function categoryOf(item: Pick<MenuItem, "item_name" | "category">): MenuCategory | null {
  return item.category ?? FALLBACK[item.item_name.trim().toLowerCase()] ?? null;
}

/** Categories that have at least one item, in the canonical order. */
export function categoriesPresent(items: readonly Pick<MenuItem, "item_name" | "category">[]) {
  const present = new Set(items.map(categoryOf));
  return MENU_CATEGORIES.filter((c) => present.has(c));
}
