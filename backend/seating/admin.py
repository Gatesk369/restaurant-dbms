from django.contrib import admin

from .models import CustomerAdminModel, TableAdminModel


@admin.register(TableAdminModel)
class TableAdmin(admin.ModelAdmin):
    list_display = ("table_id", "free_status")
    list_filter = ("free_status",)
    ordering = ("table_id",)


@admin.register(CustomerAdminModel)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("customer_id", "table", "created_at")
    list_filter = ("created_at",)
    search_fields = ("session_token",)
    readonly_fields = ("created_at",)
    ordering = ("customer_id",)
