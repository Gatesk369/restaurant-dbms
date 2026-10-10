from django.db import IntegrityError, transaction
from django.test import TestCase
from factories import login_as, make_customer, make_menu_item, make_staff, make_table
from orders.models import Order, OrderItem
from rest_framework.test import APIClient
from seating.models import Table

from payments.models import Payment


class PayOrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.table = make_table()
        customer = make_customer(self.table["table_id"])
        self.cashier = make_staff("c1", role="cashier")
        self.manager = make_staff("m1", role="manager")
        self.waiter = make_staff("w1", role="wait_staff")
        item = make_menu_item("Luwombo", 25000)
        order = Order.create(
            customer_id=customer["customer_id"], table_id=self.table["table_id"]
        )
        self.oid = order["order_id"]
        OrderItem.create(
            order_id=self.oid, menu_item_id=item["menu_item_id"], quantity=2
        )

    def pay(self, method="Cash"):
        return self.client.post(
            f"/api/staff/orders/{self.oid}/pay/",
            {"payment_method": method},
            format="json",
        )

    def serve(self):
        Order.update(self.oid, order_status="served")

    def test_cashier_pays_served_order(self):
        self.serve()
        login_as(self.client, self.cashier)
        r = self.pay()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["payment"]["amount"], 50000)
        self.assertEqual(r.data["payment"]["cashier_id"], self.cashier["staff_id"])
        self.assertEqual(r.data["sales_record"]["total_amount"], 50000)
        self.assertTrue(Table.get(self.table["table_id"])["free_status"])

    def test_method_is_case_insensitive(self):
        self.serve()
        login_as(self.client, self.cashier)
        r = self.pay("mobile money")
        self.assertEqual(r.data["payment"]["payment_method"], "Mobile Money")

    def test_unserved_order_cannot_be_paid(self):
        login_as(self.client, self.cashier)
        self.assertEqual(self.pay().status_code, 400)

    def test_cannot_pay_twice(self):
        self.serve()
        login_as(self.client, self.cashier)
        self.assertEqual(self.pay().status_code, 201)
        self.assertEqual(self.pay().status_code, 409)

    def test_database_blocks_a_second_payment_too(self):
        self.serve()
        login_as(self.client, self.cashier)
        self.pay()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Payment.create(
                order_id=self.oid,
                amount=1,
                payment_method="Cash",
                cashier_id=self.cashier["staff_id"],
            )

    def test_only_cashiers_take_payments(self):
        self.serve()
        for staff in (self.manager, self.waiter):
            login_as(self.client, staff)
            self.assertEqual(self.pay().status_code, 403)

    def test_bad_method_rejected(self):
        self.serve()
        login_as(self.client, self.cashier)
        self.assertEqual(self.pay("Bitcoin").status_code, 400)
