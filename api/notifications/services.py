import json
import logging
from typing import Dict, List, Optional
from django.conf import settings
from django.contrib.auth import get_user_model
from pywebpush import webpush, WebPushException
from .models import (
    NotificationPreference, 
    PushSubscription, 
    NotificationLog, 
)

User = get_user_model()
logger = logging.getLogger(__name__)

class NotificationService:
    """
    Service class for sending browser push notifications using VAPID.
    """
    
    @staticmethod
    def get_vapid_credentials():
        """Get VAPID credentials from settings"""
        import base64
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend
        
        private_key_str = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        public_key_str = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        
        if not private_key_str or not public_key_str:
            return {
                "vapid_private_key": None,
                "vapid_public_key": None,
                "vapid_email": getattr(settings, 'VAPID_EMAIL', 'admin@bakery.com'),
            }
        
        try:
            # Decode base64url keys to bytes
            # Add padding if needed
            private_key_b64 = private_key_str + '=' * (4 - len(private_key_str) % 4)
            public_key_b64 = public_key_str + '=' * (4 - len(public_key_str) % 4)
            
            private_key_bytes = base64.urlsafe_b64decode(private_key_b64)
            public_key_bytes = base64.urlsafe_b64decode(public_key_b64)
            
            # Reconstruct EC keys from bytes
            # Private key: 32 bytes
            private_value = int.from_bytes(private_key_bytes, 'big')
            private_key = ec.derive_private_key(private_value, ec.SECP256R1(), default_backend())
            
            # Public key: 65 bytes (0x04 + 32 bytes X + 32 bytes Y)
            if public_key_bytes[0] == 0x04:
                x = int.from_bytes(public_key_bytes[1:33], 'big')
                y = int.from_bytes(public_key_bytes[33:65], 'big')
                public_key = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key(default_backend())
            else:
                # If not uncompressed format, try to parse as DER
                public_key = serialization.load_der_public_key(public_key_bytes, default_backend())
            
            # Convert to PEM format for pywebpush
            private_key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            public_key_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
            
            return {
                "vapid_private_key": private_key_pem,
                "vapid_public_key": public_key_pem,
                "vapid_email": getattr(settings, 'VAPID_EMAIL', 'admin@bakery.com'),
            }
        except Exception as e:
            logger.error(f"Error processing VAPID keys: {e}")
            # Fallback: return as-is (might be PEM format already)
            return {
                "vapid_private_key": private_key_str,
                "vapid_public_key": public_key_str,
                "vapid_email": getattr(settings, 'VAPID_EMAIL', 'admin@bakery.com'),
            }
    
    @staticmethod
    def should_send_notification(event_type: str, user: User) -> bool:
        """
        Check if notification should be sent based on preferences and user role.
        """
        try:
            preference = NotificationPreference.objects.get(event_type=event_type, enabled=True)
            
            # If target_roles is empty, send to all roles
            if not preference.target_roles:
                return True
            
            # Check if user's role is in target roles
            return user.role in preference.target_roles
        except NotificationPreference.DoesNotExist:
            # If preference doesn't exist, don't send (admin must configure)
            return False
    
    @staticmethod
    def format_notification(preference: NotificationPreference, context: Dict) -> Dict:
        """
        Format notification using template and context variables.
        """
        title = preference.title_template.format(**context)
        body = preference.body_template.format(**context)
        
        return {
            'title': title,
            'body': body,
            'icon': preference.icon_url or '/static/icon-192x192.png',
            'badge': preference.icon_url or '/static/badge-72x72.png',
            'data': context.get('data', {}),
        }
    
    @staticmethod
    def send_to_subscription(
        subscription: PushSubscription, 
        notification: Dict, 
        event_type: str,
        user: User
    ) -> bool:
        """
        Send notification to a single subscription.
        Returns True if successful, False otherwise.
        """
        vapid_credentials = NotificationService.get_vapid_credentials()
        
        if not vapid_credentials['vapid_private_key'] or not vapid_credentials['vapid_public_key']:
            logger.error("VAPID credentials not configured")
            return False
        
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth
            }
        }
        
        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(notification),
                vapid_private_key=vapid_credentials['vapid_private_key'],
                vapid_public_key=vapid_credentials['vapid_public_key'],
                vapid_claims={
                    "sub": f"mailto:{vapid_credentials['vapid_email']}"
                }
            )
            
            # Log success
            NotificationLog.objects.create(
                user=user,
                event_type=event_type,
                title=notification.get('title', ''),
                body=notification.get('body', ''),
                data=notification.get('data', {}),
                success=True,
                subscription=subscription
            )
            
            return True
            
        except WebPushException as e:
            error_msg = str(e)
            logger.error(f"WebPush error: {error_msg}")
            
            # Log failure
            NotificationLog.objects.create(
                user=user,
                event_type=event_type,
                title=notification.get('title', ''),
                body=notification.get('body', ''),
                data=notification.get('data', {}),
                success=False,
                error_message=error_msg,
                subscription=subscription
            )
            
            # If subscription is invalid (410), mark as inactive
            if e.response and e.response.status_code == 410:
                subscription.is_active = False
                subscription.save()
            
            return False
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected error sending notification: {error_msg}")
            
            NotificationLog.objects.create(
                user=user,
                event_type=event_type,
                title=notification.get('title', ''),
                body=notification.get('body', ''),
                data=notification.get('data', {}),
                success=False,
                error_message=error_msg,
                subscription=subscription
            )
            
            return False
    
    @staticmethod
    def send_notification(
        event_type: str,
        context: Dict,
        target_users: Optional[List[User]] = None,
        target_roles: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Main method to send notifications.
        
        Args:
            event_type: One of NotificationEvent choices
            context: Dictionary with variables for template formatting
            target_users: Specific users to notify (optional)
            target_roles: Specific roles to notify (optional, overrides preference)
        
        Returns:
            Dict with 'sent' and 'failed' counts
        """
        try:
            preference = NotificationPreference.objects.get(event_type=event_type, enabled=True)
        except NotificationPreference.DoesNotExist:
            logger.warning(f"Notification preference not found or disabled for {event_type}")
            return {'sent': 0, 'failed': 0}
        
        # Format notification
        notification = NotificationService.format_notification(preference, context)
        
        # Determine target users
        if target_users:
            users_to_notify = target_users
        elif target_roles:
            users_to_notify = User.objects.filter(role__in=target_roles, is_active=True)
        else:
            # Use preference target_roles
            if preference.target_roles:
                users_to_notify = User.objects.filter(role__in=preference.target_roles, is_active=True)
            else:
                users_to_notify = User.objects.filter(is_active=True)
        
        sent_count = 0
        failed_count = 0
        
        # Send to each user's active subscriptions
        for user in users_to_notify:
            # Check if should send (respects preference if target_roles not specified)
            if not target_roles and not NotificationService.should_send_notification(event_type, user):
                continue
            
            subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
            
            if not subscriptions.exists():
                logger.debug(f"No active subscriptions for user {user.username}")
                continue
            
            for subscription in subscriptions:
                success = NotificationService.send_to_subscription(
                    subscription, 
                    notification, 
                    event_type,
                    user
                )
                
                if success:
                    sent_count += 1
                else:
                    failed_count += 1
        
        logger.info(f"Notification {event_type}: {sent_count} sent, {failed_count} failed")
        return {'sent': sent_count, 'failed': failed_count}


# Convenience function for easy import
def send_notification(event_type: str, context: Dict, target_users=None, target_roles=None):
    """
    Convenience function to send notifications.
    Usage:
        from notifications.services import send_notification
        send_notification('low_stock', {'ingredient_name': 'Flour', 'current_stock': 5})
    """
    return NotificationService.send_notification(event_type, context, target_users, target_roles)

