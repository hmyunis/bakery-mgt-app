from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DailyClosingViewSet,
    PaymentMethodViewSet,
    SaleViewSet,
    ShiftSessionViewSet,
)

router = DefaultRouter()
router.register(r"payment-methods", PaymentMethodViewSet)
router.register(r"sales", SaleViewSet)
router.register(r"closing", DailyClosingViewSet)
router.register(r"shift-sessions", ShiftSessionViewSet, basename="shift-sessions")

urlpatterns = [
    path("", include(router.urls)),
]
