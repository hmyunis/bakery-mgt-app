from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, ChangePasswordSerializer, FactoryResetSerializer
from .permissions import IsAdminOrOwner
from django.db.models import ProtectedError
from production.models import Product, Recipe, ProductionRun
from inventory.models import Ingredient, Purchase
from sales.models import Sale, PaymentMethod
from audit.models import AuditLog
from notifications.models import NotificationLog


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrOwner]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'full_name', 'phone_number', 'email']
    ordering_fields = ['date_joined', 'username']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(id=user.id)

    # --- New Features ---
    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        GET: Retrieve currently logged-in user profile.
        PUT/PATCH: Update currently logged-in user profile.
        """
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            # Users can't update their own role via this endpoint (handled in Serializer validation)
            serializer = self.get_serializer(user, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Allows the logged-in user to change their password.
        """
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def factory_reset(self, request):
        """
        Selectively wipe out data. Requires admin password.
        """
        user = request.user
        if user.role != 'admin':
            return Response({"detail": "Only admins can perform factory reset."}, status=status.HTTP_403_FORBIDDEN)

        serializer = FactoryResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Verify password
        if not user.check_password(serializer.validated_data['password']):
            return Response({"password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        deleted_counts = {}
        errors = []

        try:
            # Order matters due to foreign keys!
            
            # 1. Sales (Dependent on Products, PaymentMethods, Users)
            if data.get('delete_sales'):
                try:
                    count, _ = Sale.objects.all().delete()
                    deleted_counts['sales'] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Sales: {e}")

            # 2. Production Runs (Dependent on Products, Ingredients, Users)
            if data.get('delete_production_runs'):
                try:
                    count, _ = ProductionRun.objects.all().delete()
                    deleted_counts['production_runs'] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Production Runs: {e}")

            # 3. Recipes (Dependent on Products, Ingredients)
            if data.get('delete_recipes'):
                try:
                    count, _ = Recipe.objects.all().delete()
                    deleted_counts['recipes'] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Recipes: {e}")

            # 4. Purchases (Dependent on Ingredients, Users)
            if data.get('delete_purchases'):
                try:
                    count, _ = Purchase.objects.all().delete()
                    deleted_counts['purchases'] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Purchases: {e}")

            # 5. Products (Referenced by Sales, ProductionRuns, Recipes)
            if data.get('delete_products'):
                try:
                    # Only delete if not referenced by existing sales/production/recipes
                    count, _ = Product.objects.all().delete()
                    deleted_counts['products'] = count
                except ProtectedError as e:
                    # Parse the error to give a user-friendly message
                    protected_objects = list(e.protected_objects)
                    example = protected_objects[0] if protected_objects else "unknown objects"
                    model_name = example._meta.verbose_name_plural
                    errors.append(f"Cannot delete Products because they are used in {model_name}. Delete those first.")

            # 6. Ingredients (Referenced by Recipes, ProductionRuns, Purchases)
            if data.get('delete_ingredients'):
                try:
                    count, _ = Ingredient.objects.all().delete()
                    deleted_counts['ingredients'] = count
                except ProtectedError as e:
                    protected_objects = list(e.protected_objects)
                    example = protected_objects[0] if protected_objects else "unknown objects"
                    model_name = example._meta.verbose_name_plural
                    errors.append(f"Cannot delete Ingredients because they are used in {model_name}. Delete those first.")

            # 7. Payment Methods (Referenced by Sales)
            if data.get('delete_payment_methods'):
                try:
                    count, _ = PaymentMethod.objects.all().delete()
                    deleted_counts['payment_methods'] = count
                except ProtectedError as e:
                     protected_objects = list(e.protected_objects)
                     example = protected_objects[0] if protected_objects else "unknown objects"
                     model_name = example._meta.verbose_name_plural
                     errors.append(f"Cannot delete Payment Methods because they are used in {model_name}.")

            # 8. Notifications
            if data.get('delete_notifications'):
                try:
                    count, _ = NotificationLog.objects.all().delete()
                    deleted_counts['notifications'] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Notifications: {e}")

            # 9. Audit Logs
            if data.get('delete_audit_logs'):
                try:
                    count, _ = AuditLog.objects.all().delete()
                    deleted_counts['audit_logs'] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Audit Logs: {e}")

            # 10. Users (Referenced by EVERYTHING)
            if data.get('delete_users'):
                try:
                    # Exclude the current admin user and superusers
                    users_to_delete = User.objects.exclude(id=user.id).exclude(is_superuser=True)
                    count, _ = users_to_delete.delete()
                    deleted_counts['users'] = count
                except ProtectedError as e:
                    protected_objects = list(e.protected_objects)
                    example = protected_objects[0] if protected_objects else "unknown objects"
                    model_name = example._meta.verbose_name_plural
                    errors.append(f"Cannot delete Users because they are referenced by {model_name}.")

        except Exception as e:
            return Response({"detail": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response_status = status.HTTP_200_OK
        message = "Factory reset completed."
        
        if errors:
            response_status = status.HTTP_207_MULTI_STATUS # Partial content/status
            message = "Factory reset completed with some errors."
        
        return Response({
            "message": message,
            "deleted_counts": deleted_counts,
            "errors": errors
        }, status=response_status)
