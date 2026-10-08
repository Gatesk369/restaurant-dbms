"""Raw SQL access and unmanaged admin mappings for orders and line items."""

from db_access import SQLRepository, fetch_all
from django.db import models
from django.utils import timezone


class Order(SQLRepository):
    table = "orders"
    key = "order_id"

    @classmethod
    def with_items(cls, order_id):
        return fetch_all(
            """SELECT oi.*, mi.item_name, mi.price
               FROM order_items AS oi
               JOIN menu_items AS mi ON mi.menu_item_id = oi.menu_item_id
               WHERE oi.order_id = %s ORDER BY oi.order_item_id""",
            (order_id,),
        )


class OrderItem(SQLRepository):
    table = "order_items"
    key = "order_item_id"


class OrderAdminModel(models.Model):
    order_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        "seating.CustomerAdminModel",
        db_column="customer_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    table = models.ForeignKey(
        "seating.TableAdminModel",
        db_column="table_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    staff = models.ForeignKey(
        "accounts.StaffAdminModel",
        db_column="staff_id",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    order_status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("confirmed", "Confirmed"),
            ("preparing", "Preparing"),
            ("ready", "Ready"),
            ("served", "Served"),
            ("cancelled", "Cancelled"),
        ],
    )
    order_time = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        managed = False
        db_table = "orders"
        ordering = ("-order_time",)
        verbose_name = "order"
        verbose_name_plural = "orders"

    def __str__(self):
        return f"Order {self.order_id}"


class OrderItemAdminModel(models.Model):
    order_item_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        OrderAdminModel,
        db_column="order_id",
        on_delete=models.CASCADE,
        related_name="items",
    )
    menu_item = models.ForeignKey(
        "menu.MenuItemAdminModel",
        db_column="menu_item_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    quantity = models.PositiveIntegerField()
    item_subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, editable=False
    )
    special_instructions = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "order_items"
        ordering = ("order_item_id",)
        verbose_name = "order item"
        verbose_name_plural = "order items"

    def __str__(self):
        return f"Item {self.order_item_id} for order {self.order_id}"
