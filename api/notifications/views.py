from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import PushSubscription, NotificationPreference, NotificationLog, NotificationEvent
from .serializers import (
    PushSubscriptionSerializer,
    PushSubscriptionCreateSerializer,
    NotificationPreferenceSerializer,
    NotificationLogSerializer
)

User = get_user_model()

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """
    Manage user's push notification subscriptions.
    """
    serializer_class = PushSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PushSubscription.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PushSubscriptionCreateSerializer
        return PushSubscriptionSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def unsubscribe(self, request, pk=None):
        """Deactivate a subscription"""
        subscription = self.get_object()
        if subscription.user != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        
        subscription.is_active = False
        subscription.save()
        return Response({"message": "Unsubscribed successfully"})

class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    Admin-only: Configure which events trigger notifications for which roles.
    """
    queryset = NotificationPreference.objects.all()
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['get'])
    def events(self, request):
        """Get list of available event types"""
        events = [{'value': choice[0], 'label': choice[1]} for choice in NotificationEvent.choices]
        return Response(events)
    
    @action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """Initialize default preferences for all event types"""
        defaults = {
            NotificationEvent.LOW_STOCK: {
                'title_template': 'Low Stock Alert',
                'body_template': '{ingredient_name} is running low. Current stock: {current_stock} {unit}',
                'target_roles': ['admin', 'storekeeper']
            },
            NotificationEvent.PRICE_ANOMALY: {
                'title_template': 'Price Anomaly Detected',
                'body_template': 'Purchase of {ingredient_name} at {unit_cost} is {percentage}% above average',
                'target_roles': ['admin', 'storekeeper']
            },
            NotificationEvent.PRODUCTION_COMPLETE: {
                'title_template': 'Production Completed',
                'body_template': '{chef_name} completed production of {quantity} {product_name}',
                'target_roles': ['admin']
            },
            NotificationEvent.SALE_COMPLETE: {
                'title_template': 'Sale Completed',
                'body_template': 'Sale #{sale_id} completed. Total: {total_amount}',
                'target_roles': ['admin']
            },
            NotificationEvent.EOD_CLOSING: {
                'title_template': 'End of Day Closing',
                'body_template': 'EOD closing completed. Discrepancy: {discrepancy}',
                'target_roles': ['admin']
            },
            NotificationEvent.STOCK_ADJUSTMENT: {
                'title_template': 'Stock Adjustment',
                'body_template': '{actor_name} adjusted {ingredient_name} by {quantity_change}',
                'target_roles': ['admin', 'storekeeper']
            },
            NotificationEvent.PURCHASE_CREATED: {
                'title_template': 'Purchase Recorded',
                'body_template': '{purchaser_name} recorded purchase of {quantity} {ingredient_name}',
                'target_roles': ['admin']
            },
            NotificationEvent.USER_CREATED: {
                'title_template': 'New User Created',
                'body_template': 'New user {username} ({role}) was created',
                'target_roles': ['admin']
            },
        }
        
        created_count = 0
        for event_type, config in defaults.items():
            preference, created = NotificationPreference.objects.get_or_create(
                event_type=event_type,
                defaults={
                    'enabled': True,
                    'title_template': config['title_template'],
                    'body_template': config['body_template'],
                    'target_roles': config['target_roles']
                }
            )
            if created:
                created_count += 1
        
        return Response({
            'message': f'Initialized {created_count} default notification preferences'
        })

class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View notification history. Admins see all, users see their own.
    """
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return NotificationLog.objects.none()
        
        if not self.request.user.is_authenticated:
            return NotificationLog.objects.none()
        
        if hasattr(self.request.user, 'role') and self.request.user.role == 'admin':
            return NotificationLog.objects.all()
        return NotificationLog.objects.filter(user=self.request.user)
