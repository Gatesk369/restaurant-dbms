from django.test import TestCase
from factories import make_customer, make_menu_item, make_table
from rest_framework.test import APIClient
from seating.models import Table

from orders.models import Order


class CustomerOrderTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.table = make_table()
        self.customer = make_customer(self.table["table_id"])
        self.luwombo = make_menu_item("Chicken Luwombo", 25000)
        self.tea = make_menu_item("Tea", 3000)

    def hdr(self, customer=None):
        return {"HTTP_X_SESSION_TOKEN": (customer or self.customer)["session_token"]}

    def place(self, items, customer=None, **body):
        return self.client.post(
            "/api/my/orders/",
            {"items": items, **body},
            format="json",
            **self.hdr(customer),
        )

    def cart(self):
        return [
            {
                "menu_item_id": self.luwombo["menu_item_id"],
                "quantity": 2,
                "special_instructions": "no onions",
            },
            {"menu_item_id": self.tea["menu_item_id"], "quantity": 1},
        ]

    def is_free(self):
        return Table.get(self.table["table_id"])["free_status"]

    # --- placing orders ---

    def test_place_order_computes_totals(self):
        r = self.place(self.cart())
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["order_status"], "pending")
        self.assertEqual(len(r.data["items"]), 2)
        self.assertEqual(r.data["total"], 53000)

    def test_table_comes_from_session_not_body(self):
        other = make_table()
        r = self.place(self.cart(), table_id=other["table_id"])
        self.assertEqual(r.data["table_id"], self.table["table_id"])

    def test_placing_order_occupies_table(self):
        self.assertTrue(self.is_free())
        self.place(self.cart())
        self.assertFalse(self.is_free())

    def test_requires_token(self):
        r = self.client.post("/api/my/orders/", {"items": self.cart()}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_bad_token_rejected(self):
        r = self.client.get("/api/my/orders/", HTTP_X_SESSION_TOKEN="not-a-token")
        self.assertEqual(r.status_code, 401)

    def test_empty_cart_rejected(self):
        self.assertEqual(self.place([]).status_code, 400)

    def test_zero_and_huge_quantity_rejected(self):
        mid = self.tea["menu_item_id"]
        self.assertEqual(
            self.place([{"menu_item_id": mid, "quantity": 0}]).status_code, 400
        )
        self.assertEqual(
            self.place([{"menu_item_id": mid, "quantity": 999}]).status_code, 400
        )

    def test_unknown_menu_item_rejected(self):
        r = self.place([{"menu_item_id": 999999, "quantity": 1}])
        self.assertEqual(r.status_code, 400)

    def test_unavailable_item_rejected(self):
        sold_out = make_menu_item("Sold out", 1000, available=False)
        r = self.place([{"menu_item_id": sold_out["menu_item_id"], "quantity": 1}])
        self.assertEqual(r.status_code, 400)

    def test_rejected_order_leaves_table_free(self):
        self.place([])
        self.assertTrue(self.is_free())

    # --- viewing orders ---

    def test_list_shows_own_orders(self):
        self.place(self.cart())
        r = self.client.get("/api/my/orders/", **self.hdr())
        self.assertEqual(len(r.data), 1)

    def test_cannot_see_another_customers_order(self):
        order_id = self.place(self.cart()).data["order_id"]
        other = make_customer(make_table()["table_id"])
        r = self.client.get(f"/api/my/orders/{order_id}/", **self.hdr(other))
        self.assertEqual(r.status_code, 404)
        self.assertEqual(self.client.get("/api/my/orders/", **self.hdr(other)).data, [])

    # --- cancelling ---

    def test_cancel_pending_order_frees_table(self):
        order_id = self.place(self.cart()).data["order_id"]
        r = self.client.post(f"/api/my/orders/{order_id}/cancel/", **self.hdr())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["order_status"], "cancelled")
        self.assertTrue(self.is_free())

    def test_cannot_cancel_after_kitchen_starts(self):
        order_id = self.place(self.cart()).data["order_id"]
        Order.update(order_id, order_status="preparing")
        r = self.client.post(f"/api/my/orders/{order_id}/cancel/", **self.hdr())
        self.assertEqual(r.status_code, 400)

    def test_cannot_cancel_twice(self):
        order_id = self.place(self.cart()).data["order_id"]
        self.client.post(f"/api/my/orders/{order_id}/cancel/", **self.hdr())
        r = self.client.post(f"/api/my/orders/{order_id}/cancel/", **self.hdr())
        self.assertEqual(r.status_code, 400)

    def test_cannot_cancel_another_customers_order(self):
        order_id = self.place(self.cart()).data["order_id"]
        other = make_customer(make_table()["table_id"])
        r = self.client.post(f"/api/my/orders/{order_id}/cancel/", **self.hdr(other))
        self.assertEqual(r.status_code, 404)
