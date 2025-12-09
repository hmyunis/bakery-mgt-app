from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentMethodViewSet, SaleViewSet, DailyClosingViewSet

router = DefaultRouter()
router.register(r'payment-methods', PaymentMethodViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'closing', DailyClosingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

