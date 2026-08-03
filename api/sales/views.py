from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from production.models import Product, ProductionRun

from .models import (
    DailyClosing,
    PaymentMethod,
    Sale,
    SaleItem,
    SalePayment,
    ShiftSession,
    ShiftSessionProductCount,
)
from .serializers import (
    DailyClosingSerializer,
    PaymentMethodSerializer,
    SalePaymentStatusSerializer,
    SaleSerializer,
    ShiftSessionAcceptSerializer,
    ShiftSessionCloseSerializer,
    ShiftSessionOpenSerializer,
    ShiftSessionReconciliationUpdateSerializer,
    ShiftSessionSerializer,
)
from .services import apply_sale_bank_sync


class IsCashierOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and request.user.has_page_permission("sales")
        )


class IsAdmin(permissions.BasePermission):
    """Admin-only permission for payment method management."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if view.action in ["list", "retrieve"]:
            return request.user.has_page_permission(
                "sales"
            ) or request.user.has_page_permission("treasury")
        return request.user.has_page_permission("treasury")


class IsCashierOrAdminForShiftSession(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        return request.user.has_page_permission("sales")


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    Admin can manage payment methods (CRUD).
    Cashiers can see active methods (read-only).
    """

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        if self.request.user.has_page_permission("treasury"):
            return PaymentMethod.objects.all()
        return PaymentMethod.objects.filter(is_active=True)


class ShiftSessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ShiftSession.objects.select_related(
        "opened_by", "closed_by", "accepted_by", "previous_session"
    ).prefetch_related("product_counts__product")
    serializer_class = ShiftSessionSerializer
    permission_classes = [IsCashierOrAdminForShiftSession]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "opened_by", "accepted_by"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if getattr(user, "role", None) == "staff":
            queryset = queryset.filter(
                Q(opened_by=user)
                | Q(status=ShiftSession.STATUS_CLOSED)
                | Q(status=ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE)
            )

        start_date_raw = self.request.query_params.get("start_date")
        if start_date_raw:
            start_date = parse_date(start_date_raw)
            if start_date:
                start_dt = timezone.make_aware(
                    datetime.combine(start_date, datetime.min.time()),
                    timezone.get_current_timezone(),
                )
                queryset = queryset.filter(opened_at__gte=start_dt)

        end_date_raw = self.request.query_params.get("end_date")
        if end_date_raw:
            end_date = parse_date(end_date_raw)
            if end_date:
                end_dt = timezone.make_aware(
                    datetime.combine(end_date, datetime.max.time()),
                    timezone.get_current_timezone(),
                )
                queryset = queryset.filter(opened_at__lte=end_dt)

        return queryset

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        opened = (
            ShiftSession.objects.select_related("opened_by")
            .prefetch_related("product_counts__product")
            .filter(status=ShiftSession.STATUS_OPENED)
            .order_by("-opened_at")
            .first()
        )
        pending = (
            ShiftSession.objects.select_related("opened_by")
            .prefetch_related("product_counts__product")
            .filter(status=ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE)
            .order_by("-opened_at")
            .first()
        )

        return Response(
            {
                "opened_session": ShiftSessionSerializer(
                    opened, context={"request": request}
                ).data
                if opened
                else None,
                "pending_session": ShiftSessionSerializer(
                    pending, context={"request": request}
                ).data
                if pending
                else None,
            }
        )

    @action(detail=False, methods=["post"], url_path="open")
    def open_shift(self, request):
        if not request.user.has_page_permission("sales"):
            return Response(
                {"detail": "Sales permission is required to open shift sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ShiftSessionOpenSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            session = serializer.save()

        return Response(
            ShiftSessionSerializer(session, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="close")
    def close_shift(self, request, pk=None):
        session = self.get_object()

        if session.status != ShiftSession.STATUS_OPENED:
            return Response(
                {"detail": "Only opened sessions can be closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == "staff" and session.opened_by_id != request.user.id:
            return Response(
                {"detail": "Cashier can only close own opened session."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ShiftSessionCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        count_by_product = {
            row["product_id"]: row["closing_count"] for row in data["counts"]
        }

        with transaction.atomic():
            session = ShiftSession.objects.select_for_update().get(id=session.id)
            closed_at = timezone.now()

            produced_rows = (
                ProductionRun.objects.filter(
                    product__isnull=False,
                    date_produced__gte=session.opened_at,
                    date_produced__lte=closed_at,
                )
                .values("product_id")
                .annotate(total_qty=Sum("quantity_produced"))
            )
            produced_map = {
                row["product_id"]: int(row["total_qty"] or 0) for row in produced_rows
            }

            paid_rows = (
                SaleItem.objects.filter(
                    sale__shift_session=session,
                    sale__payment_status=Sale.PAYMENT_STATUS_PAID,
                )
                .values("product_id")
                .annotate(total_qty=Sum("quantity"))
            )
            paid_map = {
                row["product_id"]: int(row["total_qty"] or 0) for row in paid_rows
            }

            unpaid_rows = (
                SaleItem.objects.filter(
                    sale__shift_session=session,
                    sale__payment_status=Sale.PAYMENT_STATUS_UNPAID_APPROVED,
                )
                .values("product_id")
                .annotate(total_qty=Sum("quantity"))
            )
            unpaid_map = {
                row["product_id"]: int(row["total_qty"] or 0) for row in unpaid_rows
            }

            active_products = Product.objects.select_for_update().filter(is_active=True)
            for product in active_products:
                row, _created = ShiftSessionProductCount.objects.get_or_create(
                    session=session,
                    product=product,
                    defaults={"opening_count": 0},
                )

                opening_count = int(row.opening_count or 0)
                produced_qty = int(produced_map.get(product.id, 0))
                paid_qty = int(paid_map.get(product.id, 0))
                unpaid_qty = int(unpaid_map.get(product.id, 0))
                expected = opening_count + produced_qty - paid_qty - unpaid_qty
                closing_count = int(count_by_product.get(product.id, 0))
                variance = closing_count - expected

                row.expected_closing_count = expected
                row.closing_count = closing_count
                row.closing_stock_before_override = product.stock_quantity
                row.variance = variance
                row.save(
                    update_fields=[
                        "expected_closing_count",
                        "closing_count",
                        "closing_stock_before_override",
                        "variance",
                    ]
                )
                product.stock_quantity = closing_count
                product.save(update_fields=["stock_quantity"])

            session.closed_by = request.user
            session.closed_at = closed_at
            session.close_notes = data.get("close_notes", "")
            session.total_cash_declared = data["total_cash_declared"]
            session.total_digital_declared = data["total_digital_declared"]
            session.status = ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE
            session.save(
                update_fields=[
                    "closed_by",
                    "closed_at",
                    "close_notes",
                    "total_cash_declared",
                    "total_digital_declared",
                    "status",
                ]
            )

        return Response(
            ShiftSessionSerializer(session, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="accept")
    def accept_shift(self, request, pk=None):
        session = self.get_object()
        serializer = ShiftSessionAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if session.status != ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE:
            return Response(
                {
                    "detail": (
                        "Only sessions pending handover acceptance can be accepted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == "staff" and session.opened_by_id == request.user.id:
            return Response(
                {"detail": "Cashier cannot accept own session handover."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.accepted_by = request.user
        session.accepted_at = timezone.now()
        session.acceptance_notes = serializer.validated_data.get("acceptance_notes", "")
        session.status = ShiftSession.STATUS_CLOSED
        session.save(
            update_fields=["accepted_by", "accepted_at", "acceptance_notes", "status"]
        )
        return Response(
            ShiftSessionSerializer(session, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen_shift(self, request, pk=None):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can reopen shift sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        session = self.get_object()
        if session.status != ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE:
            return Response(
                {
                    "detail": (
                        "Only sessions pending handover acceptance can be reopened."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not session.closed_by or (
            getattr(session.closed_by, "role", None) != "staff"
        ):
            return Response(
                {"detail": "Only shifts closed by a cashier can be reopened."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            session = ShiftSession.objects.select_for_update().get(id=session.id)

            if session.status != ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE:
                return Response(
                    {
                        "detail": (
                            "Only sessions pending handover acceptance can be reopened."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            session.status = ShiftSession.STATUS_OPENED
            session.closed_at = None
            session.save(update_fields=["status", "closed_at"])

        return Response(
            ShiftSessionSerializer(session, context={"request": request}).data
        )

    @action(detail=True, methods=["get", "patch"], url_path="reconciliation")
    def reconciliation(self, request, pk=None):
        session = self.get_object()

        if request.method == "PATCH":
            if request.user.role != "admin":
                return Response(
                    {"detail": "Only admins can edit reconciliation reports."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = ShiftSessionReconciliationUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            with transaction.atomic():
                session = ShiftSession.objects.select_for_update().get(pk=session.pk)
                counts = data.get("counts", [])
                rows = {
                    row.product_id: row
                    for row in session.product_counts.select_for_update().all()
                }
                unknown_ids = {row["product_id"] for row in counts} - set(rows)
                if unknown_ids:
                    return Response(
                        {"detail": "One or more products are not part of this report."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                update_fields = []
                for field in [
                    "open_notes",
                    "close_notes",
                    "total_cash_declared",
                    "total_digital_declared",
                ]:
                    if field in data:
                        setattr(session, field, data[field])
                        update_fields.append(field)
                if update_fields:
                    session.save(update_fields=update_fields)

                for values in counts:
                    count = rows[values["product_id"]]
                    fields = []
                    if "opening_count" in values:
                        opening_delta = values["opening_count"] - count.opening_count
                        count.opening_count = values["opening_count"]
                        fields.append("opening_count")
                        if count.expected_closing_count is not None:
                            count.expected_closing_count += opening_delta
                            fields.append("expected_closing_count")
                    if "closing_count" in values:
                        count.closing_count = values["closing_count"]
                        fields.append("closing_count")
                    if (
                        count.closing_count is not None
                        and count.expected_closing_count is not None
                    ):
                        count.variance = (
                            count.closing_count - count.expected_closing_count
                        )
                        fields.append("variance")
                    if fields:
                        count.save(update_fields=list(dict.fromkeys(fields)))

        end_time = session.closed_at or timezone.now()
        produced_rows = (
            ProductionRun.objects.filter(
                product__isnull=False,
                date_produced__gte=session.opened_at,
                date_produced__lte=end_time,
            )
            .values("product_id")
            .annotate(total_qty=Sum("quantity_produced"))
        )
        produced_map = {
            row["product_id"]: int(row["total_qty"] or 0) for row in produced_rows
        }

        paid_rows = (
            SaleItem.objects.filter(
                sale__shift_session=session,
                sale__payment_status=Sale.PAYMENT_STATUS_PAID,
            )
            .values("product_id")
            .annotate(total_qty=Sum("quantity"))
        )
        paid_map = {row["product_id"]: int(row["total_qty"] or 0) for row in paid_rows}

        unpaid_rows = (
            SaleItem.objects.filter(
                sale__shift_session=session,
                sale__payment_status=Sale.PAYMENT_STATUS_UNPAID_APPROVED,
            )
            .values("product_id")
            .annotate(total_qty=Sum("quantity"))
        )
        unpaid_map = {
            row["product_id"]: int(row["total_qty"] or 0) for row in unpaid_rows
        }

        rows = []
        totals = {
            "opening_total_qty": 0,
            "produced_total_qty": 0,
            "paid_sold_total_qty": 0,
            "unpaid_total_qty": 0,
            "expected_total_qty": 0,
            "closing_total_qty": 0,
            "variance_total_qty": 0,
            "variance_total_value": Decimal("0"),
        }
        product_counts = session.product_counts.select_related("product").order_by(
            "product__name"
        )
        for count in product_counts:
            opening_qty = int(count.opening_count or 0)
            produced_qty = int(produced_map.get(count.product_id, 0))
            paid_qty = int(paid_map.get(count.product_id, 0))
            unpaid_qty = int(unpaid_map.get(count.product_id, 0))
            expected_qty = opening_qty + produced_qty - paid_qty - unpaid_qty

            closing_qty = (
                int(count.closing_count)
                if count.closing_count is not None
                else count.expected_closing_count
            )
            variance_qty = None
            variance_value = None
            if closing_qty is not None:
                variance_qty = int(closing_qty) - expected_qty
                variance_value = Decimal(variance_qty) * (
                    count.product.selling_price or 0
                )

                totals["closing_total_qty"] += int(closing_qty)
                totals["variance_total_qty"] += int(variance_qty)
                totals["variance_total_value"] += variance_value

            totals["opening_total_qty"] += opening_qty
            totals["produced_total_qty"] += produced_qty
            totals["paid_sold_total_qty"] += paid_qty
            totals["unpaid_total_qty"] += unpaid_qty
            totals["expected_total_qty"] += expected_qty

            rows.append(
                {
                    "product_id": count.product_id,
                    "product_name": count.product.name,
                    "unit_price": float(count.product.selling_price or 0),
                    "opening_count": opening_qty,
                    "opening_stock_before_override": (
                        count.opening_stock_before_override
                    ),
                    "opening_stock_mismatch": (
                        count.opening_stock_before_override is not None
                        and int(count.opening_stock_before_override) != opening_qty
                    ),
                    "produced_in_shift": produced_qty,
                    "paid_sold_qty": paid_qty,
                    "unpaid_qty": unpaid_qty,
                    "expected_closing_count": expected_qty,
                    "counted_closing_count": int(closing_qty)
                    if closing_qty is not None
                    else None,
                    "closing_stock_before_override": (
                        count.closing_stock_before_override
                    ),
                    "closing_stock_mismatch": (
                        count.closing_stock_before_override is not None
                        and closing_qty is not None
                        and int(count.closing_stock_before_override) != int(closing_qty)
                    ),
                    "variance_qty": variance_qty,
                    "variance_value": float(variance_value)
                    if variance_value is not None
                    else None,
                }
            )

        session_sales = Sale.objects.filter(shift_session=session)
        sale_agg = session_sales.aggregate(
            sale_count=Count("id"),
            billed_total=Sum("total_amount"),
        )
        payment_collected = SalePayment.objects.filter(
            sale__shift_session=session,
            sale__payment_status=Sale.PAYMENT_STATUS_PAID,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        unpaid_value = SaleItem.objects.filter(
            sale__shift_session=session,
            sale__payment_status=Sale.PAYMENT_STATUS_UNPAID_APPROVED,
        ).aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        cash_collected = SalePayment.objects.filter(
            sale__shift_session=session,
            sale__payment_status=Sale.PAYMENT_STATUS_PAID,
            method__name__icontains="cash",
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        digital_collected = payment_collected - cash_collected

        return Response(
            {
                "session": ShiftSessionSerializer(
                    session, context={"request": request}
                ).data,
                "formula": (
                    "opening + production - paid_sales - unpaid = expected_closing"
                ),
                "products": rows,
                "totals": {
                    **totals,
                    "variance_total_value": float(totals["variance_total_value"]),
                },
                "money": {
                    "sale_count": sale_agg["sale_count"] or 0,
                    "billed_total": float(sale_agg["billed_total"] or 0),
                    "collected_total": float(payment_collected),
                    "cash_collected": float(cash_collected),
                    "digital_collected": float(digital_collected),
                    "unpaid_value": float(unpaid_value),
                    "cash_declared": float(session.total_cash_declared or 0),
                    "digital_declared": float(session.total_digital_declared or 0),
                    "cash_discrepancy": float(
                        (session.total_cash_declared or 0) - cash_collected
                    ),
                    "digital_discrepancy": float(
                        (session.total_digital_declared or 0) - digital_collected
                    ),
                },
            }
        )


class SaleViewSet(viewsets.ModelViewSet):
    queryset = (
        Sale.objects.select_related("cashier", "approved_by", "shift_session")
        .prefetch_related("items__product", "payments__method")
        .order_by("-created_at")
    )
    serializer_class = SaleSerializer
    permission_classes = [IsCashierOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["cashier", "receipt_issued", "payment_status", "shift_session"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if getattr(user, "role", None) == "staff":
            queryset = queryset.filter(cashier=user)

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
            cashier = User.objects.get(id=int(cashier_id), role="staff")
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
            Sale.objects.select_related("cashier", "approved_by", "shift_session")
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
        unpaid_total = SaleItem.objects.filter(
            sale__in=sales_queryset,
            sale__payment_status=Sale.PAYMENT_STATUS_UNPAID_APPROVED,
        ).aggregate(total=Sum("subtotal"))["total"] or Decimal("0")

        payment_breakdown = (
            SalePayment.objects.filter(
                sale__in=sales_queryset,
                sale__payment_status=Sale.PAYMENT_STATUS_PAID,
            )
            .values("method_id", "method__name")
            .annotate(
                total_amount=Sum("amount"),
                sale_count=Count("sale", distinct=True),
            )
            .order_by("method__name")
        )

        product_breakdown = (
            SaleItem.objects.filter(
                sale__in=sales_queryset,
                sale__payment_status=Sale.PAYMENT_STATUS_PAID,
            )
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
                    "unpaid_total": float(unpaid_total),
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
        serializer.save()

    def perform_destroy(self, instance):
        with transaction.atomic():
            payments = list(instance.payments.select_related("method").all())
            payment_entries = [(p.method, p.amount) for p in payments]
            apply_sale_bank_sync(
                payment_entries, "subtract", note=f"Sale #{instance.id} deleted"
            )

            for item in instance.items.select_related("product").all():
                item.product.stock_quantity = F("stock_quantity") + item.quantity
                item.product.save(update_fields=["stock_quantity"])

            instance.delete()

    @action(detail=True, methods=["post"], url_path="payment-status")
    def payment_status(self, request, pk=None):
        sale = self.get_object()
        serializer = SalePaymentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_status_value = serializer.validated_data["payment_status"]
        unpaid_reason = serializer.validated_data.get("unpaid_reason", "")
        payment_total = sale.payments.aggregate(total=Sum("amount")).get(
            "total"
        ) or Decimal("0")
        base_total = sale.items.aggregate(total=Sum("subtotal")).get(
            "total"
        ) or Decimal("0")

        if (
            payment_status_value == Sale.PAYMENT_STATUS_PAID
            and payment_total < base_total
        ):
            return Response(
                {
                    "detail": (
                        "Cannot mark as paid when payments are less than sale total."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        sale.payment_status = payment_status_value
        sale.unpaid_reason = unpaid_reason
        sale.approved_by = None
        sale.total_amount = (
            Decimal("0")
            if payment_status_value == Sale.PAYMENT_STATUS_UNPAID_APPROVED
            else base_total
        )
        sale.save(
            update_fields=[
                "payment_status",
                "unpaid_reason",
                "approved_by",
                "total_amount",
            ]
        )

        return Response(SaleSerializer(sale, context={"request": request}).data)


class DailyClosingViewSet(viewsets.ModelViewSet):
    queryset = DailyClosing.objects.order_by("-date")
    serializer_class = DailyClosingSerializer
    permission_classes = [IsCashierOrAdmin]

    def create(self, request, *args, **kwargs):
        today = timezone.now().date()

        if DailyClosing.objects.filter(date=today).exists():
            return Response(
                {"message": "Day already closed."}, status=status.HTTP_400_BAD_REQUEST
            )

        todays_sales = Sale.objects.filter(created_at__date=today)
        total_expected = (
            SalePayment.objects.filter(
                sale__in=todays_sales,
                sale__payment_status=Sale.PAYMENT_STATUS_PAID,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

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
        discrepancy = total_declared - float(total_expected)

        closing = DailyClosing.objects.create(
            closed_by=request.user,
            total_sales_expected=total_expected,
            total_cash_declared=declared_cash,
            total_digital_declared=declared_digital,
            cash_discrepancy=discrepancy,
            notes=request.data.get("notes", ""),
        )

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

        serializer = self.get_serializer(closing)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
