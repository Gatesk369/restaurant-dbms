"""Raw SQL access and unmanaged admin mappings for seating records."""

from db_access import SQLRepository, fetch_all
from django.db import models
from django.utils import timezone


class Table(SQLRepository):
    table = "tables"
    key = "table_id"

    @classmethod
    def available(cls):
        return fetch_all("SELECT * FROM tables WHERE free_status ORDER BY table_id")


class Customer(SQLRepository):
    table = "customers"
    key = "customer_id"


class TableAdminModel(models.Model):
    table_id = models.AutoField(primary_key=True)
    free_status = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "tables"
        ordering = ("table_id",)
        verbose_name = "table"
        verbose_name_plural = "tables"

    def __str__(self):
        return f"Table {self.table_id}"


class CustomerAdminModel(models.Model):
    customer_id = models.AutoField(primary_key=True)
    table = models.ForeignKey(
        TableAdminModel,
        db_column="table_id",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    session_token = models.CharField(max_length=36, unique=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        managed = False
        db_table = "customers"
        ordering = ("customer_id",)
        verbose_name = "customer"
        verbose_name_plural = "customers"

    def __str__(self):
        return f"Customer {self.customer_id}"
