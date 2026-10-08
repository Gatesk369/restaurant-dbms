from django.contrib import admin

from .models import PaymentAdminModel, SalesRecordAdminModel


@admin.register(PaymentAdminModel)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "payment_id",
        "order_id",
        "amount",
        "payment_method",
        "cashier_id",
        "transaction_time",
    )
    list_filter = ("payment_method", "transaction_time")
    list_select_related = ("order", "cashier")
    readonly_fields = ("transaction_time",)
    ordering = ("-transaction_time",)


@admin.register(SalesRecordAdminModel)
class SalesRecordAdmin(admin.ModelAdmin):
    list_display = (
        "sales_record_id",
        "order_id",
        "payment_id",
        "total_amount",
        "sale_date",
    )
    list_filter = ("sale_date",)
    list_select_related = ("order", "payment")
    ordering = ("-sale_date",)
