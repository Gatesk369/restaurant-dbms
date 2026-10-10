import uuid

from accounts.auth import make_token
from accounts.models import Staff
from db_access import fetch_one
from django.contrib.auth.hashers import make_password
from menu.models import MenuItem
from seating.models import Customer


def make_staff(username="staff1", role="wait_staff", password="pass12345", **extra):
    return Staff.create(
        username=username, password=make_password(password), role=role, **extra
    )


def make_table():
    return fetch_one("INSERT INTO tables DEFAULT VALUES RETURNING *")


def make_customer(table_id):
    return Customer.create(table_id=table_id, session_token=str(uuid.uuid4()))


def make_menu_item(name="Tea", price=3000, available=True):
    return MenuItem.create(item_name=name, price=price, availability_status=available)


def login_as(client, staff):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(staff['staff_id'])}")
