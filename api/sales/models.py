from django.db import models
from django.conf import settings
from production.models import Product

class PaymentMethod(models.Model):
    """
    Admin configurable payment channels (Cash, Telebirr, CBE, etc.)
    """
    name = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    
    # Optional: If you want to store account numbers for display on POS
    config_details = models.TextField(blank=True, help_text="e.g. Pay to 0911...")

    def __str__(self):
        return self.name

class Sale(models.Model):
    """
    A single customer transaction.
    """
    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional: Customer name if 'Credit' feature is added later
    customer_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['cashier', '-created_at']),
        ]

    def __str__(self):
        return f"Sale #{self.id} - {self.total_amount}"

class SaleItem(models.Model):
    """
    Items inside a sale.
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2) # Price AT TIME OF SALE
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

class SalePayment(models.Model):
    """
    Handling Split Payments (e.g., 50 Birr Cash + 100 Birr Telebirr).
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

class DailyClosing(models.Model):
    """
    The EOD Reconciliation Report.
    """
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # System Calculated Totals (Snapshot)
    total_sales_expected = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Cashier Declared Totals (Blind Input)
    total_cash_declared = models.DecimalField(max_digits=12, decimal_places=2)
    total_digital_declared = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # The Verdict
    cash_discrepancy = models.DecimalField(max_digits=12, decimal_places=2, help_text="Negative means shortage")
    
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Closing {self.date} - Diff: {self.cash_discrepancy}"
