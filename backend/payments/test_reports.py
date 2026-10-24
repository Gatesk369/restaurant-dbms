from django.test import TestCase
from factories import login_as, make_customer, make_menu_item, make_staff, make_table
from orders.models import Order, OrderItem
from rest_framework.test import APIClient

from payments.models import Payment


class ReportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = make_staff("m1", role="manager")
        self.cashier = make_staff("c1", role="cashier")
        make_staff("w1", role="wait_staff")
        make_staff("w2", role="wait_staff")
        self.t1, self.t2 = make_table(), make_table()
        self.tea = make_menu_item("Tea", 3000)
        self.luwombo = make_menu_item("Luwombo", 25000)

        # two paid orders: w1 gets the first (31,000 cash), w2 the second (25,000 mobile money)
        self.paid_order(self.t1, [(self.tea, 2), (self.luwombo, 1)], "Cash")
        self.paid_order(self.t2, [(self.luwombo, 1)], "Mobile Money")

        # an unpaid order that no report may count
        customer = make_customer(self.t1["table_id"])
        unpaid = Order.create(
            customer_id=customer["customer_id"], table_id=self.t1["table_id"]
        )
        OrderItem.create(
            order_id=unpaid["order_id"],
            menu_item_id=self.tea["menu_item_id"],
            quantity=5,
        )

    def paid_order(self, table, lines, method):
        customer = make_customer(table["table_id"])
        order = Order.create(
            customer_id=customer["customer_id"], table_id=table["table_id"]
        )
        for item, qty in lines:
            OrderItem.create(
                order_id=order["order_id"],
                menu_item_id=item["menu_item_id"],
                quantity=qty,
            )
        Order.update(order["order_id"], order_status="served")
        total = sum(item["price"] * qty for item, qty in lines)
        Payment.create(
            order_id=order["order_id"],
            amount=total,
            payment_method=method,
            cashier_id=self.cashier["staff_id"],
        )

    def get(self, name, **params):
        login_as(self.client, self.manager)
        return self.client.get(f"/api/staff/reports/{name}/", params)

    # --- access ---

    def test_manager_only(self):
        self.assertEqual(
            APIClient().get("/api/staff/reports/daily-sales/").status_code, 401
        )
        login_as(self.client, self.cashier)
        self.assertEqual(
            self.client.get("/api/staff/reports/daily-sales/").status_code, 403
        )
        self.assertEqual(
            self.client.get("/api/staff/reports/payment-history/").status_code, 403
        )

    # --- daily sales ---

    def test_daily_sales_totals_and_no_gaps(self):
        r = self.get("daily-sales")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(
            len(r.data["rows"]), 30
        )  # one row per day, empty days included
        self.assertEqual(r.data["totals"]["orders"], 2)
        self.assertEqual(r.data["totals"]["revenue"], 56000)
        self.assertEqual(r.data["totals"]["avg_order_value"], 28000)
        self.assertEqual(r.data["rows"][-1]["orders"], 2)  # today is the last row

    def test_daily_sales_empty_range(self):
        r = self.get("daily-sales", **{"from": "2020-01-01", "to": "2020-01-03"})
        self.assertEqual(len(r.data["rows"]), 3)
        self.assertTrue(all(row["orders"] == 0 for row in r.data["rows"]))
        self.assertEqual(r.data["totals"]["revenue"], 0)

    # --- top items ---

    def test_top_items_ignore_unpaid_orders(self):
        r = self.get("top-items")
        self.assertEqual([i["item_name"] for i in r.data["rows"]], ["Luwombo", "Tea"])
        self.assertEqual(r.data["rows"][0]["units_sold"], 2)
        self.assertEqual(
            r.data["rows"][1]["units_sold"], 2
        )  # not 7: the unpaid tea isn't counted
        self.assertEqual(r.data["rows"][0]["revenue"], 50000)

    def test_top_items_limit(self):
        self.assertEqual(len(self.get("top-items", limit=1).data["rows"]), 1)
        self.assertEqual(self.get("top-items", limit=0).status_code, 400)
        self.assertEqual(self.get("top-items", limit="x").status_code, 400)

    # --- waiters ---

    def test_waiter_performance(self):
        rows = self.get("waiter-performance").data["rows"]
        self.assertEqual([r["username"] for r in rows], ["w1", "w2"])
        self.assertEqual(rows[0]["orders_handled"], 1)
        self.assertEqual(rows[0]["revenue"], 31000)
        self.assertEqual(rows[1]["revenue"], 25000)

    def test_waiters_with_no_sales_still_listed(self):
        rows = self.get(
            "waiter-performance", **{"from": "2020-01-01", "to": "2020-01-03"}
        ).data["rows"]
        self.assertEqual(len(rows), 2)
        self.assertTrue(
            all(r["orders_handled"] == 0 and r["revenue"] == 0 for r in rows)
        )

    # --- tables ---

    def test_table_turnover(self):
        rows = self.get("table-turnover").data["rows"]
        self.assertEqual(len(rows), 2)
        self.assertEqual(
            rows[0]["parties_served"], 1
        )  # the unpaid party at table 1 isn't counted
        self.assertEqual(rows[0]["orders_paid"], 1)
        self.assertEqual(rows[0]["revenue"], 31000)
        self.assertEqual(rows[0]["turnover_per_day"], 0.03)  # 1 party / 30 days

    # --- payment methods ---

    def test_payment_method_split(self):
        rows = self.get("payment-methods").data["rows"]
        self.assertEqual([r["payment_method"] for r in rows], ["Cash", "Mobile Money"])
        self.assertEqual(rows[0]["revenue"], 31000)
        self.assertEqual(rows[1]["payments"], 1)

    def test_payment_history_lists_order_records_and_paginates(self):
        first = self.get("payment-history", limit=1)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["total"], 2)
        self.assertEqual(len(first.data["rows"]), 1)
        row = first.data["rows"][0]
        self.assertGreater(row["order_id"], 0)
        self.assertIn(row["payment_method"], {"Cash", "Mobile Money"})
        self.assertIn(row["amount"], {25000, 31000})
        self.assertTrue(row["cashier"])
        self.assertTrue(row["waiter"])

        second = self.get("payment-history", limit=1, offset=1)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["total"], 2)
        self.assertEqual(len(second.data["rows"]), 1)
        self.assertNotEqual(
            first.data["rows"][0]["payment_id"], second.data["rows"][0]["payment_id"]
        )

    def test_payment_history_filters_by_sale_date_and_validates_pagination(self):
        empty = self.get(
            "payment-history", **{"from": "2020-01-01", "to": "2020-01-03"}
        )
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(empty.data["total"], 0)
        self.assertEqual(empty.data["rows"], [])
        self.assertEqual(self.get("payment-history", limit=0).status_code, 400)
        self.assertEqual(self.get("payment-history", offset=-1).status_code, 400)
        self.assertEqual(self.get("payment-history", limit="x").status_code, 400)

    def test_both_methods_show_even_with_no_payments(self):
        rows = self.get(
            "payment-methods", **{"from": "2020-01-01", "to": "2020-01-03"}
        ).data["rows"]
        self.assertEqual({r["payment_method"] for r in rows}, {"Cash", "Mobile Money"})
        self.assertTrue(all(r["payments"] == 0 for r in rows))

    # --- date validation ---

    def test_bad_dates_rejected(self):
        self.assertEqual(self.get("daily-sales", **{"from": "banana"}).status_code, 400)
        self.assertEqual(
            self.get(
                "daily-sales", **{"from": "2026-10-10", "to": "2026-10-01"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.get(
                "daily-sales", **{"from": "2020-01-01", "to": "2026-01-01"}
            ).status_code,
            400,
        )
