from decimal import Decimal

from django.db import transaction

from core.models import BakerySettings
from treasury.models import BankAccount, BankTransaction
from treasury.services import record_bank_activity


def _normalize_amount(amount) -> Decimal:
    if isinstance(amount, Decimal):
        return amount
    return Decimal(str(amount))


@transaction.atomic
def apply_sale_bank_sync(payment_entries, direction: str, note: str = "") -> None:
    """
    Apply sale payment amounts to linked bank accounts if enabled in settings.

    payment_entries: iterable of (payment_method, amount)
    direction: "add" or "subtract"
    """
    settings = BakerySettings.get_instance()
    if not settings.sync_sales_to_bank_accounts:
        return

    multiplier = Decimal("1") if direction == "add" else Decimal("-1")
    bank_totals: dict[int, Decimal] = {}

    for method, amount in payment_entries:
        if not method:
            continue
        for account in method.bank_accounts.all():
            bank_totals[account.id] = bank_totals.get(account.id, Decimal("0")) + (
                _normalize_amount(amount) * multiplier
            )

    if not bank_totals:
        return

    accounts = BankAccount.objects.filter(id__in=bank_totals.keys())
    for account in accounts:
        delta = bank_totals.get(account.id, Decimal("0"))
        if delta == 0:
            continue
        transaction_type = (
            BankTransaction.TYPE_DEPOSIT
            if delta > 0
            else BankTransaction.TYPE_WITHDRAWAL
        )
        record_bank_activity(
            account=account,
            transaction_type=transaction_type,
            amount=abs(delta),
            notes=note,
        )
