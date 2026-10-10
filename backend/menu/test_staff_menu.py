from decimal import Decimal

from django.test import TestCase
from factories import login_as, make_menu_item, make_staff
from rest_framework.test import APIClient

from menu.models import MenuItem


class StaffMenuTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = make_staff("m1", role="manager")
        self.cashier = make_staff("c1", role="cashier")
        self.tea = make_menu_item("Tea", 3000)
        self.soda = make_menu_item("Soda", 2000)

    def test_manager_creates_item(self):
        login_as(self.client, self.manager)
        r = self.client.post(
            "/api/staff/menu/",
            {"item_name": "  Rolex  ", "price": "5000"},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["item_name"], "Rolex")
        self.assertTrue(r.data["availability_status"])

    def test_non_manager_can_read_but_not_write(self):
        login_as(self.client, self.cashier)
        self.assertEqual(self.client.get("/api/staff/menu/").status_code, 200)
        self.assertEqual(
            self.client.post(
                "/api/staff/menu/", {"item_name": "x", "price": 1}, format="json"
            ).status_code,
            403,
        )
        url = f"/api/staff/menu/{self.tea['menu_item_id']}/"
        self.assertEqual(
            self.client.patch(url, {"price": 1}, format="json").status_code, 403
        )
        self.assertEqual(self.client.delete(url).status_code, 403)

    def test_bad_input_rejected(self):
        login_as(self.client, self.manager)
        for bad in (
            {"item_name": "x", "price": 0},
            {"item_name": "x", "price": -5},
            {"item_name": "x", "price": "abc"},
            {"item_name": "x", "price": "NaN"},
            {"price": 1000},
            {"item_name": "", "price": 1000},
        ):
            self.assertEqual(
                self.client.post("/api/staff/menu/", bad, format="json").status_code,
                400,
                bad,
            )

    def test_patch_updates_only_allowed_fields(self):
        login_as(self.client, self.manager)
        tid = self.tea["menu_item_id"]
        r = self.client.patch(
            f"/api/staff/menu/{tid}/",
            {"price": "3500.50", "menu_item_id": 999},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["menu_item_id"], tid)
        self.assertEqual(r.data["price"], Decimal("3500.50"))

    def test_delete_is_a_soft_delete(self):
        login_as(self.client, self.manager)
        tid = self.tea["menu_item_id"]
        r = self.client.delete(f"/api/staff/menu/{tid}/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["availability_status"])
        self.assertIsNotNone(MenuItem.get(tid))  # still in the table
        public = [i["menu_item_id"] for i in APIClient().get("/api/menu/").data]
        self.assertNotIn(tid, public)
        everything = self.client.get("/api/staff/menu/?include_unavailable=1").data
        self.assertIn(tid, [i["menu_item_id"] for i in everything])

    def test_search(self):
        login_as(self.client, self.manager)
        r = self.client.get("/api/staff/menu/?search=tea")
        self.assertEqual([i["item_name"] for i in r.data], ["Tea"])

    def test_unknown_item_404(self):
        login_as(self.client, self.manager)
        self.assertEqual(
            self.client.patch(
                "/api/staff/menu/999999/", {"price": 1}, format="json"
            ).status_code,
            404,
        )
