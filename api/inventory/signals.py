from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Purchase, StockAdjustment, Ingredient
from notifications.services import send_notification
from notifications.models import NotificationEvent

@receiver(post_save, sender=Purchase)
def update_inventory_on_purchase(sender, instance, created, **kwargs):
    if created:
        ingredient = instance.ingredient
        
        # 1. Update Weighted Average Cost
        # Formula: ((OldStock * OldAvg) + (NewQty * NewPrice)) / (OldStock + NewQty)
        total_value_old = ingredient.current_stock * ingredient.average_cost_per_unit
        total_value_new = instance.total_cost
        
        new_total_qty = ingredient.current_stock + instance.quantity
        
        if new_total_qty > 0:
            new_avg = (total_value_old + total_value_new) / new_total_qty
            ingredient.average_cost_per_unit = new_avg
        
        # 2. Update Stock (use F() to avoid race conditions)
        from django.db.models import F
        ingredient.current_stock = F('current_stock') + instance.quantity
        ingredient.last_purchased_price = instance.unit_cost
        ingredient.save(update_fields=['current_stock', 'last_purchased_price', 'average_cost_per_unit'])
        ingredient.refresh_from_db()
        
        # 3. Send notifications
        # Purchase created notification
        send_notification(
            NotificationEvent.PURCHASE_CREATED,
            {
                'purchaser_name': instance.purchaser.username if instance.purchaser else 'System',
                'quantity': str(instance.quantity),
                'ingredient_name': ingredient.name,
                'unit': ingredient.unit,
                'total_cost': str(instance.total_cost)
            }
        )
        
        # Price anomaly notification
        if instance.is_price_anomaly:
            percentage = ((instance.unit_cost - ingredient.average_cost_per_unit) / ingredient.average_cost_per_unit * 100) if ingredient.average_cost_per_unit > 0 else 0
            send_notification(
                NotificationEvent.PRICE_ANOMALY,
                {
                    'ingredient_name': ingredient.name,
                    'unit_cost': str(instance.unit_cost),
                    'average_cost': str(ingredient.average_cost_per_unit),
                    'percentage': f"{percentage:.1f}"
                }
            )

@receiver(post_save, sender=StockAdjustment)
def update_inventory_on_adjustment(sender, instance, created, **kwargs):
    if created:
        ingredient = instance.ingredient
        # Use F() expression to avoid race conditions
        from django.db.models import F
        ingredient.current_stock = F('current_stock') + instance.quantity_change
        ingredient.save(update_fields=['current_stock'])
        # Refresh to get actual value
        ingredient.refresh_from_db()
        
        # Send notification (outside transaction)
        send_notification(
            NotificationEvent.STOCK_ADJUSTMENT,
            {
                'actor_name': instance.actor.username if instance.actor else 'System',
                'ingredient_name': ingredient.name,
                'quantity_change': str(instance.quantity_change),
                'reason': instance.get_reason_display(),
                'current_stock': str(ingredient.current_stock),
                'unit': ingredient.unit
            }
        )

@receiver(post_save, sender=Ingredient)
def check_low_stock(sender, instance, **kwargs):
    """Check if ingredient stock is low and send notification"""
    if instance.current_stock <= instance.reorder_point:
        send_notification(
            NotificationEvent.LOW_STOCK,
            {
                'ingredient_name': instance.name,
                'current_stock': str(instance.current_stock),
                'reorder_point': str(instance.reorder_point),
                'unit': instance.unit
            }
        )

