from db_access import fetch_one
from django.test import TestCase
from factories import make_table
from rest_framework.test import APIClient


class CustomerCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post(self, table_id):
        return self.client.post(
            "/api/customers/", {"table_id": table_id}, format="json"
        )

    def test_creates_customer_and_returns_token(self):
        table = make_table()
        r = self.post(table["table_id"])
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["table_id"], table["table_id"])
        self.assertTrue(r.data["session_token"])

    def test_unknown_table_rejected(self):
        self.assertEqual(self.post(999999).status_code, 400)

    def test_bad_table_values_rejected(self):
        self.assertEqual(self.post("abc").status_code, 400)
        self.assertEqual(self.post(None).status_code, 400)
        self.assertEqual(self.post(-5).status_code, 400)


class TableListTests(TestCase):
    def test_lists_all_tables_with_their_current_occupancy(self):
        free = make_table()
        occupied = make_table()
        fetch_one(
            "UPDATE tables SET free_status = FALSE WHERE table_id = %s RETURNING table_id",
            (occupied["table_id"],),
        )

        response = APIClient().get("/api/tables/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            [
                {"table_id": free["table_id"], "free_status": True},
                {"table_id": occupied["table_id"], "free_status": False},
            ],
        )
