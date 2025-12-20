from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import DailyClosing, PaymentMethod, Sale
from .serializers import DailyClosingSerializer, PaymentMethodSerializer, SaleSerializer


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
    filterset_fields = ["cashier"]

    def get_queryset(self):
        queryset = super().get_queryset()
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        return queryset

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
