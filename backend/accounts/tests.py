from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.test import SimpleTestCase
from rest_framework.test import APIClient

from accounts.auth import make_token


class AccountAuthTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_row = {
            "staff_id": 17,
            "username": "sam",
            "password": make_password("correct horse battery staple"),
            "role": "manager",
            "is_active": True,
        }

    @patch("accounts.views.Staff.update")
    @patch("accounts.views.Staff.by_username")
    def test_login_returns_token_and_staff_summary(self, by_username, update):
        by_username.return_value = self.staff_row

        response = self.client.post(
            "/api/auth/login/",
            {"username": " sam ", "password": "correct horse battery staple"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["staff"],
            {"staff_id": 17, "username": "sam", "role": "manager"},
        )
        self.assertTrue(response.data["token"])
        update.assert_called_once()

    @patch("accounts.views.Staff.by_username")
    def test_login_rejects_wrong_password(self, by_username):
        by_username.return_value = self.staff_row

        response = self.client.post(
            "/api/auth/login/",
            {"username": "sam", "password": "wrong password"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["detail"], "Invalid username or password.")

    def test_login_rejects_missing_fields(self):
        response = self.client.post(
            "/api/auth/login/", {"username": "sam"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    @patch("accounts.auth.Staff.get")
    def test_me_returns_staff_for_valid_bearer_token(self, get_staff):
        get_staff.return_value = self.staff_row
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {make_token(self.staff_row['staff_id'])}"
        )

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {"staff_id": 17, "username": "sam", "role": "manager"},
        )
        get_staff.assert_called_once_with(17)
