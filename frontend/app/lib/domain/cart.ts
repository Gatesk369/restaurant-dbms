export interface CartLine {
  menu_item_id: number;
  quantity: number;
}

/** One more of an item: appends the line or bumps its quantity. */
export function addToCart(lines: readonly CartLine[], menuItemId: number): CartLine[] {
  const found = lines.some((l) => l.menu_item_id === menuItemId);
  if (!found) return [...lines, { menu_item_id: menuItemId, quantity: 1 }];
  return lines.map((l) => (l.menu_item_id === menuItemId ? { ...l, quantity: l.quantity + 1 } : l));
}

/** Stepper change; a line that reaches zero is removed. */
export function changeQuantity(
  lines: readonly CartLine[],
  menuItemId: number,
  delta: number,
): CartLine[] {
  return lines
    .map((l) => (l.menu_item_id === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
    .filter((l) => l.quantity > 0);
}

export function quantityOf(lines: readonly CartLine[], menuItemId: number): number {
  return lines.find((l) => l.menu_item_id === menuItemId)?.quantity ?? 0;
}

export function cartTotal(
  lines: readonly CartLine[],
  priceOf: (menuItemId: number) => number,
): number {
  return lines.reduce((sum, l) => sum + l.quantity * priceOf(l.menu_item_id), 0);
}
