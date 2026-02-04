from django.db import transaction
from rest_framework import serializers

from treasury.models import BankAccount, Expense
from treasury.serializers import ExpenseSerializer

from .models import Ingredient, Purchase, StockAdjustment


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = "__all__"
        read_only_fields = (
            "current_stock",
            "average_cost_per_unit",
            "last_purchased_price",
            "updated_at",
        )

    def validate_reorder_point(self, value):
        if value < 0:
            raise serializers.ValidationError("Reorder point cannot be negative.")
        return value


class PurchaseSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    purchaser_name = serializers.CharField(source="purchaser.username", read_only=True)
    expense_id = serializers.IntegerField(read_only=True)
    bank_account_id = serializers.IntegerField(
        source="expense.account_id", read_only=True
    )
    bank_account = serializers.PrimaryKeyRelatedField(
        queryset=BankAccount.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = Purchase
        fields = "__all__"
        read_only_fields = (
            "unit_cost",
            "is_price_anomaly",
            "purchase_date",
            "expense",
        )

    def _create_or_update_expense(self, purchase, bank_account):
        expense = purchase.expense
        title = f"Inventory purchase: {purchase.ingredient.name}"

        if not expense and bank_account:
            serializer = ExpenseSerializer(
                data={
                    "title": title,
                    "amount": purchase.total_cost,
                    "status": Expense.STATUS_PAID,
                    "account": bank_account.pk,
                    "notes": purchase.notes or "",
                }
            )
            serializer.is_valid(raise_exception=True)
            expense = serializer.save()
            if purchase.purchaser_id:
                expense.recorded_by_id = purchase.purchaser_id
                expense.save(update_fields=["recorded_by"])
            purchase.expense = expense
            purchase.save(update_fields=["expense"])
            return

        if expense and bank_account is None:
            serializer = ExpenseSerializer(
                expense,
                data={
                    "status": Expense.STATUS_PENDING,
                    "account": None,
                },
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            purchase.expense = None
            purchase.save(update_fields=["expense"])
            expense.delete()
            return

        if expense:
            update_data = {
                "title": title,
                "amount": purchase.total_cost,
            }
            if bank_account:
                update_data["account"] = bank_account.pk
                update_data["status"] = Expense.STATUS_PAID
            serializer = ExpenseSerializer(expense, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

    @transaction.atomic
    def create(self, validated_data):
        bank_account = validated_data.pop("bank_account", None)
        purchase = super().create(validated_data)
        if bank_account:
            self._create_or_update_expense(purchase, bank_account)
        return purchase

    @transaction.atomic
    def update(self, instance, validated_data):
        bank_account = validated_data.pop("bank_account", serializers.empty)
        purchase = super().update(instance, validated_data)

        if bank_account is serializers.empty:
            bank_account = purchase.expense.account if purchase.expense else None

        if bank_account or purchase.expense:
            self._create_or_update_expense(purchase, bank_account)

        return purchase


class StockAdjustmentSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    actor_name = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = StockAdjustment
        fields = "__all__"
