from django.db import models


class MenuItem(models.Model):
    menu_item_id = models.AutoField(primary_key=True)
    item_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # UGX
    availability_status = models.BooleanField(default=True)

    class Meta:
        db_table = "menu_items"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price__gt=0), name="menu_price_positive"
            )
        ]
