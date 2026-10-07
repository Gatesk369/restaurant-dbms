from django.contrib.auth.models import AbstractUser
from django.db import models


class Staff(AbstractUser):
    class Role(models.TextChoices):
        CASHIER = "cashier", "Cashier"
        KITCHEN = "kitchen", "Kitchen Staff"
        WAIT_STAFF = "wait_staff", "Wait Staff"
        MANAGER = "manager", "Manager"

    staff_id = models.AutoField(primary_key=True)
    role = models.CharField(
        max_length=30, choices=Role.choices, default=Role.WAIT_STAFF
    )

    class Meta:
        db_table = "staff"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    role__in=["cashier", "kitchen", "wait_staff", "manager"]
                ),
                name="staff_role_valid",
            )
        ]
