from django.db import transaction
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Product, ProductionRun, Recipe
from .serializers import ProductionRunSerializer, ProductSerializer, RecipeSerializer


class IsChefOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        if request.user.has_page_permission("production"):
            return True
        return (
            view.__class__.__name__ == "ProductViewSet"
            and view.action in ["list", "retrieve"]
            and request.user.has_page_permission("sales")
        )


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [IsChefOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at", "selling_price", "stock_quantity"]
    ordering = ["name"]


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = (
        Recipe.objects.select_related("product", "composite_ingredient")
        .prefetch_related("items__ingredient")
        .order_by("id")
    )
    serializer_class = RecipeSerializer
    permission_classes = [IsChefOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["product", "composite_ingredient"]
    search_fields = ["product__name", "instructions"]
    ordering_fields = ["id", "standard_yield"]
    ordering = ["id"]

    @action(detail=False, methods=["get"], url_path="products-with-recipes")
    def products_with_recipes(self, request):
        """
        Lightweight endpoint to get product IDs that already have recipes.
        Returns only IDs for efficient filtering on the frontend.
        """
        product_ids = (
            Recipe.objects.filter(product__isnull=False)
            .values_list("product_id", flat=True)
            .distinct()
        )

        return Response(
            {"success": True, "data": list(product_ids), "count": len(product_ids)}
        )


class ProductionRunViewSet(viewsets.ModelViewSet):
    queryset = (
        ProductionRun.objects.select_related("chef", "product", "composite_ingredient")
        .prefetch_related("usages__ingredient")
        .order_by("-date_produced")
    )
    serializer_class = ProductionRunSerializer
    permission_classes = [IsChefOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["product", "chef"]

    def get_queryset(self):
        queryset = super().get_queryset()
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(date_produced__gte=start_date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(chef=self.request.user)

    def perform_destroy(self, instance):
        """
        Delete production run and reverse all stock changes:
        - Decrease product/composite stock by quantity_produced
        - Increase ingredient stock by actual_amount for each usage
        """
        with transaction.atomic():
            # Reverse product/composite stock
            if instance.product:
                instance.product.stock_quantity = F("stock_quantity") - int(
                    instance.quantity_produced
                )
                instance.product.save(update_fields=["stock_quantity"])
            elif instance.composite_ingredient:
                instance.composite_ingredient.kitchen_stock = (
                    F("kitchen_stock") - instance.quantity_produced
                )
                instance.composite_ingredient.save(update_fields=["kitchen_stock"])

            # Reverse ingredient stock (add back actual usage amounts)
            for usage in instance.usages.all():
                usage.ingredient.kitchen_stock = (
                    F("kitchen_stock") + usage.actual_amount
                )
                usage.ingredient.save(update_fields=["kitchen_stock"])

            # Delete the production run
            # (this will cascade delete IngredientUsage records)
            instance.delete()
