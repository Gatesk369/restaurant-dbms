"""Raw SQL access and unmanaged admin mappings for payment records."""

from datetime import date

from db_access import SQLRepository
from django.db import models
from django.utils import timezone


class Payment(SQLRepository):
    table = "payments"
    key = "payment_id"


class SalesRecord(SQLRepository):
    table = "sales_record"
    key = "sales_record_id"


class PaymentAdminModel(models.Model):
    payment_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        "orders.OrderAdminModel",
        db_column="order_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=[("Cash", "Cash"), ("Mobile Money", "Mobile Money")],
    )
    cashier = models.ForeignKey(
        "accounts.StaffAdminModel",
        db_column="cashier_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    transaction_time = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        managed = False
        db_table = "payments"
        ordering = ("-transaction_time",)
        verbose_name = "payment"
        verbose_name_plural = "payments"

    def __str__(self):
        return f"Payment {self.payment_id}"


class SalesRecordAdminModel(models.Model):
    sales_record_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        "orders.OrderAdminModel",
        db_column="order_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    payment = models.OneToOneField(
        PaymentAdminModel,
        db_column="payment_id",
        on_delete=models.PROTECT,
        related_name="+",
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    sale_date = models.DateField(default=date.today)

    class Meta:
        managed = False
        db_table = "sales_record"
        ordering = ("-sale_date",)
        verbose_name = "sales record"
        verbose_name_plural = "sales records"
