from accounts.models import Staff
from django.test import TestCase
from factories import make_customer, make_menu_item, make_staff, make_table
from rest_framework.test import APIClient

from orders.models import Order


class AutoAssignTests(TestCase):
    def setUp(self):
        self.table = make_table()
        self.customer = make_customer(self.table["table_id"])

    def order(self):
        return Order.create(
            customer_id=self.customer["customer_id"], table_id=self.table["table_id"]
        )

    def waiter(self, name, **extra):
        return make_staff(name, role="wait_staff", **extra)

    def test_free_waiter_gets_new_order(self):
        w = self.waiter("w1")
        o = self.order()
        self.assertEqual(o["staff_id"], w["staff_id"])
        self.assertEqual(o["order_status"], "confirmed")

    def test_no_waiter_leaves_order_pending(self):
        o = self.order()
        self.assertIsNone(o["staff_id"])
        self.assertEqual(o["order_status"], "pending")

    def test_only_active_wait_staff_are_considered(self):
        self.waiter("fired", is_active=False)
        make_staff("kitchen1", role="kitchen")
        make_staff("cashier1", role="cashier")
        self.assertEqual(self.order()["order_status"], "pending")

    def test_busy_waiter_is_skipped(self):
        w1, w2 = self.waiter("w1"), self.waiter("w2")
        first, second, third = self.order(), self.order(), self.order()
        self.assertEqual(
            {first["staff_id"], second["staff_id"]}, {w1["staff_id"], w2["staff_id"]}
        )
        self.assertEqual(third["order_status"], "pending")

    def test_waiter_who_finishes_gets_oldest_pending_order(self):
        w = self.waiter("w1")
        first, second, third = self.order(), self.order(), self.order()
        for status in ("preparing", "ready", "served"):
            Order.update(first["order_id"], order_status=status)
        self.assertEqual(Order.get(second["order_id"])["staff_id"], w["staff_id"])
        self.assertEqual(Order.get(second["order_id"])["order_status"], "confirmed")
        self.assertEqual(Order.get(third["order_id"])["order_status"], "pending")

    def test_cancelling_a_confirmed_order_frees_the_waiter(self):
        w = self.waiter("w1")
        first, second = self.order(), self.order()
        Order.update(first["order_id"], order_status="cancelled")
        self.assertEqual(Order.get(second["order_id"])["staff_id"], w["staff_id"])

    def test_new_waiter_picks_up_waiting_order(self):
        o = self.order()
        self.assertEqual(o["order_status"], "pending")
        w = self.waiter("w1")
        self.assertEqual(Order.get(o["order_id"])["staff_id"], w["staff_id"])

    def test_reactivated_waiter_picks_up_waiting_order(self):
        w = self.waiter("w1", is_active=False)
        o = self.order()
        self.assertEqual(o["order_status"], "pending")
        Staff.update(w["staff_id"], is_active=True)
        self.assertEqual(Order.get(o["order_id"])["staff_id"], w["staff_id"])


class CustomerOrderAutoAssignTests(TestCase):
    def setUp(self):
        make_staff("w1", role="wait_staff")
        self.table = make_table()
        self.customer = make_customer(self.table["table_id"])
        self.item = make_menu_item("Tea", 3000)
        self.client = APIClient()

    def place(self):
        return self.client.post(
            "/api/my/orders/",
            {"items": [{"menu_item_id": self.item["menu_item_id"], "quantity": 1}]},
            format="json",
            HTTP_X_SESSION_TOKEN=self.customer["session_token"],
        )

    def test_order_placed_through_api_is_confirmed_when_a_waiter_is_free(self):
        r = self.place()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["order_status"], "confirmed")

    def test_customer_can_cancel_a_confirmed_order(self):
        order_id = self.place().data["order_id"]
        r = self.client.post(
            f"/api/my/orders/{order_id}/cancel/",
            HTTP_X_SESSION_TOKEN=self.customer["session_token"],
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["order_status"], "cancelled")
