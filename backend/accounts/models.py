"""Raw SQL access to staff records; authentication is not ORM-backed."""

from db_access import SQLRepository, fetch_one
from django.db import models
from django.utils import timezone


class Staff(SQLRepository):
    table = "staff"
    key = "staff_id"

    @classmethod
    def by_username(cls, username):
        return fetch_one("SELECT * FROM staff WHERE username = %s", (username,))


class StaffAdminModel(models.Model):
    """Unmanaged ORM mapping used by Django admin for the existing staff table."""

    staff_id = models.AutoField(primary_key=True)
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(null=True, blank=True)
    is_superuser = models.BooleanField(default=False)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    email = models.EmailField(max_length=254, blank=True, default="")
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    role = models.CharField(
        max_length=30,
        default="wait_staff",
        choices=[
            ("cashier", "Cashier"),
            ("kitchen", "Kitchen"),
            ("wait_staff", "Wait staff"),
            ("manager", "Manager"),
        ],
    )

    class Meta:
        managed = False
        db_table = "staff"
        ordering = ("staff_id",)
        verbose_name = "staff member"
        verbose_name_plural = "staff members"

    def __str__(self):
        return self.username
