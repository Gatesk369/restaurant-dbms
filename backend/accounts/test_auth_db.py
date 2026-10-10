from django.test import TestCase
from factories import make_staff
from rest_framework.test import APIClient

from accounts.models import Staff


class AuthWithRealDBTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = make_staff("manager1", role="manager", password="changeme123")

    def login(self, username="manager1", password="changeme123"):
        return self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            format="json",
        )

    def test_inactive_user_cannot_login(self):
        make_staff("gone", is_active=False)
        self.assertEqual(self.login("gone", "pass12345").status_code, 401)

    def test_garbage_token_rejected(self):
        r = self.client.get(
            "/api/auth/me/", HTTP_AUTHORIZATION="Bearer not-a-real-token"
        )
        self.assertEqual(r.status_code, 401)

    def test_deactivated_staff_token_stops_working(self):
        token = self.login().data["token"]
        Staff.update(self.staff["staff_id"], is_active=False)
        r = self.client.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(r.status_code, 401)
