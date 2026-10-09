from django.core import signing
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission

from accounts.models import Staff

TOKEN_SALT = "staff-auth"
TOKEN_MAX_AGE = 60 * 60 * 8  # 8 hours


class StaffUser:
    """Minimal stand-in for request.user, built from a staff row."""

    is_authenticated = True

    def __init__(self, row):
        self.staff_id = row["staff_id"]
        self.username = row["username"]
        self.role = row["role"]


def make_token(staff_id):
    return signing.dumps({"staff_id": staff_id}, salt=TOKEN_SALT)


class StaffAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None  # not our credentials; let other classes / permissions decide
        token = header[7:]
        try:
            data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
        except signing.BadSignature:  # also covers expired tokens
            raise AuthenticationFailed("Invalid or expired token.")
        row = Staff.get(data["staff_id"])
        if row is None or not row["is_active"]:
            raise AuthenticationFailed("Account not found or disabled.")
        return (StaffUser(row), token)

    def authenticate_header(self, request):
        return "Bearer"


def role_required(*roles):
    """Usage: permission_classes = [role_required("manager", "cashier")]"""

    class RolePermission(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.role in roles)

    return RolePermission
