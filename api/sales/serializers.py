from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Sum
from rest_framework import serializers

from production.models import Product

from .models import (
    DailyClosing,
    PaymentMethod,
    Sale,
    SaleItem,
    SalePayment,
    ShiftSession,
    ShiftSessionProductCount,
)
from .services import apply_sale_bank_sync

User = get_user_model()


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


class ShiftSessionCountInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    opening_count = serializers.IntegerField(required=False, min_value=0)
    closing_count = serializers.IntegerField(required=False, min_value=0)


class ShiftSessionProductCountSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ShiftSessionProductCount
        fields = [
            "id",
            "product",
            "product_name",
            "opening_count",
            "expected_closing_count",
            "closing_count",
            "variance",
        ]


class ShiftSessionSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source="opened_by.username", read_only=True)
    opened_by_full_name = serializers.CharField(
        source="opened_by.full_name", read_only=True, allow_null=True
    )
    closed_by_name = serializers.CharField(source="closed_by.username", read_only=True)
    accepted_by_name = serializers.CharField(
        source="accepted_by.username", read_only=True
    )
    product_counts = ShiftSessionProductCountSerializer(many=True, read_only=True)

    class Meta:
        model = ShiftSession
        fields = [
            "id",
            "status",
            "opened_by",
            "opened_by_name",
            "opened_by_full_name",
            "opened_at",
            "open_notes",
            "closed_by",
            "closed_by_name",
            "closed_at",
            "close_notes",
            "total_cash_declared",
            "total_digital_declared",
            "accepted_by",
            "accepted_by_name",
            "accepted_at",
            "acceptance_notes",
            "previous_session",
            "product_counts",
        ]
        read_only_fields = [
            "opened_by",
            "opened_at",
            "closed_by",
            "closed_at",
            "accepted_by",
            "accepted_at",
            "status",
            "previous_session",
        ]


class ShiftSessionOpenSerializer(serializers.Serializer):
    open_notes = serializers.CharField(required=False, allow_blank=True)
    cashier = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="cashier", is_active=True),
        required=False,
    )
    counts = ShiftSessionCountInputSerializer(many=True)

    def validate_counts(self, counts):
        active_products = Product.objects.filter(is_active=True).values_list(
            "id", flat=True
        )
        active_ids = set(active_products)
        incoming_ids = [row["product_id"] for row in counts]

        if len(incoming_ids) != len(set(incoming_ids)):
            raise serializers.ValidationError(
                "Duplicate products are not allowed in counts."
            )

        if active_ids != set(incoming_ids):
            raise serializers.ValidationError(
                "Opening counts must include all active products exactly once."
            )

        for row in counts:
            if "opening_count" not in row:
                raise serializers.ValidationError(
                    f"opening_count is required for product {row['product_id']}."
                )

        return counts

    def validate(self, attrs):
        request = self.context["request"]
        request_user = request.user
        selected_cashier = attrs.get("cashier")

        if request_user.role == "admin":
            if not selected_cashier:
                raise serializers.ValidationError(
                    {"cashier": "cashier is required when admin opens a shift."}
                )
            return attrs

        if request_user.role == "cashier":
            if selected_cashier and selected_cashier.id != request_user.id:
                raise serializers.ValidationError(
                    {"cashier": "Cashier can only open shift for self."}
                )
            attrs["cashier"] = request_user
            return attrs

        raise serializers.ValidationError(
            {"detail": "Only admin or cashier can open shift sessions."}
        )

    def create(self, validated_data):
        counts = validated_data.get("counts", [])
        request = self.context["request"]
        target_cashier = validated_data.get("cashier") or request.user

        if ShiftSession.objects.filter(
            status=ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE
        ).exists():
            raise serializers.ValidationError(
                (
                    "Cannot open new shift while another shift is "
                    "pending handover acceptance."
                )
            )

        latest_session = ShiftSession.objects.order_by("-opened_at").first()
        previous_closed_session = (
            ShiftSession.objects.filter(status=ShiftSession.STATUS_CLOSED)
            .order_by("-opened_at")
            .first()
        )

        if latest_session and latest_session.status != ShiftSession.STATUS_CLOSED:
            raise serializers.ValidationError(
                "Cannot open new shift while previous shift is not fully closed."
            )

        session = ShiftSession.objects.create(
            opened_by=target_cashier,
            open_notes=validated_data.get("open_notes", ""),
            previous_session=previous_closed_session,
            status=ShiftSession.STATUS_OPENED,
        )

        products = {
            p.id: p
            for p in Product.objects.filter(id__in=[c["product_id"] for c in counts])
        }
        count_rows = [
            ShiftSessionProductCount(
                session=session,
                product=products[row["product_id"]],
                opening_count=row["opening_count"],
            )
            for row in counts
        ]
        ShiftSessionProductCount.objects.bulk_create(count_rows)

        return session


