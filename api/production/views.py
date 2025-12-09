from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Recipe, ProductionRun
from .serializers import ProductSerializer, RecipeSerializer, ProductionRunSerializer

class IsChefOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        # Chefs can Read/Create ProductionRuns. Only Admin can manage Recipes/Products.
        if view.action in ['create', 'list', 'retrieve']:
            return request.user.role in ['admin', 'chef', 'storekeeper']
        return request.user.role == 'admin'

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsChefOrAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.select_related('product', 'composite_ingredient').prefetch_related('items__ingredient').all()
    serializer_class = RecipeSerializer
    permission_classes = [IsChefOrAdmin]

class ProductionRunViewSet(viewsets.ModelViewSet):
    queryset = ProductionRun.objects.select_related('chef', 'product', 'composite_ingredient').order_by('-date_produced')
    serializer_class = ProductionRunSerializer
    permission_classes = [IsChefOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'chef']

    def perform_create(self, serializer):
        serializer.save(chef=self.request.user)
