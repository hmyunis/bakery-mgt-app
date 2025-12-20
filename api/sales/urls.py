from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DailyClosingViewSet, PaymentMethodViewSet, SaleViewSet

router = DefaultRouter()
router.register(r"payment-methods", PaymentMethodViewSet)
router.register(r"sales", SaleViewSet)
router.register(r"closing", DailyClosingViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
