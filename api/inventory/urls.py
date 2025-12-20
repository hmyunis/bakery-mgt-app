from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IngredientViewSet, PurchaseViewSet, StockAdjustmentViewSet

router = DefaultRouter()
router.register(r"ingredients", IngredientViewSet)
router.register(r"purchases", PurchaseViewSet)
router.register(r"adjustments", StockAdjustmentViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