class ShiftSessionCloseSerializer(serializers.Serializer):
    close_notes = serializers.CharField(required=False, allow_blank=True)
    total_cash_declared = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_digital_declared = serializers.DecimalField(max_digits=12, decimal_places=2)
    counts = ShiftSessionCountInputSerializer(many=True)

    def validate_counts(self, counts):
        active_products = Product.objects.filter(is_active=True).values_list(
            "id", flat=True
        )
        active_ids = set(active_products)
        incoming_ids = [row["product_id"] for row in counts]

        if len(incoming_ids) != len(set(incoming_ids)):
            raise serializers.ValidationError(
                "Duplicate products are not allowed in counts."
            )

        if active_ids != set(incoming_ids):
            raise serializers.ValidationError(
                "Closing counts must include all active products exactly once."
            )

        for row in counts:
            if "closing_count" not in row:
                raise serializers.ValidationError(
                    f"closing_count is required for product {row['product_id']}."
                )

        return counts

    def validate(self, attrs):
        if attrs["total_cash_declared"] < 0 or attrs["total_digital_declared"] < 0:
            raise serializers.ValidationError(
                "Declared cash and digital totals cannot be negative."
            )
        return attrs


class ShiftSessionAcceptSerializer(serializers.Serializer):
    acceptance_notes = serializers.CharField(required=False, allow_blank=True)


class SalePaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=Sale.PAYMENT_STATUS_CHOICES)
    unpaid_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        payment_status = attrs.get("payment_status", Sale.PAYMENT_STATUS_PAID)
        unpaid_reason = (attrs.get("unpaid_reason") or "").strip()

        if payment_status == Sale.PAYMENT_STATUS_UNPAID_APPROVED and not unpaid_reason:
            raise serializers.ValidationError(
                {"unpaid_reason": "unpaid_reason is required for unpaid sales."}
            )
        if payment_status == Sale.PAYMENT_STATUS_PAID:
            attrs["unpaid_reason"] = ""
        else:
            attrs["unpaid_reason"] = unpaid_reason
        return attrs


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    payments = serializers.SerializerMethodField()
    cashier_name = serializers.CharField(source="cashier.username", read_only=True)
    approved_by = serializers.PrimaryKeyRelatedField(read_only=True)
    approved_by_name = serializers.CharField(
        source="approved_by.username", read_only=True
    )

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
            "shift_session",
            "payment_status",
            "unpaid_reason",
            "approved_by",
            "approved_by_name",
            "receipt_issued",
            "items",
            "payments",
            "items_input",
            "payments_input",
        ]
        read_only_fields = (
            "total_amount",
            "created_at",
            "cashier",
            "cashier_name",
            "shift_session",
            "approved_by_name",
        )

    def get_payments(self, obj):
        if isinstance(obj, dict):
            return []
        return list(obj.payments.values("method__name", "amount"))

    def _validate_unpaid_requirements(
        self, payment_status, unpaid_reason, total_amount, payment_total
    ):
        if payment_status == Sale.PAYMENT_STATUS_UNPAID_APPROVED:
            if not (unpaid_reason or "").strip():
                raise serializers.ValidationError(
                    {
                        "unpaid_reason": (
                            "unpaid_reason is required for unpaid approved sales."
                        )
                    }
                )
            if payment_total >= total_amount:
                raise serializers.ValidationError(
                    {
                        "payment_status": (
                            "Unpaid approved sale must have outstanding balance."
                        )
                    }
                )

    def _get_required_shift_session(self, user):
        active_session = (
            ShiftSession.objects.select_for_update()
            .filter(status=ShiftSession.STATUS_OPENED)
            .order_by("-opened_at")
            .first()
        )
        if not active_session:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "No active shift session. Open a shift before creating sales."
                    )
                }
            )
        if (
            getattr(user, "role", None) == "cashier"
            and active_session.opened_by_id != user.id
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Active shift is not owned by this cashier. "
                        "Complete handover first."
                    )
                }
            )
        return active_session

    def create(self, validated_data):
        items_data = validated_data.pop("items_input", None)
        payments_data = validated_data.pop("payments_input", None) or []
        receipt_issued = validated_data.pop("receipt_issued", False)
        payment_status = validated_data.pop("payment_status", Sale.PAYMENT_STATUS_PAID)
        unpaid_reason = validated_data.pop("unpaid_reason", "")

        if not items_data:
            raise serializers.ValidationError("items_input is required.")
        if payment_status == Sale.PAYMENT_STATUS_PAID and not payments_data:
            raise serializers.ValidationError(
                "payments_input is required for paid sales."
            )

        with transaction.atomic():
            request_user = self.context["request"].user
            shift_session = self._get_required_shift_session(request_user)

            sale = Sale.objects.create(
                cashier=request_user,
                shift_session=shift_session,
                payment_status=payment_status,
                unpaid_reason=unpaid_reason,
                approved_by=None,
                receipt_issued=receipt_issued,
            )

            total_amount = 0

            for item in items_data:
                product_id = item.get("product_id")
                qty = item.get("quantity", 0)

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

                product.stock_quantity = F("stock_quantity") - qty
                product.save(update_fields=["stock_quantity"])

            payment_total = 0
            payment_entries = []
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
                payment_entries.append((method, amount))
                payment_total += amount

            if (
                payment_status == Sale.PAYMENT_STATUS_PAID
                and payment_total < total_amount
            ):
                raise serializers.ValidationError(
                    "Payment amount is less than Total Bill."
                )

            self._validate_unpaid_requirements(
                payment_status, unpaid_reason, total_amount, payment_total
            )

            sale.total_amount = total_amount
            sale.save(update_fields=["total_amount"])

            apply_sale_bank_sync(
                payment_entries, "add", note=f"Sale #{sale.id} created"
            )

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
        payment_status = validated_data.get("payment_status", instance.payment_status)
        unpaid_reason = validated_data.get("unpaid_reason", instance.unpaid_reason)

        if items_data:
            raise serializers.ValidationError(
                "Editing sale items is not supported. Create a new sale instead."
            )

        with transaction.atomic():
            sale = super().update(instance, validated_data)

            if payments_data is None:
                existing_total = (
                    sale.payments.aggregate(total=Sum("amount")).get("total") or 0
                )
                if (
                    sale.payment_status == Sale.PAYMENT_STATUS_PAID
                    and existing_total < sale.total_amount
                ):
                    raise serializers.ValidationError(
                        "Payment amount is less than Total Bill."
                    )
                self._validate_unpaid_requirements(
                    payment_status,
                    unpaid_reason,
                    sale.total_amount,
                    existing_total,
                )
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

            if (
                payment_status == Sale.PAYMENT_STATUS_PAID
                and payment_total < sale.total_amount
            ):
                raise serializers.ValidationError(
                    "Payment amount is less than Total Bill."
                )

            self._validate_unpaid_requirements(
                payment_status,
                unpaid_reason,
                sale.total_amount,
                payment_total,
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
