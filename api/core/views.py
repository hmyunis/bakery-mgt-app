from rest_framework.decorators import api_view, permission_classes
from datetime import datetime
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
from django.db.models import Sum, F
from decimal import Decimal

from sales.models import Sale, SalePayment, SaleItem
from inventory.models import Ingredient
from production.models import IngredientUsage, Product, ProductionRun
from audit.models import AuditLog
from django.db.models import Count, Avg, Q
from .models import BakerySettings
from .serializers import BakerySettingsSerializer, BakerySettingsUpdateSerializer


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return bool(
            super().has_permission(request, view)
            and getattr(request.user, "role", None) == "admin"
        )


def _to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify API is running and database is accessible.
    """
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        return Response({
            'status': 'healthy',
            'service': 'bakery-management-api',
            'database': 'connected'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'service': 'bakery-management-api',
            'database': 'disconnected',
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(["GET"])
@permission_classes([IsAdmin])
def owner_dashboard(request):
    """
    Owner/Admin dashboard aggregates.

    Returns:
    - salesToday: { total, count, average }
    - cashVsDigitalSplit: { cash, digital }
    - topProductsToday: [{ productName, quantity, revenue }]
    - salesByHour: [{ hour, count, total }] (last 12 hours)
    - criticalStockAlerts: [{ id, name, unit, currentStock, reorderPoint, shortfall }]
    - recentProductionWastage: [{ productionRunId, producedAt, producedItemName, ingredientName, unit, wastage }]
    - inventoryStats: { totalValue, totalItems, lowStockCount }
    """
    today = timezone.localdate()
    now = timezone.now()
    
    # Calculate start and end of day in local time, then convert to aware datetimes
    # This avoids DB-level timezone conversion issues
    start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))
    end_of_day = timezone.make_aware(datetime.combine(today, datetime.max.time()))

    # Sales Today
    sales_qs = Sale.objects.filter(created_at__range=(start_of_day, end_of_day))
    sales_today_total = sales_qs.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
    sales_today_count = sales_qs.count()
    sales_today_avg = sales_qs.aggregate(avg=Avg("total_amount"))["avg"] or Decimal("0")

    # Cash vs Digital split (based on payment method name)
    payments_qs = (
        SalePayment.objects.filter(sale__created_at__range=(start_of_day, end_of_day))
        .select_related("method", "sale")
        .only("amount", "method__name", "sale__created_at")
    )
    cash_total = Decimal("0")
    digital_total = Decimal("0")
    for p in payments_qs:
        method_name = (p.method.name or "").strip().lower()
        if method_name == "cash" or "cash" in method_name:
            cash_total += p.amount
        else:
            digital_total += p.amount

    # Top Products Today
    top_products_qs = (
        SaleItem.objects.filter(sale__created_at__range=(start_of_day, end_of_day))
        .values("product__name")
        .annotate(quantity=Sum("quantity"), revenue=Sum("subtotal"))
        .order_by("-revenue")[:5]
    )
    top_products_today = [
        {
            "product_name": item["product__name"],
            "quantity": int(item["quantity"] or 0),
            "revenue": _to_float(item["revenue"] or 0),
        }
        for item in top_products_qs
    ]

    # Sales by Hour (last 12 hours)
    twelve_hours_ago = now - timezone.timedelta(hours=12)
    sales_by_hour = []
    for i in range(12):
        hour_start = twelve_hours_ago + timezone.timedelta(hours=i)
        hour_end = hour_start + timezone.timedelta(hours=1)
        hour_sales = Sale.objects.filter(
            created_at__gte=hour_start, created_at__lt=hour_end
        )
        hour_count = hour_sales.count()
        hour_total = hour_sales.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
        sales_by_hour.append({
            "hour": hour_start.hour,
            "count": hour_count,
            "total": _to_float(hour_total),
        })

    # Critical Stock Alerts (raw ingredients)
    low_stock_qs = (
        Ingredient.objects.filter(current_stock__lte=F("reorder_point"))
        .annotate(shortfall=F("reorder_point") - F("current_stock"))
        .order_by("-shortfall", "name")[:5]
    )
    critical_stock_alerts = [
        {
            "id": i.id,
            "name": i.name,
            "unit": i.unit,
            "current_stock": _to_float(i.current_stock),
            "reorder_point": _to_float(i.reorder_point),
            "shortfall": _to_float(i.shortfall),
        }
        for i in low_stock_qs
    ]

    # Recent Production Wastage (ingredient-level)
    wastage_qs = (
        IngredientUsage.objects.filter(wastage__gt=0)
        .select_related(
            "ingredient",
            "production_run",
            "production_run__product",
            "production_run__composite_ingredient",
        )
        .order_by("-production_run__date_produced")[:5]
    )
    recent_production_wastage = []
    for u in wastage_qs:
        produced_item_name = None
        if u.production_run.product_id:
            produced_item_name = u.production_run.product.name
        elif u.production_run.composite_ingredient_id:
            produced_item_name = u.production_run.composite_ingredient.name

        recent_production_wastage.append(
            {
                "production_run_id": u.production_run_id,
                "produced_at": u.production_run.date_produced,
                "produced_item_name": produced_item_name,
                "ingredient_name": u.ingredient.name,
                "unit": u.ingredient.unit,
                "wastage": _to_float(u.wastage),
            }
        )

    # Inventory Stats
    all_ingredients = Ingredient.objects.all()
    total_inventory_value = sum(
        _to_float(ing.current_stock) * _to_float(ing.average_cost_per_unit)
        for ing in all_ingredients
    )
    low_stock_count = Ingredient.objects.filter(current_stock__lte=F("reorder_point")).count()
    inventory_stats = {
        "total_value": total_inventory_value,
        "total_items": all_ingredients.count(),
        "low_stock_count": low_stock_count,
    }

    # Recent Production Runs (today)
    recent_runs_qs = (
        ProductionRun.objects.filter(date_produced__range=(start_of_day, end_of_day))
        .select_related("product", "composite_ingredient", "chef")
        .order_by("-date_produced")[:5]
    )
    recent_production_runs = []
    for run in recent_runs_qs:
        item_name = None
        if run.product_id:
            item_name = run.product.name
        elif run.composite_ingredient_id:
            item_name = run.composite_ingredient.name
        
        recent_production_runs.append({
            "id": run.id,
            "item_name": item_name,
            "quantity_produced": _to_float(run.quantity_produced),
            "produced_at": run.date_produced,
            "chef_name": run.chef.username if run.chef else None,
        })

    # Audit Insights (last 24 hours)
    twenty_four_hours_ago = now - timezone.timedelta(hours=24)
    recent_audits_qs = AuditLog.objects.filter(timestamp__gte=twenty_four_hours_ago)
    
    delete_count = recent_audits_qs.filter(action="DELETE").count()
    update_count = recent_audits_qs.filter(action="UPDATE").count()
    create_count = recent_audits_qs.filter(action="CREATE").count()
    
    recent_delete_actions = (
        AuditLog.objects.filter(action="DELETE", timestamp__gte=twenty_four_hours_ago)
        .select_related("actor")
        .order_by("-timestamp")[:5]
    )
    recent_deletes = []
    for log in recent_delete_actions:
        actor_name = log.actor.username if log.actor else "System"
        recent_deletes.append({
            "id": log.id,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "actor_name": actor_name,
            "timestamp": log.timestamp,
        })

    audit_insights = {
        "delete_count": delete_count,
        "update_count": update_count,
        "create_count": create_count,
        "recent_deletes": recent_deletes,
    }

    return Response(
        {
            "sales_today": {
                "total": _to_float(sales_today_total),
                "count": sales_today_count,
                "average": _to_float(sales_today_avg),
            },
            "cash_vs_digital_split": {"cash": _to_float(cash_total), "digital": _to_float(digital_total)},
            "top_products_today": top_products_today,
            "sales_by_hour": sales_by_hour,
            "critical_stock_alerts": critical_stock_alerts,
            "recent_production_wastage": recent_production_wastage,
            "inventory_stats": inventory_stats,
            "recent_production_runs": recent_production_runs,
            "audit_insights": audit_insights,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])  # Allow public access, check admin in PATCH handler
def bakery_settings(request):
    """
    GET: Public endpoint to retrieve bakery settings.
    PATCH: Admin-only endpoint to update bakery settings.
    """
    instance = BakerySettings.get_instance()
    
    if request.method == "GET":
        serializer = BakerySettingsSerializer(instance, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == "PATCH":
        # Check admin permission
        if not request.user.is_authenticated or getattr(request.user, "role", None) != "admin":
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BakerySettingsUpdateSerializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            # Return updated data with full serializer
            full_serializer = BakerySettingsSerializer(instance, context={'request': request})
            return Response(full_serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
