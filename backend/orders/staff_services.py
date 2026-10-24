from db_access import fetch_all, fetch_one
from django.db import transaction
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from orders.models import Order
from orders.services import _with_items

STATUSES = {"pending", "confirmed", "preparing", "ready", "served", "cancelled"}
OPEN = ("confirmed", "preparing", "ready")
NEXT_STATUS = {"confirmed": "preparing", "preparing": "ready", "ready": "served"}

BASE = """SELECT o.order_id, o.table_id, o.order_status, o.order_time,
                 o.staff_id, s.username AS waiter,
                 EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id) AS paid
            FROM orders o LEFT JOIN staff s ON s.staff_id = o.staff_id"""


def order_detail(order_id):
    row = fetch_one(BASE + " WHERE o.order_id = %s", (order_id,))
    return _with_items([row])[0]


def order_queue(user, statuses=None):
    wanted = [s for s in (statuses or []) if s in STATUSES]
    clauses, params = [], []

    if user.role == "kitchen":
        wanted = [s for s in (wanted or OPEN) if s in OPEN]
        if not wanted:
            return []
        clauses.append("o.order_status = ANY(%s)")
        params.append(wanted)
    elif user.role == "wait_staff":
        clauses.append("o.staff_id = %s")
        params.append(user.staff_id)
        clauses.append("o.order_status = ANY(%s)")
        params.append(wanted or list(OPEN))
    elif user.role == "cashier":  # orders waiting to be paid
        clauses.append("o.order_status = 'served'")
        clauses.append(
            "NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id)"
        )
    elif wanted:  # manager: everything unless filtered
        clauses.append("o.order_status = ANY(%s)")
        params.append(wanted)

    sql = BASE + (" WHERE " + " AND ".join(clauses) if clauses else "")
    sql += " ORDER BY o.order_time, o.order_id LIMIT 200"
    return _with_items(fetch_all(sql, tuple(params)))


def change_status(user, order_id, new_status):
    if new_status not in STATUSES:
        raise ValidationError({"status": "Unknown status."})

    with transaction.atomic():
        row = fetch_one(
            "SELECT order_status, staff_id FROM orders WHERE order_id = %s FOR UPDATE",
            (order_id,),
        )
        if row is None:
            raise NotFound("Order not found.")
        # Reject another waiter's order before validating its current state.
        if user.role == "wait_staff" and row["staff_id"] != user.staff_id:
            raise PermissionDenied("That order is not assigned to you.")
        current = row["order_status"]

        if new_status == "cancelled":
            if user.role != "manager":
                raise PermissionDenied("Only a manager can cancel an order.")
            if current in ("served", "cancelled"):
                raise ValidationError(
                    {"status": f"A {current} order can't be cancelled."}
                )
        else:
            if NEXT_STATUS.get(current) != new_status:
                raise ValidationError(
                    {"status": f"Can't move an order from {current} to {new_status}."}
                )
            serves_own = (
                new_status == "served"
                and user.role == "wait_staff"
                and row["staff_id"] == user.staff_id
            )
            prepares = user.role == "kitchen" and new_status in ("preparing", "ready")
            if user.role != "manager" and not prepares and not serves_own:
                raise PermissionDenied("Your role can't make that change.")

        Order.update(order_id, order_status=new_status)
    return order_detail(order_id)


def assign_order(order_id, staff_id):
    """Manager override: hand an order to a specific waiter."""
    with transaction.atomic():
        order = fetch_one(
            "SELECT order_status FROM orders WHERE order_id = %s FOR UPDATE",
            (order_id,),
        )
        if order is None:
            raise NotFound("Order not found.")
        if order["order_status"] not in ("pending", *OPEN):
            raise ValidationError({"detail": "That order is already finished."})

        waiter = fetch_one(
            "SELECT role, is_active FROM staff WHERE staff_id = %s", (staff_id,)
        )
        if waiter is None or waiter["role"] != "wait_staff" or not waiter["is_active"]:
            raise ValidationError({"staff_id": "Pick an active wait staff member."})

        values = {"staff_id": staff_id}
        if order["order_status"] == "pending":
            values["order_status"] = "confirmed"
        Order.update(order_id, **values)
    return order_detail(order_id)
