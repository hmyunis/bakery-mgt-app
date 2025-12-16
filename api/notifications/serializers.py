import logging
from rest_framework import serializers
from .models import PushSubscription, NotificationPreference, NotificationLog, NotificationEvent

logger = logging.getLogger(__name__)

class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh', 'auth', 'created_at', 'is_active']
        read_only_fields = ('id', 'created_at', 'user')

class PushSubscriptionCreateSerializer(serializers.Serializer):
    """
    Serializer for creating push subscription from frontend.
    Follows the guide's structure: endpoint, p256dh, and auth as direct fields.
    Handles CamelCase parser transformations (p256dh -> p_256dh).
    """
    endpoint = serializers.URLField()
    # Don't define p256dh and auth as fields - we'll extract them manually in validate()
    # This avoids DRF field validation issues with CamelCase transformation
    keys = serializers.DictField(required=False)
    
    def validate(self, attrs):
        """
        Validate and normalize the subscription data.
        Handles both direct fields (guide format) and nested keys (legacy format).
        Also handles CamelCase parser transformation (p256dh -> p_256dh).
        """
        request = self.context.get('request')
        
        # Get raw request.data (this is what actually came from the client)
        # The CamelCase parser transforms p256dh -> p_256dh at this level
        raw_data = {}
        if request and hasattr(request, 'data'):
            raw_data = request.data
            logger.debug(f"[Subscription] Raw request.data keys: {list(raw_data.keys()) if isinstance(raw_data, dict) else 'Not a dict'}")
        
        # Try to get p256dh and auth from raw_data
        # CamelCase parser converts p256dh to p_256dh, so check both
        p256dh = None
        auth = None
        
        if isinstance(raw_data, dict):
            # Check for direct fields (guide format) - handle CamelCase transformation
            p256dh = raw_data.get('p256dh') or raw_data.get('p_256dh')
            auth = raw_data.get('auth')
            
            # Also check for nested keys structure (legacy format)
            if not p256dh or not auth:
                keys = raw_data.get('keys', {})
                if isinstance(keys, dict):
                    logger.debug(f"[Subscription] Checking nested keys: {list(keys.keys())}")
                    p256dh = p256dh or keys.get('p256dh') or keys.get('p_256dh')
                    auth = auth or keys.get('auth')
        
        # Validate we have both required fields
        if not p256dh or not auth:
            all_keys = list(raw_data.keys()) if isinstance(raw_data, dict) else []
            error_msg = (
                f"Missing required fields. Need 'p256dh' and 'auth'. "
                f"Received keys in request: {all_keys}. "
                f"p256dh found: {bool(p256dh)}, auth found: {bool(auth)}"
            )
            logger.error(f"[Subscription] {error_msg}")
            raise serializers.ValidationError({
                'p256dh': ['This field is required.'] if not p256dh else [],
                'auth': ['This field is required.'] if not auth else [],
                'non_field_errors': [error_msg]
            })
        
        # Add to attrs for use in create()
        attrs['p256dh'] = p256dh
        attrs['auth'] = auth
        
        logger.info(f"[Subscription] Validated subscription data - endpoint: {attrs['endpoint'][:50]}..., has keys: ✓")
        return attrs
    
    def create(self, validated_data):
        user = self.context['request'].user
        endpoint = validated_data['endpoint']
        p256dh = validated_data['p256dh']
        auth = validated_data['auth']
        
        logger.info(f"[Subscription] Creating subscription for user {user.username} with endpoint {endpoint[:50]}...")
        
        subscription, created = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=endpoint,
            defaults={
                'p256dh': p256dh,
                'auth': auth,
                'is_active': True
            }
        )
        
        logger.info(f"[Subscription] {'Created' if created else 'Updated'} subscription {subscription.id} for user {user.username}")
        
        return subscription

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'event_type', 'event_type_display', 'enabled', 
            'target_roles', 'title_template', 'body_template', 
            'icon_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')

class NotificationLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'user', 'user_name', 'event_type', 'event_type_display',
            'title', 'body', 'data', 'sent_at', 'success', 'error_message'
        ]
        read_only_fields = (
            'id', 'user', 'user_name', 'event_type', 'event_type_display',
            'title', 'body', 'data', 'sent_at', 'success', 'error_message'
        )

