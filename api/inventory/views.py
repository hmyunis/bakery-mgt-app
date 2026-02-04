from django.db import transaction
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from treasury.models import Expense
from treasury.serializers import ExpenseSerializer

from .models import Ingredient, Purchase, StockAdjustment
from .serializers import (
    IngredientSerializer,
    PurchaseSerializer,
    StockAdjustmentSerializer,
)


class IsStoreKeeperOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        if view.action in ["list", "retrieve"]:
            # Chef needs to see stock
            return request.user.role in ["admin", "storekeeper", "chef"]
        return request.user.role in ["admin", "storekeeper"]


class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [IsStoreKeeperOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["name"]

    @action(detail=False, methods=["get"])
    def shopping_list(self, request):
        """
        Returns items where current_stock <= reorder_point.
        Also returns a formatted string for SMS/Telegram.
        """
        low_stock_items = Ingredient.objects.filter(
            current_stock__lte=F("reorder_point")
        )
        serializer = self.get_serializer(low_stock_items, many=True)

        # Create Shareable String
        message_lines = ["🛒 *Bakery Shopping List*"]
        for item in low_stock_items:
            shortfall = item.reorder_point - item.current_stock
            # Suggest buying at least double the shortfall or a round number
            to_buy = max(shortfall * 2, 10)  # Simple logic
            message_lines.append(f"- {item.name}: Need approx {to_buy:.0f} {item.unit}")

        share_text = "\n".join(message_lines)

        return Response({"items": serializer.data, "share_text": share_text})


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related("ingredient", "purchaser").order_by(
        "-purchase_date"
    )
    serializer_class = PurchaseSerializer
    permission_classes = [IsStoreKeeperOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["ingredient", "is_price_anomaly"]

    def get_queryset(self):
        queryset = super().get_queryset()
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(purchaser=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.expense_id:
            expense = instance.expense
            serializer = ExpenseSerializer(
                expense,
                data={"status": Expense.STATUS_PENDING, "account": None},
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            instance.expense = None
            instance.save(update_fields=["expense"])
            expense.delete()
        instance.delete()


class StockAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = StockAdjustment.objects.select_related("ingredient", "actor").order_by(
        "-timestamp"
    )
    serializer_class = StockAdjustmentSerializer
    permission_classes = [IsStoreKeeperOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["ingredient"]

    def get_queryset(self):
        queryset = super().get_queryset()
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(actor=self.request.user)
