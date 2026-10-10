from db_access import fetch_all, fetch_one
from django.db import IntegrityError, transaction
from django.test import TestCase
from factories import make_customer, make_menu_item, make_staff, make_table
from menu.models import MenuItem
from orders.models import Order, OrderItem
from seating.models import Table

from payments.models import Payment


class TriggerTests(TestCase):
    def setUp(self):
        self.table = make_table()
        self.customer = make_customer(self.table["table_id"])
        self.cashier = make_staff("cashier1", role="cashier")
        self.item = make_menu_item("Tea", 5000)

    def new_order(self, qty=3):
        order = Order.create(
            customer_id=self.customer["customer_id"], table_id=self.table["table_id"]
        )
        line = OrderItem.create(
            order_id=order["order_id"],
            menu_item_id=self.item["menu_item_id"],
            quantity=qty,
        )
        return order, line

    def pay(self, order_id, amount=15000):
        return Payment.create(
            order_id=order_id,
            amount=amount,
            payment_method="Cash",
            cashier_id=self.cashier["staff_id"],
        )

    def is_free(self):
        return Table.get(self.table["table_id"])["free_status"]

    # --- triggers ---

    def test_subtotal_computed_on_insert(self):
        _, line = self.new_order(qty=3)
        self.assertEqual(line["item_subtotal"], 15000)

    def test_subtotal_recomputed_on_update(self):
        _, line = self.new_order(qty=3)
        updated = OrderItem.update(line["order_item_id"], quantity=4)
        self.assertEqual(updated["item_subtotal"], 20000)

    def test_new_order_occupies_table(self):
        self.assertTrue(self.is_free())
        self.new_order()
        self.assertFalse(self.is_free())

    def test_payment_creates_sales_record_and_frees_table(self):
        order, _ = self.new_order()
        payment = self.pay(order["order_id"], 15000)
        sale = fetch_one(
            "SELECT * FROM sales_record WHERE payment_id = %s", (payment["payment_id"],)
        )
        self.assertIsNotNone(sale)
        self.assertEqual(sale["order_id"], order["order_id"])
        self.assertEqual(sale["total_amount"], 15000)
        self.assertTrue(self.is_free())

    def test_table_stays_occupied_while_another_order_is_unpaid(self):
        first, _ = self.new_order()
        second, _ = self.new_order()
        self.pay(first["order_id"])
        self.assertFalse(self.is_free())
        self.pay(second["order_id"])
        self.assertTrue(self.is_free())

    def test_cancelling_frees_table(self):
        order, _ = self.new_order()
        Order.update(order["order_id"], order_status="cancelled")
        self.assertTrue(self.is_free())

    # --- constraints (the DB must reject these on its own) ---

    def assert_db_rejects(self, fn, *args, **kwargs):
        with self.assertRaises(IntegrityError), transaction.atomic():
            fn(*args, **kwargs)

    def test_rejects_non_positive_price(self):
        self.assert_db_rejects(MenuItem.create, item_name="bad", price=-100)
        self.assert_db_rejects(MenuItem.create, item_name="free", price=0)

    def test_rejects_non_positive_quantity(self):
        order, _ = self.new_order()
        self.assert_db_rejects(
            OrderItem.create,
            order_id=order["order_id"],
            menu_item_id=self.item["menu_item_id"],
            quantity=0,
        )

    def test_rejects_invalid_order_status(self):
        order, _ = self.new_order()
        self.assert_db_rejects(Order.update, order["order_id"], order_status="banana")

    def test_rejects_invalid_payment_method(self):
        order, _ = self.new_order()
        self.assert_db_rejects(
            Payment.create,
            order_id=order["order_id"],
            amount=15000,
            payment_method="Bitcoin",
            cashier_id=self.cashier["staff_id"],
        )

    def test_rejects_non_positive_payment_amount(self):
        order, _ = self.new_order()
        self.assert_db_rejects(self.pay, order["order_id"], 0)

    def test_rejects_invalid_staff_role(self):
        self.assert_db_rejects(make_staff, "bad_role", role="janitor")

    # --- foreign key rules ---

    def test_cannot_delete_an_order_that_has_a_payment(self):
        order, _ = self.new_order()
        self.pay(order["order_id"])
        self.assert_db_rejects(Order.delete, order["order_id"])

    def test_deleting_an_unpaid_order_removes_its_items(self):
        order, _ = self.new_order()
        Order.delete(order["order_id"])
        rows = fetch_all(
            "SELECT * FROM order_items WHERE order_id = %s", (order["order_id"],)
        )
        self.assertEqual(rows, [])
