from django.contrib import admin

from .models import OrderAdminModel, OrderItemAdminModel


@admin.register(OrderItemAdminModel)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order_item_id",
        "order_id",
        "menu_item",
        "quantity",
        "item_subtotal",
    )
    list_select_related = ("order", "menu_item")
    readonly_fields = ("item_subtotal",)
    search_fields = ("=order_id", "menu_item__item_name")
    ordering = ("order_item_id",)


class OrderItemInline(admin.TabularInline):
    model = OrderItemAdminModel
    extra = 0
    readonly_fields = ("item_subtotal",)


@admin.register(OrderAdminModel)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_id",
        "order_status",
        "customer_id",
        "table_id",
        "staff_id",
        "order_time",
    )
    list_filter = ("order_status", "order_time")
    list_select_related = ("customer", "table", "staff")
    readonly_fields = ("order_time",)
    search_fields = ("=order_id",)
    ordering = ("-order_time",)
    inlines = (OrderItemInline,)
