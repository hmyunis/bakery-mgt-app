from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.exceptions import ValidationError

from .models import BankAccount, BankTransaction, Expense
from .serializers import (
    BankAccountSerializer,
    BankTransactionSerializer,
    ExpenseSerializer,
)
from .services import record_bank_activity


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.prefetch_related("linked_payment_methods").all()
    serializer_class = BankAccountSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name", "bank_name", "account_number", "account_holder"]
    ordering_fields = ["name", "bank_name", "balance", "updated_at", "created_at"]


class BankTransactionViewSet(viewsets.ModelViewSet):
    queryset = BankTransaction.objects.select_related("account", "recorded_by").all()
    serializer_class = BankTransactionSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["account", "transaction_type"]
    search_fields = [
        "notes",
        "account__name",
        "account__bank_name",
        "account__account_number",
    ]
    ordering_fields = ["created_at", "amount"]

    def get_queryset(self):
        queryset = super().get_queryset().order_by("-created_at")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        account = BankAccount.objects.select_for_update().get(pk=instance.account_id)
        delta = (
            instance.amount
            if instance.transaction_type == BankTransaction.TYPE_DEPOSIT
            else -instance.amount
        )
        account.balance = account.balance - delta
        if account.balance < 0:
            raise ValidationError(
                "Deleting this transaction would make balance negative."
            )
        account.save(update_fields=["balance"])
        instance.delete()


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("account", "recorded_by").all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "account"]
    search_fields = [
        "title",
        "notes",
        "account__name",
        "account__bank_name",
        "account__account_number",
        "recorded_by__username",
    ]
    ordering_fields = ["created_at", "amount"]

    def get_queryset(self):
        queryset = super().get_queryset().order_by("-created_at")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.account and instance.status == Expense.STATUS_PAID:
            record_bank_activity(
                account=instance.account,
                transaction_type=BankTransaction.TYPE_DEPOSIT,
                amount=instance.amount,
                notes=f"{instance.title} (Expense #{instance.id} deleted)",
                recorded_by=instance.recorded_by,
            )
        instance.delete()
