from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import BankAccount, BankTransaction


def _normalize_amount(amount) -> Decimal:
    if isinstance(amount, Decimal):
        return amount
    return Decimal(str(amount))


@transaction.atomic
def record_bank_activity(
    *,
    account: BankAccount,
    transaction_type: str,
    amount,
    notes: str = "",
    recorded_by=None,
) -> BankTransaction:
    amount = _normalize_amount(amount)
    if amount <= 0:
        raise serializers.ValidationError({"amount": "Amount must be greater than 0."})

    account = BankAccount.objects.select_for_update().get(pk=account.pk)
    delta = amount if transaction_type == BankTransaction.TYPE_DEPOSIT else -amount
    if account.balance + delta < 0:
        raise serializers.ValidationError(
            {"amount": "Insufficient balance for this operation."}
        )

    bank_transaction = BankTransaction.objects.create(
        account=account,
        transaction_type=transaction_type,
        amount=amount,
        notes=notes or "",
        recorded_by=recorded_by,
    )
    account.balance = account.balance + delta
    account.save(update_fields=["balance"])
    return bank_transaction
