from django.conf import settings
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "Cash", "Cash"
        MOBILE_MONEY = "Mobile Money", "Mobile Money"

    payment_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Method.choices)
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments_processed",
    )
    transaction_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "payments"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name="payment_amount_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(payment_method__in=["Cash", "Mobile Money"]),
                name="payment_method_valid",
            ),
        ]


class SalesRecord(models.Model):
    sales_record_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="sales_records"
    )
    payment = models.OneToOneField(
        Payment, on_delete=models.PROTECT, related_name="sales_record"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    sale_date = models.DateField(default=timezone.localdate)

    class Meta:
        db_table = "sales_record"
