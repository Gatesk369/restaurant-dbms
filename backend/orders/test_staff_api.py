from django.test import TestCase
from factories import login_as, make_customer, make_menu_item, make_staff, make_table
from rest_framework.test import APIClient
from seating.models import Table

from orders.models import Order, OrderItem


class StaffOrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.table = make_table()
        self.customer = make_customer(self.table["table_id"])
        self.waiter = make_staff("w1", role="wait_staff")
        self.kitchen = make_staff("k1", role="kitchen")
        self.cashier = make_staff("c1", role="cashier")
        self.manager = make_staff("m1", role="manager")
        item = make_menu_item("Tea", 3000)
        self.order = self.new_order()  # auto-assigned to w1
        self.oid = self.order["order_id"]
        OrderItem.create(
            order_id=self.oid, menu_item_id=item["menu_item_id"], quantity=2
        )

    def new_order(self):
        return Order.create(
            customer_id=self.customer["customer_id"], table_id=self.table["table_id"]
        )

    def second_waiter(self):
        return make_staff("w2", role="wait_staff")

    def as_(self, staff):
        login_as(self.client, staff)

    def move(self, status, oid=None):
        return self.client.post(
            f"/api/staff/orders/{oid or self.oid}/status/",
            {"status": status},
            format="json",
        )

    def assign(self, staff_id, oid=None):
        return self.client.post(
            f"/api/staff/orders/{oid or self.oid}/assign/",
            {"staff_id": staff_id},
            format="json",
        )

    def test_setup_order_was_auto_assigned(self):
        self.assertEqual(self.order["staff_id"], self.waiter["staff_id"])
        self.assertEqual(self.order["order_status"], "confirmed")

    # --- access ---

    def test_staff_endpoints_need_a_staff_token(self):
        self.assertEqual(self.client.get("/api/staff/orders/").status_code, 401)
        r = self.client.get(
            "/api/staff/orders/", HTTP_X_SESSION_TOKEN=self.customer["session_token"]
        )
        self.assertEqual(r.status_code, 401)

    # --- queues ---

    def test_kitchen_queue_shows_items_and_waiter(self):
        self.as_(self.kitchen)
        r = self.client.get("/api/staff/orders/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([o["order_id"] for o in r.data], [self.oid])
        self.assertEqual(r.data[0]["waiter"], "w1")
        self.assertEqual(r.data[0]["total"], 6000)

    def test_waiter_sees_only_own_orders(self):
        other = self.second_waiter()
        self.as_(other)
        self.assertEqual(self.client.get("/api/staff/orders/").data, [])
        self.as_(self.waiter)
        self.assertEqual(len(self.client.get("/api/staff/orders/").data), 1)

    def test_cashier_sees_only_served_unpaid_orders(self):
        self.as_(self.cashier)
        self.assertEqual(self.client.get("/api/staff/orders/").data, [])
        Order.update(self.oid, order_status="served")
        self.assertEqual(len(self.client.get("/api/staff/orders/").data), 1)

    # --- status changes ---

    def test_kitchen_prepares_but_assigned_waiter_serves(self):
        self.as_(self.kitchen)
        for status in ("preparing", "ready"):
            r = self.move(status)
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.data["order_status"], status)
        self.assertEqual(self.move("served").status_code, 403)
        self.assertEqual(Order.get(self.oid)["order_status"], "ready")
        self.as_(self.waiter)
        self.assertEqual(self.move("served").status_code, 200)

    def test_cannot_skip_or_go_backwards(self):
        self.as_(self.kitchen)
        self.assertEqual(self.move("ready").status_code, 400)
        self.move("preparing")
        self.assertEqual(self.move("confirmed").status_code, 400)
        self.assertEqual(self.move("banana").status_code, 400)

    def test_wrong_roles_cannot_change_status(self):
        self.as_(self.cashier)
        self.assertEqual(self.move("preparing").status_code, 403)
        self.as_(self.waiter)
        self.assertEqual(self.move("preparing").status_code, 403)

    def test_assigned_waiter_can_mark_served_but_not_others(self):
        other = self.second_waiter()
        Order.update(self.oid, order_status="ready")
        self.as_(other)
        self.assertEqual(self.move("served").status_code, 403)
        self.as_(self.waiter)
        self.assertEqual(self.move("served").status_code, 200)

    def test_only_manager_can_cancel(self):
        self.as_(self.kitchen)
        self.assertEqual(self.move("cancelled").status_code, 403)
        self.as_(self.manager)
        self.assertEqual(self.move("cancelled").data["order_status"], "cancelled")
        self.assertTrue(Table.get(self.table["table_id"])["free_status"])

    def test_cannot_cancel_a_served_order(self):
        Order.update(self.oid, order_status="served")
        self.as_(self.manager)
        self.assertEqual(self.move("cancelled").status_code, 400)

    # --- manager assignment ---

    def test_manager_can_reassign_to_another_waiter(self):
        other = self.second_waiter()
        self.as_(self.manager)
        r = self.assign(other["staff_id"])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["waiter"], "w2")

    def test_manager_can_assign_a_pending_order_even_to_a_busy_waiter(self):
        pending = self.new_order()  # w1 is busy and is the only waiter
        self.assertEqual(pending["order_status"], "pending")
        self.as_(self.manager)
        r = self.assign(self.waiter["staff_id"], oid=pending["order_id"])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["order_status"], "confirmed")

    def test_bad_assignments_rejected(self):
        self.as_(self.manager)
        self.assertEqual(self.assign(self.cashier["staff_id"]).status_code, 400)
        self.assertEqual(self.assign("abc").status_code, 400)
        self.as_(self.kitchen)
        self.assertEqual(self.assign(self.waiter["staff_id"]).status_code, 403)

    def test_staff_cannot_create_orders_or_use_customer_endpoint(self):
        for staff in (self.waiter, self.manager, self.kitchen, self.cashier):
            with self.subTest(role=staff["role"]):
                self.as_(staff)
                payload = {"table_id": self.table["table_id"], "items": []}
                self.assertEqual(
                    self.client.post(
                        "/api/staff/orders/", payload, format="json"
                    ).status_code,
                    405,
                )
                self.assertEqual(
                    self.client.post(
                        "/api/my/orders/", payload, format="json"
                    ).status_code,
                    401,
                )

    def test_waiter_cannot_discover_other_orders_by_status_filter(self):
        other = self.second_waiter()
        self.as_(other)
        for status in ("confirmed", "preparing", "ready", "served", "cancelled"):
            Order.update(self.oid, order_status=status)
            r = self.client.get("/api/staff/orders/", {"status": status})
            self.assertEqual(r.data, [])
            self.assertEqual(self.move("served").status_code, 403)

    def test_manager_retains_service_override(self):
        Order.update(self.oid, order_status="ready")
        self.as_(self.manager)
        self.assertEqual(self.move("served").status_code, 200)

    def test_customer_order_flows_through_kitchen_waiter_and_cashier(self):
        table = make_table()
        customer = make_customer(table["table_id"])
        waiter = self.second_waiter()
        item = make_menu_item("Lunch", 12000)
        guest = APIClient()
        placed = guest.post(
            "/api/my/orders/",
            {
                "items": [
                    {
                        "menu_item_id": item["menu_item_id"],
                        "quantity": 1,
                        "special_instructions": "No onions",
                    }
                ]
            },
            format="json",
            HTTP_X_SESSION_TOKEN=customer["session_token"],
        )
        self.assertEqual(placed.status_code, 201)
        oid = placed.data["order_id"]
        self.assertEqual(Order.get(oid)["staff_id"], waiter["staff_id"])
        self.assertEqual(placed.data["order_status"], "confirmed")
        self.as_(waiter)
        queue = self.client.get("/api/staff/orders/").data
        self.assertEqual([o["order_id"] for o in queue], [oid])
        self.assertEqual(queue[0]["items"][0]["special_instructions"], "No onions")
        self.as_(self.kitchen)
        self.assertEqual(self.move("preparing", oid).status_code, 200)
        self.assertEqual(self.move("ready", oid).status_code, 200)
        self.assertEqual(self.move("served", oid).status_code, 403)
        self.as_(waiter)
        self.assertEqual(self.move("served", oid).status_code, 200)
        self.as_(self.cashier)
        paid = self.client.post(
            f"/api/staff/orders/{oid}/pay/", {"payment_method": "Cash"}, format="json"
        )
        self.assertEqual(paid.status_code, 201)
        self.assertEqual(paid.data["payment"]["amount"], 12000)
        self.assertTrue(Table.get(table["table_id"])["free_status"])
