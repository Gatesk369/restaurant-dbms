from db_access import fetch_one
from django.db import transaction
from rest_framework.exceptions import APIException, NotFound, ValidationError

from payments.models import Payment

METHODS = {"cash": "Cash", "mobile money": "Mobile Money"}


class Conflict(APIException):
    status_code = 409
    default_detail = "Conflict."


def pay_order(cashier, order_id, method):
    method = METHODS.get(method.strip().lower())
    if method is None:
        raise ValidationError({"payment_method": "Use 'Cash' or 'Mobile Money'."})

    with transaction.atomic():
        order = fetch_one(
            "SELECT order_status FROM orders WHERE order_id = %s FOR UPDATE",
            (order_id,),
        )
        if order is None:
            raise NotFound("Order not found.")
        if order["order_status"] != "served":
            raise ValidationError({"detail": "Only served orders can be paid."})
        if fetch_one("SELECT 1 AS paid FROM payments WHERE order_id = %s", (order_id,)):
            raise Conflict("This order has already been paid.")

        total = fetch_one(
            "SELECT COALESCE(SUM(item_subtotal), 0) AS total FROM order_items WHERE order_id = %s",
            (order_id,),
        )["total"]
        if total <= 0:
            raise ValidationError({"detail": "This order has nothing to pay."})

        # amount is computed here, never taken from the request
        payment = Payment.create(
            order_id=order_id,
            amount=total,
            payment_method=method,
            cashier_id=cashier.staff_id,
        )
        sale = fetch_one(
            "SELECT * FROM sales_record WHERE payment_id = %s", (payment["payment_id"],)
        )
    return {"payment": payment, "sales_record": sale}
