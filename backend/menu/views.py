from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

from accounts.auth import role_required
from db_access import fetch_all
from django.conf import settings
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from menu.models import MenuItem

ALL_STAFF = ("manager", "cashier", "kitchen", "wait_staff")


class MenuListView(APIView):  # public, for customers
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(MenuItem.available())


def _clean_image_url(value):
    """Only accept https URLs from our own Cloudinary account (or empty to clear it)."""
    if value is None or str(value).strip() == "":
        return None
    url = str(value).strip()
    parts = urlsplit(url)
    cloud = settings.CLOUDINARY_CLOUD_NAME
    if (
        len(url) > 500
        or parts.scheme != "https"
        or parts.hostname != "res.cloudinary.com"
        or not cloud
        or not parts.path.startswith(f"/{cloud}/")
    ):
        raise ValueError
    return url


def _clean(data, partial=False):
    """Whitelist and validate. Only these four fields can ever reach SQL."""
    out, errors = {}, {}
    if "item_name" in data or not partial:
        name = str(data.get("item_name", "")).strip()
        if 1 <= len(name) <= 100:
            out["item_name"] = name
        else:
            errors["item_name"] = "Enter a name of 1 to 100 characters."
    if "description" in data:
        text = data.get("description")
        out["description"] = (str(text).strip() or None) if text is not None else None
    if "price" in data or not partial:
        try:
            price = Decimal(str(data.get("price")))
            if not price.is_finite() or price <= 0 or price >= Decimal(100000000):
                raise InvalidOperation
            out["price"] = price.quantize(Decimal("0.01"))
        except InvalidOperation:
            errors["price"] = "Enter a price greater than 0."
    if "availability_status" in data:
        if isinstance(data["availability_status"], bool):
            out["availability_status"] = data["availability_status"]
        else:
            errors["availability_status"] = "Must be true or false."
    if "image_url" in data:
        try:
            out["image_url"] = _clean_image_url(data["image_url"])
        except ValueError:
            errors["image_url"] = "Use the image URL returned by Cloudinary."
    if errors:
        raise ValidationError(errors)
    return out


class StaffMenuView(APIView):
    def get_permissions(self):
        roles = ("manager",) if self.request.method == "POST" else ALL_STAFF
        return [role_required(*roles)()]

    def get(self, request):
        clauses, params = [], []
        if request.query_params.get("include_unavailable") not in ("1", "true"):
            clauses.append("availability_status")
        search = request.query_params.get("search", "").strip()
        if search:
            clauses.append("(item_name ILIKE %s OR description ILIKE %s)")
            params += [f"%{search}%", f"%{search}%"]
        sql = "SELECT * FROM menu_items"
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        return Response(fetch_all(sql + " ORDER BY item_name", tuple(params)))

    def post(self, request):
        return Response(MenuItem.create(**_clean(request.data)), status=201)


class StaffMenuDetailView(APIView):
    permission_classes = [role_required("manager")]

    def _get_or_404(self, menu_item_id):
        if MenuItem.get(menu_item_id) is None:
            raise NotFound("Menu item not found.")

    def patch(self, request, menu_item_id):
        self._get_or_404(menu_item_id)
        return Response(
            MenuItem.update(menu_item_id, **_clean(request.data, partial=True))
        )

    def delete(self, request, menu_item_id):
        """Soft delete: hide it instead of removing it, so past orders keep their items."""
        self._get_or_404(menu_item_id)
        return Response(MenuItem.update(menu_item_id, availability_status=False))
