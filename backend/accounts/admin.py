from django.contrib import admin

from .models import StaffAdminModel


@admin.register(StaffAdminModel)
class StaffAdmin(admin.ModelAdmin):
    list_display = (
        "staff_id",
        "username",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
    )
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "first_name", "last_name", "email")
    ordering = ("staff_id",)
    exclude = ("password",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
i