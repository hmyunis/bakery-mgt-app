from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductionRunViewSet, ProductViewSet, RecipeViewSet

router = DefaultRouter()
router.register(r"products", ProductViewSet)
router.register(r"recipes", RecipeViewSet)
router.register(r"runs", ProductionRunViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
