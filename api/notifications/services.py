import base64
import json
import logging
import os
import tempfile
from typing import Dict, List, Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from django.conf import settings
from django.contrib.auth import get_user_model
from pywebpush import WebPushException, webpush

from .models import (
    NotificationLog,
    NotificationPreference,
    PushSubscription,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def get_vapid_info():
        """
        Retrieves keys and ensures they are in a usable format.
        """
        private_key = getattr(settings, "VAPID_PRIVATE_KEY", "").strip()
        public_key = getattr(settings, "VAPID_PUBLIC_KEY", "").strip()
        email = getattr(settings, "VAPID_EMAIL", "admin@example.com")

        return {"private_key": private_key, "public_key": public_key, "email": email}

    @staticmethod
    def derive_public_key_from_private(private_key_str):
        """
        Helper to check if keys match.
        """
        try:
            # Add padding if needed
            padded = private_key_str + "=" * ((4 - len(private_key_str) % 4) % 4)
            # Decode urlsafe base64
            private_key_bytes = base64.urlsafe_b64decode(padded)
            private_value = int.from_bytes(private_key_bytes, "big")
            # Load key
            private_key = ec.derive_private_key(
                private_value, ec.SECP256R1(), default_backend()
            )
            # Get public numbers
            public_key = private_key.public_key()
            # Serialize public key to OpenSSL format (raw bytes)
            public_bytes = public_key.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint,
            )
            # Encode to base64url for comparison
            return base64.urlsafe_b64encode(public_bytes).decode("utf-8").rstrip("=")
        except Exception:
            return None

    @staticmethod
    def should_send_notification(event_type: str, user: User) -> bool:
        if not getattr(user, "push_notifications_enabled", True):
            return False
        try:
            preference = NotificationPreference.objects.get(
                event_type=event_type, enabled=True
            )
            if not preference.target_roles:
                return True
            return user.role in preference.target_roles
        except NotificationPreference.DoesNotExist:
            return False

    @staticmethod
    def format_notification(preference: NotificationPreference, context: Dict) -> Dict:
        try:
            title = preference.title_template.format(**context)
            body = preference.body_template.format(**context)
        except KeyError:
            title = preference.title_template
            body = preference.body_template

        event_routes = {
            "low_stock": "/app/inventory",
            "price_anomaly": "/app/inventory",
            "production_complete": "/app/production",
            "sale_complete": "/app/sales",
            "eod_closing": "/app/sales",
            "stock_adjustment": "/app/inventory",
            "purchase_created": "/app/inventory",
            "user_created": "/app/users",
            "user_login": "/app/users",
            "factory_reset": "/app/settings",
        }
        deep_link = context.get("url") or event_routes.get(
            preference.event_type, "/app"
        )
        data = context.get("data", {}).copy() if context.get("data") else {}
        data["url"] = deep_link

        return {
            "title": title,
            "body": body,
            "icon": preference.icon_url or "/static/icons/icon-192x192.png",
            "badge": preference.icon_url or "/static/icons/badge-72x72.png",
            "data": data,
        }

    @staticmethod
    def send_to_subscription(
        subscription: PushSubscription, notification: Dict, event_type: str, user: User
    ) -> bool:
        """
        Sends push notification using Temp File strategy to resolve ASN.1 errors.
        """
        info = NotificationService.get_vapid_info()

        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
        }

        vapid_claims = {
            "sub": f"mailto:{info['email']}",
        }

        notification_json = json.dumps(notification)

        # Create a temporary file for the private key
        # pywebpush works BEST with a file path, avoiding string parsing ambiguity
        fd, path = tempfile.mkstemp()
        try:
            # Convert base64url private key to PEM format
            try:
                padded = info["private_key"] + "=" * (
                    (4 - len(info["private_key"]) % 4) % 4
                )
                private_key_bytes = base64.urlsafe_b64decode(padded)
                private_value = int.from_bytes(private_key_bytes, "big")
                private_key_obj = ec.derive_private_key(
                    private_value, ec.SECP256R1(), default_backend()
                )

                pem = private_key_obj.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                )

                with os.fdopen(fd, "wb") as tmp:
                    tmp.write(pem)
            except Exception:
                os.close(fd)
                return False

            try:
                webpush(
                    subscription_info=subscription_info,
                    data=notification_json,
                    vapid_private_key=path,
                    vapid_claims=vapid_claims,
                    ttl=60,
                )

                NotificationLog.objects.create(
                    user=user,
                    event_type=event_type,
                    title=notification.get("title", ""),
                    body=notification.get("body", ""),
                    success=True,
                    subscription=subscription,
                )
                return True

            except WebPushException as e:
                status_code = getattr(e.response, "status_code", None)

                if status_code in [404, 410]:
                    subscription.is_active = False
                    subscription.save()

            except Exception:
                pass

        finally:
            # Clean up temp file
            if os.path.exists(path):
                os.remove(path)

        # Log failure if we got here
        try:
            NotificationLog.objects.create(
                user=user,
                event_type=event_type,
                title=notification.get("title", ""),
                body=notification.get("body", ""),
                success=False,
                error_message="WebPush Failed",
                subscription=subscription,
            )
        except Exception:
            pass

        return False

    @staticmethod
    def _ensure_preference_exists(event_type: str) -> NotificationPreference:
        defaults = {
            "title_template": f"{event_type.replace('_', ' ').title()}",
            "body_template": f"A {event_type.replace('_', ' ')} event occurred",
            "target_roles": ["admin"],
        }

        preference, created = NotificationPreference.objects.get_or_create(
            event_type=event_type,
            defaults={
                "enabled": True,
                "title_template": defaults["title_template"],
                "body_template": defaults["body_template"],
                "target_roles": defaults["target_roles"],
            },
        )
        return preference

    @staticmethod
    def send_notification(
        event_type: str,
        context: Dict,
        target_users: Optional[List[User]] = None,
        target_roles: Optional[List[str]] = None,
    ) -> Dict[str, int]:
        try:
            preference = NotificationPreference.objects.get(
                event_type=event_type, enabled=True
            )
        except NotificationPreference.DoesNotExist:
            preference = NotificationService._ensure_preference_exists(event_type)
            if not preference.enabled:
                return {"sent": 0, "failed": 0}

        notification = NotificationService.format_notification(preference, context)

        if target_users:
            users_to_notify = target_users
        elif target_roles:
            users_to_notify = User.objects.filter(role__in=target_roles, is_active=True)
        else:
            if preference.target_roles:
                users_to_notify = User.objects.filter(
                    role__in=preference.target_roles, is_active=True
                )
            else:
                users_to_notify = User.objects.filter(is_active=True)

        sent_count = 0
        failed_count = 0

        for user in users_to_notify:
            if not target_roles and not NotificationService.should_send_notification(
                event_type, user
            ):
                continue

            # Using iterator to avoid loading all subs into memory
            for subscription in PushSubscription.objects.filter(
                user=user, is_active=True
            ).iterator():
                success = NotificationService.send_to_subscription(
                    subscription, notification, event_type, user
                )
                if success:
                    sent_count += 1
                else:
                    failed_count += 1

        return {"sent": sent_count, "failed": failed_count}


def send_notification(
    event_type: str, context: Dict, target_users=None, target_roles=None
):
    return NotificationService.send_notification(
        event_type, context, target_users, target_roles
    )
