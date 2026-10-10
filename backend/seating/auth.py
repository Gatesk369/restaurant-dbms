from db_access import fetch_one
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

SESSION_HOURS = 12


class CustomerUser:
    is_authenticated = True

    def __init__(self, row):
        self.customer_id = row["customer_id"]
        self.table_id = row["table_id"]


class CustomerAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.headers.get("X-Session-Token", "").strip()
        if not token:
            return None
        row = fetch_one(
            "SELECT customer_id, table_id FROM customers "
            f"WHERE session_token = %s AND created_at > NOW() - INTERVAL '{SESSION_HOURS} hours'",
            (token,),
        )
        if row is None:
            raise AuthenticationFailed(
                "Invalid or expired session. Enter your table number again."
            )
        return (CustomerUser(row), token)

    def authenticate_header(self, request):
        return "Session"
