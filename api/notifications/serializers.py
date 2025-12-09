from rest_framework import serializers
from .models import PushSubscription, NotificationPreference, NotificationLog, NotificationEvent

class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh', 'auth', 'created_at', 'is_active']
        read_only_fields = ('id', 'created_at', 'user')

class PushSubscriptionCreateSerializer(serializers.Serializer):
    """
    Serializer for creating push subscription from frontend.
    """
    endpoint = serializers.URLField()
    keys = serializers.DictField()
    
    def validate_keys(self, value):
        if 'p256dh' not in value or 'auth' not in value:
            raise serializers.ValidationError("Keys must contain 'p256dh' and 'auth'")
        return value
    
    def create(self, validated_data):
        user = self.context['request'].user
        endpoint = validated_data['endpoint']
        keys = validated_data['keys']
        
        subscription, created = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=endpoint,
            defaults={
                'p256dh': keys['p256dh'],
                'auth': keys['auth'],
                'is_active': True
            }
        )
        
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

