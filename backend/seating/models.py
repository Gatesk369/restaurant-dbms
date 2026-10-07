import uuid

from django.db import models


class Table(models.Model):
    table_id = models.AutoField(primary_key=True)
    free_status = models.BooleanField(default=True)

    class Meta:
        db_table = "tables"


class Customer(models.Model):
    customer_id = models.AutoField(primary_key=True)
    table = models.ForeignKey(
        Table, null=True, on_delete=models.SET_NULL, related_name="customers"
    )
    session_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "customers"
