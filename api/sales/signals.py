from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SaleItem

@receiver(post_save, sender=SaleItem)
def update_stock_on_sale(sender, instance, created, **kwargs):
    if created:
        product = instance.product
        product.stock_quantity -= instance.quantity
        product.save()

