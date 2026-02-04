from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from sales.models import PaymentMethod

from .models import BankAccount, BankTransaction, Expense
from .services import record_bank_activity


class BankAccountSerializer(serializers.ModelSerializer):
    logo_clear = serializers.BooleanField(write_only=True, required=False)
    linked_payment_method_ids = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.all(),
        many=True,
        required=False,
        source="linked_payment_methods",
    )

    class Meta:
        model = BankAccount
        fields = [
            "id",
            "name",
            "bank_name",
            "account_holder",
            "account_number",
            "balance",
            "logo",
            "notes",
            "is_active",
            "linked_payment_method_ids",
            "logo_clear",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        validated_data.pop("logo_clear", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        logo_clear = validated_data.pop("logo_clear", False)
        if logo_clear:
            if instance.logo:
                instance.logo.delete(save=False)
            validated_data["logo"] = None
        return super().update(instance, validated_data)


class BankTransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    recorded_by_name = serializers.CharField(
        source="recorded_by.username", read_only=True
    )
    type = serializers.ChoiceField(
        choices=BankTransaction.TYPE_CHOICES, source="transaction_type"
    )

    class Meta:
        model = BankTransaction
        fields = [
            "id",
            "account",
            "account_name",
            "type",
            "amount",
            "notes",
            "recorded_by",
            "recorded_by_name",
            "created_at",
        ]
        read_only_fields = ("recorded_by", "recorded_by_name", "created_at")

    def validate_amount(self, value):
        if value is None or Decimal(value) <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def _get_delta(self, transaction_type, amount: Decimal) -> Decimal:
        if transaction_type == BankTransaction.TYPE_DEPOSIT:
            return amount
        return -amount

    @transaction.atomic
    def create(self, validated_data):
        return record_bank_activity(
            account=validated_data["account"],
            transaction_type=validated_data["transaction_type"],
            amount=validated_data["amount"],
            notes=validated_data.get("notes", ""),
            recorded_by=validated_data.get("recorded_by"),
        )

    @transaction.atomic
    def update(self, instance, validated_data):
        prev_account = BankAccount.objects.select_for_update().get(
            pk=instance.account_id
        )
        next_account = validated_data.get("account", instance.account)

        next_account = (
            prev_account
            if next_account.pk == prev_account.pk
            else BankAccount.objects.select_for_update().get(pk=next_account.pk)
        )

        prev_delta = self._get_delta(instance.transaction_type, instance.amount)
        next_type = validated_data.get("transaction_type", instance.transaction_type)
        next_amount = validated_data.get("amount", instance.amount)
        next_delta = self._get_delta(next_type, next_amount)

        prev_account.balance = prev_account.balance - prev_delta
        if prev_account.balance < 0:
            raise serializers.ValidationError(
                {"amount": "Reverting this transaction would make balance negative."}
            )

        if next_account.pk == prev_account.pk:
            if prev_account.balance + next_delta < 0:
                raise serializers.ValidationError(
                    {"amount": "Insufficient balance for withdrawal."}
                )
            prev_account.balance = prev_account.balance + next_delta
            prev_account.save(update_fields=["balance"])
        else:
            if next_account.balance + next_delta < 0:
                raise serializers.ValidationError(
                    {"amount": "Insufficient balance for withdrawal."}
                )
            prev_account.save(update_fields=["balance"])
            next_account.balance = next_account.balance + next_delta
            next_account.save(update_fields=["balance"])

        return super().update(instance, validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    recorded_by_name = serializers.CharField(
        source="recorded_by.username", read_only=True
    )

    class Meta:
        model = Expense
        fields = [
            "id",
            "title",
            "amount",
            "status",
            "account",
            "account_name",
            "notes",
            "recorded_by",
            "recorded_by_name",
            "created_at",
        ]
        read_only_fields = ("recorded_by", "recorded_by_name")

    def validate_amount(self, value):
        if value is None or Decimal(value) <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def _get_expense_delta(self, status, amount: Decimal) -> Decimal:
        if status == Expense.STATUS_PAID:
            return -amount
        return Decimal("0")

    @transaction.atomic
    def create(self, validated_data):
        account = validated_data.get("account")
        status = validated_data.get("status", Expense.STATUS_PENDING)
        expense = Expense.objects.create(**validated_data)

        if account and status == Expense.STATUS_PAID:
            record_bank_activity(
                account=account,
                transaction_type=BankTransaction.TYPE_WITHDRAWAL,
                amount=expense.amount,
                notes=f"{expense.title} (Expense #{expense.id})",
                recorded_by=expense.recorded_by,
            )

        return expense

    @transaction.atomic
    def update(self, instance, validated_data):
        prev_account = instance.account
        next_account = validated_data.get("account", instance.account)
        prev_status = instance.status
        next_status = validated_data.get("status", instance.status)
        prev_amount = instance.amount
        next_amount = validated_data.get("amount", instance.amount)

        prev_effect = (
            -Decimal(prev_amount)
            if prev_account and prev_status == Expense.STATUS_PAID
            else Decimal("0")
        )
        next_effect = (
            -Decimal(next_amount)
            if next_account and next_status == Expense.STATUS_PAID
            else Decimal("0")
        )

        expense = super().update(instance, validated_data)

        account_ids = set()
        if prev_account:
            account_ids.add(prev_account.pk)
        if next_account:
            account_ids.add(next_account.pk)

        for account_id in account_ids:
            prev_value = (
                prev_effect
                if prev_account and prev_account.pk == account_id
                else Decimal("0")
            )
            next_value = (
                next_effect
                if next_account and next_account.pk == account_id
                else Decimal("0")
            )
            net = next_value - prev_value
            if net == 0:
                continue
            if net > 0:
                record_bank_activity(
                    account=BankAccount.objects.get(pk=account_id),
                    transaction_type=BankTransaction.TYPE_DEPOSIT,
                    amount=abs(net),
                    notes=f"{expense.title} (Expense #{expense.id} adjusted)",
                    recorded_by=expense.recorded_by,
                )
            else:
                record_bank_activity(
                    account=BankAccount.objects.get(pk=account_id),
                    transaction_type=BankTransaction.TYPE_WITHDRAWAL,
                    amount=abs(net),
                    notes=f"{expense.title} (Expense #{expense.id} adjusted)",
                    recorded_by=expense.recorded_by,
                )

        return expense
