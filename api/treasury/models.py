from django.conf import settings
from django.db import models
from django.utils import timezone

from core.utils import get_upload_path
from sales.models import PaymentMethod


class BankAccount(models.Model):
    name = models.CharField(max_length=120)
    bank_name = models.CharField(max_length=120)
    account_holder = models.CharField(max_length=120)
    account_number = models.CharField(max_length=64)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    logo = models.FileField(upload_to=get_upload_path, null=True, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    linked_payment_methods = models.ManyToManyField(
        PaymentMethod, blank=True, related_name="bank_accounts"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.bank_name})"


class BankTransaction(models.Model):
    TYPE_DEPOSIT = "deposit"
    TYPE_WITHDRAWAL = "withdrawal"

    TYPE_CHOICES = (
        (TYPE_DEPOSIT, "Deposit"),
        (TYPE_WITHDRAWAL, "Withdrawal"),
    )

    account = models.ForeignKey(
        BankAccount, on_delete=models.CASCADE, related_name="transactions"
    )
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bank_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["account", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.account.name} - {self.transaction_type} {self.amount}"


class Expense(models.Model):
    STATUS_PAID = "paid"
    STATUS_PENDING = "pending"

    STATUS_CHOICES = (
        (STATUS_PAID, "Paid"),
        (STATUS_PENDING, "Pending"),
    )

    title = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    account = models.ForeignKey(
        BankAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="expenses",
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.amount}"
