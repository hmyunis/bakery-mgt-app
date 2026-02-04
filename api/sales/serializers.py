from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from production.models import Product

from .models import DailyClosing, PaymentMethod, Sale, SaleItem, SalePayment
from .services import apply_sale_bank_sync


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = "__all__"


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SaleItem
        fields = ["product", "product_name", "quantity", "unit_price", "subtotal"]
        read_only_fields = ("unit_price", "subtotal")


class SalePaymentInputSerializer(serializers.Serializer):
    method_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)  # For Output
    payments = serializers.SerializerMethodField()
    cashier_name = serializers.CharField(source="cashier.username", read_only=True)

    # Inputs
    items_input = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )
    payments_input = SalePaymentInputSerializer(
        many=True, write_only=True, required=False
    )

    class Meta:
        model = Sale
        fields = [
            "id",
            "total_amount",
            "created_at",
            "cashier",
            "cashier_name",
            "receipt_issued",
            "items",
            "payments",
            "items_input",
            "payments_input",
        ]
        read_only_fields = ("total_amount", "created_at", "cashier", "cashier_name")

    def get_payments(self, obj):
        # Handle both Sale instance and dict (during creation)
        if isinstance(obj, dict):
            return []
        return list(obj.payments.values("method__name", "amount"))

    def create(self, validated_data):
        items_data = validated_data.pop("items_input", None)
        payments_data = validated_data.pop("payments_input", None)
        receipt_issued = validated_data.pop("receipt_issued", False)

        if not items_data:
            raise serializers.ValidationError("items_input is required.")
        if not payments_data:
            raise serializers.ValidationError("payments_input is required.")

        with transaction.atomic():
            # 1. Create Sale
            sale = Sale.objects.create(
                cashier=self.context["request"].user,
                receipt_issued=receipt_issued,
            )

            total_amount = 0

            # 2. Process Items
            for item in items_data:
                product_id = item.get("product_id")
                qty = item.get("quantity", 0)

                # Validate quantity
                if qty <= 0:
                    raise serializers.ValidationError(
                        f"Quantity must be greater than 0 for product {product_id}"
                    )

                try:
                    product = Product.objects.select_for_update().get(
                        id=product_id, is_active=True
                    )
                except Product.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Product with id {product_id} not found or inactive"
                    )

                # Check stock availability
                if product.stock_quantity < qty:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {product.name}. "
                        f"Available: {product.stock_quantity}, Requested: {qty}"
                    )

                price = product.selling_price

                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    quantity=qty,
                    unit_price=price,
                    subtotal=price * qty,
                )
                total_amount += price * qty

                # Deduct stock
                product.stock_quantity = F("stock_quantity") - qty
                product.save(update_fields=["stock_quantity"])

            # 3. Process Payments
            payment_total = 0
            payment_entries = []
            for pay in payments_data:
                method_id = pay.get("method_id")
                amount = pay.get("amount", 0)

                # Validate amount
                if amount <= 0:
                    raise serializers.ValidationError(
                        "Payment amount must be greater than 0"
                    )

                try:
                    method = PaymentMethod.objects.get(id=method_id, is_active=True)
                except PaymentMethod.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Payment method with id {method_id} not found or inactive"
                    )

                SalePayment.objects.create(sale=sale, method=method, amount=amount)
                payment_entries.append((method, amount))
                payment_total += amount

            # Validate Totals
            if payment_total < total_amount:
                raise serializers.ValidationError(
                    "Payment amount is less than Total Bill."
                )

            sale.total_amount = total_amount
            sale.save()

            apply_sale_bank_sync(
                payment_entries, "add", note=f"Sale #{sale.id} created"
            )

            # Send notification
            from notifications.models import NotificationEvent
            from notifications.services import send_notification

            send_notification(
                NotificationEvent.SALE_COMPLETE,
                {
                    "sale_id": str(sale.id),
                    "total_amount": str(total_amount),
                    "cashier_name": sale.cashier.username if sale.cashier else "System",
                },
            )

        return sale

    def update(self, instance, validated_data):
        payments_data = validated_data.pop("payments_input", None)
        items_data = validated_data.pop("items_input", None)

        if items_data:
            raise serializers.ValidationError(
                "Editing sale items is not supported. Create a new sale instead."
            )

        with transaction.atomic():
            sale = super().update(instance, validated_data)

            if payments_data is None:
                return sale

            old_payments = list(sale.payments.select_related("method").all())
            old_entries = [(p.method, p.amount) for p in old_payments]
            apply_sale_bank_sync(
                old_entries, "subtract", note=f"Sale #{sale.id} updated"
            )

            sale.payments.all().delete()

            payment_total = 0
            new_entries = []
            for pay in payments_data:
                method_id = pay.get("method_id")
                amount = pay.get("amount", 0)

                if amount <= 0:
                    raise serializers.ValidationError(
                        "Payment amount must be greater than 0"
                    )

                try:
                    method = PaymentMethod.objects.get(id=method_id, is_active=True)
                except PaymentMethod.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Payment method with id {method_id} not found or inactive"
                    )

                SalePayment.objects.create(sale=sale, method=method, amount=amount)
                new_entries.append((method, amount))
                payment_total += amount

            if payment_total < sale.total_amount:
                raise serializers.ValidationError(
                    "Payment amount is less than Total Bill."
                )

            apply_sale_bank_sync(new_entries, "add", note=f"Sale #{sale.id} updated")

        return sale


class DailyClosingSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source="closed_by.username", read_only=True)

    class Meta:
        model = DailyClosing
        fields = "__all__"
        read_only_fields = (
            "total_sales_expected",
            "cash_discrepancy",
            "closed_by",
            "date",
        )
