from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    NotificationEvent,
    NotificationLog,
    NotificationPreference,
    PushSubscription,
)
from .serializers import (
    NotificationLogSerializer,
    NotificationPreferenceSerializer,
    PushSubscriptionCreateSerializer,
    PushSubscriptionSerializer,
)

User = get_user_model()


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """
    Manage user's push notification subscriptions.
    """

    serializer_class = PushSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PushSubscription.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return PushSubscriptionCreateSerializer
        return PushSubscriptionSerializer

    def create(self, request, *args, **kwargs):
        """
        Override create to use the custom serializer properly.
        """
        import logging

        logger = logging.getLogger(__name__)

        # Log raw request data for debugging
        logger.debug(f"Create subscription - request.data: {request.data}")
        logger.debug(f"Create subscription - request.data type: {type(request.data)}")
        if isinstance(request.data, dict):
            logger.debug(
                f"Create subscription - request.data keys: {list(request.data.keys())}"
            )
            if "keys" in request.data:
                logger.debug(
                    f"Create subscription - keys value: {request.data['keys']}"
                )
                logger.debug(
                    f"Create subscription - keys type: {type(request.data['keys'])}"
                )
                if isinstance(request.data["keys"], dict):
                    logger.debug(
                        f"Create subscription - keys dict keys: "
                        f"{list(request.data['keys'].keys())}"
                    )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save()

        # Return the created subscription using the read serializer
        read_serializer = PushSubscriptionSerializer(subscription)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def unsubscribe(self, request, pk=None):
        """Deactivate a subscription"""
        subscription = self.get_object()
        if subscription.user != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        subscription.is_active = False
        subscription.save()
        return Response({"message": "Unsubscribed successfully"})

    @action(
        detail=False,
        methods=["get"],
        url_path="vapid-public-key",
        permission_classes=[permissions.AllowAny],
    )
    def vapid_public_key(self, request):
        """Get VAPID public key for frontend subscription"""
        from .services import NotificationService

        # UPDATED: Matches the new method name in services.py
        credentials = NotificationService.get_vapid_info()
        # UPDATED: Key is now 'public_key' instead of 'vapid_public_key'
        public_key = credentials.get("public_key")

        if not public_key:
            return Response(
                {
                    "success": False,
                    "message": "VAPID keys not configured",
                    "errors": {"key": ["VAPID keys are not configured on the server"]},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"key": public_key})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    Admin-only: Configure which events trigger notifications for which roles.
    """

    queryset = NotificationPreference.objects.all()
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=["get"])
    def events(self, request):
        """Get list of available event types"""
        events = [
            {"value": choice[0], "label": choice[1]}
            for choice in NotificationEvent.choices
        ]
        return Response(events)

    @action(detail=False, methods=["post"])
    def initialize_defaults(self, request):
        """Initialize default preferences for all event types"""
        defaults = {
            NotificationEvent.LOW_STOCK: {
                "title_template": "Low Stock Alert",
                "body_template": (
                    "{ingredient_name} is running low. "
                    "Current stock: {current_stock} {unit}"
                ),
                "target_roles": ["admin", "storekeeper"],
            },
            NotificationEvent.PRICE_ANOMALY: {
                "title_template": "Price Anomaly Detected",
                "body_template": (
                    "Purchase of {ingredient_name} at {unit_cost} "
                    "is {percentage}% above average"
                ),
                "target_roles": ["admin", "storekeeper"],
            },
            NotificationEvent.PRODUCTION_COMPLETE: {
                "title_template": "Production Completed",
                "body_template": (
                    "{chef_name} completed production of {quantity} {product_name}"
                ),
                "target_roles": ["admin"],
            },
            NotificationEvent.SALE_COMPLETE: {
                "title_template": "Sale Completed",
                "body_template": "Sale #{sale_id} completed. Total: {total_amount}",
                "target_roles": ["admin"],
            },
            NotificationEvent.EOD_CLOSING: {
                "title_template": "End of Day Closing",
                "body_template": "EOD closing completed. Discrepancy: {discrepancy}",
                "target_roles": ["admin"],
            },
            NotificationEvent.STOCK_ADJUSTMENT: {
                "title_template": "Stock Adjustment",
                "body_template": (
                    "{actor_name} adjusted {ingredient_name} by {quantity_change}"
                ),
                "target_roles": ["admin", "storekeeper"],
            },
            NotificationEvent.PURCHASE_CREATED: {
                "title_template": "Purchase Recorded",
                "body_template": (
                    "{purchaser_name} recorded purchase of {quantity} {ingredient_name}"
                ),
                "target_roles": ["admin"],
            },
            NotificationEvent.USER_CREATED: {
                "title_template": "New User Created",
                "body_template": "New user {username} ({role}) was created",
                "target_roles": ["admin"],
            },
        }

        created_count = 0
        for event_type, config in defaults.items():
            preference, created = NotificationPreference.objects.get_or_create(
                event_type=event_type,
                defaults={
                    "enabled": True,
                    "title_template": config["title_template"],
                    "body_template": config["body_template"],
                    "target_roles": config["target_roles"],
                },
            )
            if created:
                created_count += 1

        return Response(
            {"message": f"Initialized {created_count} default notification preferences"}
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="vapid-public-key",
        permission_classes=[permissions.AllowAny],
    )
    def vapid_public_key(self, request):
        """Get VAPID public key for frontend subscription"""
        from .services import NotificationService

        # UPDATED: Matches the new method name in services.py
        credentials = NotificationService.get_vapid_info()
        # UPDATED: Key is now 'public_key' instead of 'vapid_public_key'
        public_key = credentials.get("public_key")

        if not public_key:
            return Response(
                {
                    "success": False,
                    "message": "VAPID keys not configured",
                    "errors": {"key": ["VAPID keys are not configured on the server"]},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"key": public_key})


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View notification history. Admins see all, users see their own.
    """

    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return NotificationLog.objects.none()

        if not self.request.user.is_authenticated:
            return NotificationLog.objects.none()

        if hasattr(self.request.user, "role") and self.request.user.role == "admin":
            return NotificationLog.objects.all()
        return NotificationLog.objects.filter(user=self.request.user)
