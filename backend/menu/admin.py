from django.contrib import admin

from .models import MenuItemAdminModel


@admin.register(MenuItemAdminModel)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("menu_item_id", "item_name", "price", "availability_status")
    list_filter = ("availability_status",)
    search_fields = ("item_name", "description")
    ordering = ("item_name",)
