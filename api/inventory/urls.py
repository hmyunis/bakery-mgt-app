from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    IngredientViewSet,
    KitchenTransferViewSet,
    PurchaseViewSet,
    StockAdjustmentViewSet,
)

router = DefaultRouter()
router.register(r"ingredients", IngredientViewSet)
router.register(r"purchases", PurchaseViewSet)
router.register(r"adjustments", StockAdjustmentViewSet)
router.register(r"kitchen-transfers", KitchenTransferViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
