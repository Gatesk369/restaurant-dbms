from django.conf import settings
from django.db import models
from django.utils import timezone


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        CONFIRMED = "confirmed"
        PREPARING = "preparing"
        READY = "ready"
        SERVED = "served"
        CANCELLED = "cancelled"

    order_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        "seating.Customer", on_delete=models.PROTECT, related_name="orders"
    )
    table = models.ForeignKey(
        "seating.Table", on_delete=models.PROTECT, related_name="orders"
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders_taken",
    )
    order_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    order_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "orders"
        indexes = [
            models.Index(fields=["order_time"]),
            models.Index(fields=["order_status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    order_status__in=[
                        "pending",
                        "confirmed",
                        "preparing",
                        "ready",
                        "served",
                        "cancelled",
                    ]
                ),
                name="order_status_valid",
            )
        ]


class OrderItem(models.Model):
    order_item_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey("menu.MenuItem", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    item_subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, editable=False, default=0
    )
    special_instructions = models.CharField(max_length=255, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Temporary: the DB trigger should own this once your DB lead's script is in.
        self.item_subtotal = self.quantity * self.menu_item.price
        super().save(*args, **kwargs)

    class Meta:
        db_table = "order_items"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="order_item_qty_positive"
            )
        ]
