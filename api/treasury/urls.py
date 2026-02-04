from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BankAccountViewSet, BankTransactionViewSet, ExpenseViewSet

router = DefaultRouter()
router.register(r"bank-accounts", BankAccountViewSet)
router.register(r"transactions", BankTransactionViewSet)
router.register(r"expenses", ExpenseViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
