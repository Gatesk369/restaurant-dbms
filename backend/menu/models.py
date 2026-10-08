"""Raw SQL access and unmanaged admin mapping for menu items."""

from db_access import SQLRepository, fetch_all
from django.db import models


class MenuItem(SQLRepository):
    table = "menu_items"
    key = "menu_item_id"

    @classmethod
    def available(cls):
        return fetch_all(
            "SELECT * FROM menu_items WHERE availability_status = 1 ORDER BY item_name"
        )


class MenuItemAdminModel(models.Model):
    menu_item_id = models.AutoField(primary_key=True)
    item_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    availability_status = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "menu_items"
        ordering = ("item_name",)
        verbose_name = "menu item"
        verbose_name_plural = "menu items"

    def __str__(self):
        return self.item_name
