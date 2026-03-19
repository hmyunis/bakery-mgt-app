from django.conf import settings
from django.db import models

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


class ShiftSession(models.Model):
    STATUS_OPENED = "opened"
    STATUS_PENDING_HANDOVER_ACCEPTANCE = "pending_handover_acceptance"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = (
        (STATUS_OPENED, "Opened"),
        (STATUS_PENDING_HANDOVER_ACCEPTANCE, "Pending Handover Acceptance"),
        (STATUS_CLOSED, "Closed"),
    )

    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="opened_shift_sessions",
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    open_notes = models.TextField(blank=True)

    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_shift_sessions",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    close_notes = models.TextField(blank=True)
    total_cash_declared = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    total_digital_declared = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_shift_sessions",
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    acceptance_notes = models.TextField(blank=True)

    previous_session = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="next_sessions",
    )

    status = models.CharField(
        max_length=32, choices=STATUS_CHOICES, default=STATUS_OPENED
    )

    class Meta:
        ordering = ["-opened_at"]
        indexes = [
            models.Index(fields=["status", "-opened_at"]),
            models.Index(fields=["opened_by", "-opened_at"]),
        ]

    def __str__(self):
        return f"ShiftSession #{self.id} ({self.status})"


class ShiftSessionProductCount(models.Model):
    session = models.ForeignKey(
        ShiftSession, on_delete=models.CASCADE, related_name="product_counts"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    opening_count = models.IntegerField(default=0)
    expected_closing_count = models.IntegerField(null=True, blank=True)
    closing_count = models.IntegerField(null=True, blank=True)
    variance = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ("session", "product")
        indexes = [
            models.Index(fields=["session", "product"]),
            models.Index(fields=["product"]),
        ]

    def __str__(self):
        return f"Session #{self.session_id} - {self.product.name}"


class Sale(models.Model):
    """
    A single customer transaction.
    """

    PAYMENT_STATUS_PAID = "paid"
    PAYMENT_STATUS_UNPAID_APPROVED = "unpaid_approved"
    PAYMENT_STATUS_CHOICES = (
        (PAYMENT_STATUS_PAID, "Paid"),
        (PAYMENT_STATUS_UNPAID_APPROVED, "Unpaid (Approved)"),
    )

    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    shift_session = models.ForeignKey(
        ShiftSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_STATUS_PAID
    )
    unpaid_reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_sales",
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    receipt_issued = models.BooleanField(default=False)

    # Optional: Customer name if 'Credit' feature is added later
    customer_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["cashier", "-created_at"]),
            models.Index(fields=["shift_session", "-created_at"]),
            models.Index(fields=["payment_status"]),
        ]

    def __str__(self):
        return f"Sale #{self.id} - {self.total_amount}"


class SaleItem(models.Model):
    """
    Items inside a sale.
    """

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2
    )  # Price AT TIME OF SALE
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class SalePayment(models.Model):
    """
    Handling Split Payments (e.g., 50 Birr Cash + 100 Birr Telebirr).
    """

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)


class DailyClosing(models.Model):
    """
    The EOD Reconciliation Report.
    """

    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # System Calculated Totals (Snapshot)
    total_sales_expected = models.DecimalField(max_digits=12, decimal_places=2)

    # Cashier Declared Totals (Blind Input)
    total_cash_declared = models.DecimalField(max_digits=12, decimal_places=2)
    total_digital_declared = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # The Verdict
    cash_discrepancy = models.DecimalField(
        max_digits=12, decimal_places=2, help_text="Negative means shortage"
    )

    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Closing {self.date} - Diff: {self.cash_discrepancy}"
