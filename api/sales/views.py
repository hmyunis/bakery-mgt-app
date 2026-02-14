from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DailyClosing, PaymentMethod, Sale, SaleItem, SalePayment
from .serializers import DailyClosingSerializer, PaymentMethodSerializer, SaleSerializer
from .services import apply_sale_bank_sync


class IsCashierOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        if view.action in ["create"]:
            return True  # Cashier creates sales
        # Allow cashiers to list and retrieve sales
        if view.action in ["list", "retrieve"] and request.user.role == "cashier":
            return True
        return request.user.role == "admin"


class IsAdmin(permissions.BasePermission):
    """Admin-only permission for payment method management."""

    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        # Admin can do everything, others can only read active methods
        if view.action in ["list", "retrieve"]:
            return request.user.is_authenticated
        return request.user.role == "admin"


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    Admin can manage payment methods (CRUD).
    Cashiers can see active methods (read-only).
    """

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        # Admins see all, others see only active
        if self.request.user.role == "admin":
            return PaymentMethod.objects.all()
        return PaymentMethod.objects.filter(is_active=True)


class SaleViewSet(viewsets.ModelViewSet):
    queryset = (
        Sale.objects.select_related("cashier")
        .prefetch_related("items__product", "payments__method")
        .order_by("-created_at")
    )
    serializer_class = SaleSerializer
    permission_classes = [IsCashierOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["cashier", "receipt_issued"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Cashiers can only see their own sales (list + retrieve + filters).
        if getattr(user, "role", None) == "cashier":
            queryset = queryset.filter(cashier=user)

        # Use aware datetime boundaries instead of `created_at__date` extraction.
        # This avoids DB timezone/date-cast differences across environments.
        current_tz = timezone.get_current_timezone()

        start_date_raw = self.request.query_params.get("start_date")
        if start_date_raw:
            start_date = parse_date(start_date_raw)
            if start_date:
                start_dt = timezone.make_aware(
                    datetime.combine(start_date, datetime.min.time()), current_tz
                )
                queryset = queryset.filter(created_at__gte=start_dt)

        end_date_raw = self.request.query_params.get("end_date")
        if end_date_raw:
            end_date = parse_date(end_date_raw)
            if end_date:
                end_dt = timezone.make_aware(
                    datetime.combine(end_date, datetime.max.time()), current_tz
                )
                queryset = queryset.filter(created_at__lte=end_dt)

        return queryset

    @action(detail=False, methods=["get"], url_path="cashier-statement")
    def cashier_statement(self, request):
        """
        Admin-only statement for a specific cashier.
        Supports optional start_time/end_time ISO datetime range filtering.
        """
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can access cashier statements."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cashier_id = request.query_params.get("cashier")
        if not cashier_id:
            return Response(
                {"detail": "cashier query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        try:
            cashier = User.objects.get(id=int(cashier_id), role="cashier")
        except (TypeError, ValueError):
            return Response(
                {"detail": "cashier must be a valid user id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Cashier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        start_time_raw = request.query_params.get("start_time")
        end_time_raw = request.query_params.get("end_time")

        start_time = None
        end_time = None

        if start_time_raw:
            start_time = parse_datetime(start_time_raw)
            if start_time is None:
                return Response(
                    {"detail": "start_time must be a valid ISO datetime."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if timezone.is_naive(start_time):
                start_time = timezone.make_aware(
                    start_time, timezone.get_current_timezone()
                )

        if end_time_raw:
            end_time = parse_datetime(end_time_raw)
            if end_time is None:
                return Response(
                    {"detail": "end_time must be a valid ISO datetime."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if timezone.is_naive(end_time):
                end_time = timezone.make_aware(
                    end_time, timezone.get_current_timezone()
                )

        if start_time and end_time and start_time > end_time:
            return Response(
                {"detail": "start_time must be before or equal to end_time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sales_queryset = (
            Sale.objects.select_related("cashier")
            .prefetch_related("items__product", "payments__method")
            .filter(cashier=cashier)
            .order_by("-created_at")
        )
        if start_time:
            sales_queryset = sales_queryset.filter(created_at__gte=start_time)
        if end_time:
            sales_queryset = sales_queryset.filter(created_at__lte=end_time)

        sale_count = sales_queryset.count()
        total_money = sales_queryset.aggregate(total=Sum("total_amount"))[
            "total"
        ] or Decimal("0")

        payment_breakdown = (
            SalePayment.objects.filter(sale__in=sales_queryset)
            .values("method_id", "method__name")
            .annotate(
                total_amount=Sum("amount"),
                sale_count=Count("sale", distinct=True),
            )
            .order_by("method__name")
        )

        product_breakdown = (
            SaleItem.objects.filter(sale__in=sales_queryset)
            .values("product_id", "product__name")
            .annotate(
                quantity_sold=Sum("quantity"),
                total_amount=Sum("subtotal"),
            )
            .order_by("-quantity_sold", "product__name")
        )

        sales_data = SaleSerializer(
            sales_queryset, many=True, context={"request": request}
        ).data

        return Response(
            {
                "cashier": {
                    "id": cashier.id,
                    "username": cashier.username,
                    "full_name": cashier.full_name,
                    "phone_number": cashier.phone_number,
                },
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
                "summary": {
                    "sale_count": sale_count,
                    "total_money_collected": float(total_money),
                },
                "payment_method_totals": [
                    {
                        "method_id": row["method_id"],
                        "method_name": row["method__name"],
                        "amount": float(row["total_amount"] or 0),
                        "sale_count": row["sale_count"],
                    }
                    for row in payment_breakdown
                ],
                "product_totals": [
                    {
                        "product_id": row["product_id"],
                        "product_name": row["product__name"],
                        "quantity_sold": int(row["quantity_sold"] or 0),
                        "amount": float(row["total_amount"] or 0),
                    }
                    for row in product_breakdown
                ],
                "sales": sales_data,
            }
        )

    def perform_create(self, serializer):
        # Serializer handles the full transaction (items, payments,
        # stock deduction) in SaleSerializer.create()
        serializer.save()

    def perform_destroy(self, instance):
        """
        Delete a sale and reverse stock changes:
        - Add back product stock for each SaleItem
        - Delete the sale (cascades to SaleItem + SalePayment)
        """
        with transaction.atomic():
            payments = list(instance.payments.select_related("method").all())
            payment_entries = [(p.method, p.amount) for p in payments]
            apply_sale_bank_sync(
                payment_entries, "subtract", note=f"Sale #{instance.id} deleted"
            )

            # Lock all involved products and restock
            for item in instance.items.select_related("product").all():
                item.product.stock_quantity = F("stock_quantity") + item.quantity
                item.product.save(update_fields=["stock_quantity"])

            instance.delete()


class DailyClosingViewSet(viewsets.ModelViewSet):
    queryset = DailyClosing.objects.order_by("-date")
    serializer_class = DailyClosingSerializer
    permission_classes = [permissions.IsAuthenticated]  # Cashier needs to Create

    def create(self, request, *args, **kwargs):
        """
        The Blind Reconciliation Process.
        1. Calculate Expected Sales for Today (since midnight).
        2. Compare with User Input.
        3. Save Discrepancy.
        """
        today = timezone.now().date()

        # Check if already closed today
        if DailyClosing.objects.filter(date=today).exists():
            return Response(
                {"message": "Day already closed."}, status=status.HTTP_400_BAD_REQUEST
            )

        # 1. System Calculation
        todays_sales = Sale.objects.filter(created_at__date=today)
        total_expected = (
            todays_sales.aggregate(Sum("total_amount"))["total_amount__sum"] or 0
        )

        # 2. User Input (Declared)
        try:
            declared_cash = float(request.data.get("total_cash_declared", 0))
            declared_digital = float(request.data.get("total_digital_declared", 0))
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid values for cash or digital amounts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if declared_cash < 0 or declared_digital < 0:
            return Response(
                {"error": "Cash and digital amounts cannot be negative."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_declared = declared_cash + declared_digital

        # 3. Discrepancy
        discrepancy = total_declared - float(total_expected)

        closing = DailyClosing.objects.create(
            closed_by=request.user,
            total_sales_expected=total_expected,
            total_cash_declared=declared_cash,
            total_digital_declared=declared_digital,
            cash_discrepancy=discrepancy,
            notes=request.data.get("notes", ""),
        )

        # Send notification
        from notifications.models import NotificationEvent
        from notifications.services import send_notification

        send_notification(
            NotificationEvent.EOD_CLOSING,
            {
                "discrepancy": str(discrepancy),
                "total_expected": str(total_expected),
                "total_declared": str(total_declared),
                "closed_by": request.user.username,
            },
        )

        # Determine Response (Don't reveal too much if it's a cashier?)
        # Actually, standard practice: Show them the result so they know
        # if they are short.
        serializer = self.get_serializer(closing)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
