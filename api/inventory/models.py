from django.conf import settings
from django.db import models


class UnitChoices(models.TextChoices):
    KG = "kg", "Kilogram"
    GRAM = "g", "Gram"
    LITER = "l", "Liter"
    ML = "ml", "Milliliter"
    PCS = "pcs", "Pieces"


class Ingredient(models.Model):
    name = models.CharField(max_length=100, unique=True)
    unit = models.CharField(
        max_length=5, choices=UnitChoices.choices, default=UnitChoices.KG
    )

    # Inventory Levels
    current_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0.000)
    kitchen_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0.000)
    reorder_point = models.DecimalField(max_digits=10, decimal_places=3, default=10.000)

    # Costing (Weighted Average Cost)
    average_cost_per_unit = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    last_purchased_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.unit})"


class Purchase(models.Model):
    purchaser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name="purchases"
    )

    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    purchase_date = models.DateTimeField(auto_now_add=True)
    vendor = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    expense = models.OneToOneField(
        "treasury.Expense",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase",
    )

    # Fraud Flag
    is_price_anomaly = models.BooleanField(default=False)

    def clean(self):
        """Validate model before saving"""
        from django.core.exceptions import ValidationError

        if self.quantity <= 0:
            raise ValidationError("Purchase quantity must be greater than 0.")

        if self.total_cost < 0:
            raise ValidationError("Purchase total cost cannot be negative.")

    def save(self, *args, **kwargs):
        from decimal import Decimal

        # Validate before saving
        self.clean()

        # Calculate Unit Cost
        if self.quantity > 0:
            self.unit_cost = self.total_cost / self.quantity
        else:
            self.unit_cost = 0

        # Anomaly Detection: If price is > 30% higher than average
        if self.ingredient.average_cost_per_unit > 0:
            threshold = self.ingredient.average_cost_per_unit * Decimal("1.30")
            # Decimal conversion safety handled by Django
            if self.unit_cost > threshold:
                self.is_price_anomaly = True
            else:
                self.is_price_anomaly = False

        super().save(*args, **kwargs)


class StockAdjustment(models.Model):
    """
    For manual corrections (spillage, theft, inventory audit).
    Does NOT affect average cost.
    """

    REASON_CHOICES = (
        ("waste", "Accidental Waste"),
        ("theft", "Theft/Loss"),
        ("audit", "Audit Correction"),
        ("return", "Return to Vendor"),
        ("packaging_usage", "Packaging Usage (Store Output)"),
    )

    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    quantity_change = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text="Negative for removal, Positive for addition",
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    notes = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)


class KitchenTransfer(models.Model):
    """An immutable movement of raw material from the storehouse to the kitchen."""

    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.PROTECT, related_name="kitchen_transfers"
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    storehouse_balance_before = models.DecimalField(max_digits=10, decimal_places=3)
    kitchen_balance_before = models.DecimalField(max_digits=10, decimal_places=3)
    notes = models.TextField(blank=True)
    transferred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transferred_at"]

    def __str__(self):
        amount = f"{self.quantity} {self.ingredient.unit}"
        return f"{amount} of {self.ingredient.name} to kitchen"
