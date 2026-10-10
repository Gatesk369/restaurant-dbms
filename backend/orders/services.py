from decimal import Decimal

from db_access import fetch_all, fetch_one
from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from orders.models import Order, OrderItem

MAX_LINES = 30
MAX_QUANTITY = 50
INT_MAX = 2**31 - 1
ORDER_COLUMNS = "order_id, table_id, order_status, order_time"


def _clean_items(raw_items):
    """Validate and whitelist the cart. Only these three fields ever reach SQL."""
    if not isinstance(raw_items, list) or not raw_items:
        raise ValidationError({"items": "Add at least one item."})
    if len(raw_items) > MAX_LINES:
        raise ValidationError({"items": f"Too many items (max {MAX_LINES})."})

    cleaned = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            raise ValidationError({"items": "Each item must be an object."})
        try:
            menu_item_id = int(raw.get("menu_item_id"))
            quantity = int(raw.get("quantity"))
        except (TypeError, ValueError):
            raise ValidationError(
                {"items": "menu_item_id and quantity must be whole numbers."}
            )
        if not 0 < menu_item_id <= INT_MAX:
            raise ValidationError({"items": f"Unknown menu item: {menu_item_id}"})
        if not 1 <= quantity <= MAX_QUANTITY:
            raise ValidationError(
                {"items": f"Quantity must be between 1 and {MAX_QUANTITY}."}
            )
        note = raw.get("special_instructions")
        note = str(note).strip()[:255] if note else None
        cleaned.append(
            {
                "menu_item_id": menu_item_id,
                "quantity": quantity,
                "special_instructions": note or None,
            }
        )
    return cleaned


def _check_menu(cleaned):
    ids = list({line["menu_item_id"] for line in cleaned})
    rows = fetch_all(
        "SELECT menu_item_id, item_name, availability_status FROM menu_items "
        "WHERE menu_item_id = ANY(%s)",
        (ids,),
    )
    known = {row["menu_item_id"] for row in rows}
    missing = [i for i in ids if i not in known]
    if missing:
        raise ValidationError({"items": f"Unknown menu item(s): {missing}"})
    unavailable = [row["item_name"] for row in rows if not row["availability_status"]]
    if unavailable:
        raise ValidationError(
            {"items": f"Not available right now: {', '.join(unavailable)}"}
        )


def _with_items(orders):
    """Attach line items and a total to each order dict (two queries total, not N+1)."""
    if not orders:
        return orders
    ids = [order["order_id"] for order in orders]
    items = fetch_all(
        """SELECT oi.order_item_id, oi.order_id, oi.menu_item_id, mi.item_name,
                  mi.price AS unit_price, oi.quantity, oi.item_subtotal,
                  oi.special_instructions
             FROM order_items AS oi
             JOIN menu_items AS mi ON mi.menu_item_id = oi.menu_item_id
            WHERE oi.order_id = ANY(%s)
            ORDER BY oi.order_item_id""",
        (ids,),
    )
    by_order = {}
    for item in items:
        by_order.setdefault(item["order_id"], []).append(item)
    for order in orders:
        order["items"] = by_order.get(order["order_id"], [])
        order["total"] = sum((i["item_subtotal"] for i in order["items"]), Decimal(0))
    return orders


def get_customer_orders(customer_id):
    rows = fetch_all(
        f"SELECT {ORDER_COLUMNS} FROM orders WHERE customer_id = %s ORDER BY order_time DESC",
        (customer_id,),
    )
    return _with_items(rows)


def get_customer_order(customer_id, order_id):
    row = fetch_one(
        f"SELECT {ORDER_COLUMNS} FROM orders WHERE order_id = %s AND customer_id = %s",
        (order_id, customer_id),
    )
    if row is None:
        raise NotFound("Order not found.")
    return _with_items([row])[0]


def place_order(customer, raw_items):
    if customer.table_id is None:
        raise ValidationError(
            {"detail": "Your session has no table. Enter your table number again."}
        )
    cleaned = _clean_items(raw_items)
    _check_menu(cleaned)

    # table comes from the customer's session, never from the request body
    with transaction.atomic():
        order = Order.create(
            customer_id=customer.customer_id, table_id=customer.table_id
        )
        for line in cleaned:
            OrderItem.create(order_id=order["order_id"], **line)
    return get_customer_order(customer.customer_id, order["order_id"])


def cancel_customer_order(customer_id, order_id):
    with transaction.atomic():
        row = fetch_one(
            "SELECT order_status FROM orders WHERE order_id = %s AND customer_id = %s FOR UPDATE",
            (order_id, customer_id),
        )
        if row is None:
            raise NotFound("Order not found.")
        if row["order_status"] not in ("pending", "confirmed"):
            raise ValidationError({"detail": "This order can no longer be cancelled."})
        Order.update(order_id, order_status="cancelled")
    return get_customer_order(customer_id, order_id)
