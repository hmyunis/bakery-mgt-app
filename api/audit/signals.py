import json
import sys

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.forms.models import model_to_dict

from .middleware import get_current_ip, get_current_user
from .models import AuditLog

# List of models to ignore (to prevent loops or noise)
IGNORED_MODELS = ["AuditLog", "Session", "LogEntry", "MigrationRecorder"]

# Sensitive fields to redact
SENSITIVE_FIELDS = ["password", "token"]


def is_migrating():
    """Check if migrations are currently running"""
    # Check if 'migrate' or 'makemigrations' is in the command arguments
    if len(sys.argv) > 1 and ("migrate" in sys.argv or "makemigrations" in sys.argv):
        return True
    return False


def _get_clean_dict(instance):
    """Convert model instance to dict, excluding sensitive fields/binary data."""
    data = model_to_dict(instance)
    # Remove sensitive data
    for key in list(data.keys()):
        if key in SENSITIVE_FIELDS:
            del data[key]
        # Handle FileFields (store name only)
        if hasattr(instance, key) and hasattr(getattr(instance, key), "name"):
            file_obj = getattr(instance, key)
            data[key] = file_obj.name if file_obj else None

    # Serialize to ensure JSON compatibility (dates, decimals)
    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


@receiver(pre_save)
def capture_old_state(sender, instance, **kwargs):
    if sender.__name__ in IGNORED_MODELS:
        return

    # If PK exists, it's an update. Fetch old state.
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_state = _get_clean_dict(old_instance)
        except sender.DoesNotExist:
            instance._old_state = {}
    else:
        instance._old_state = {}


@receiver(post_save)
def log_save(sender, instance, created, **kwargs):
    if sender.__name__ in IGNORED_MODELS:
        return

    # Skip logging during migrations
    if is_migrating():
        return

    try:
        user = get_current_user()
        ip = get_current_ip()

        # If no user context (e.g., shell script), optional: skip or log as 'System'
        # We will log as None for now

        new_state = _get_clean_dict(instance)

        if created:
            AuditLog.objects.create(
                actor=user,
                ip_address=ip,
                action="CREATE",
                table_name=sender._meta.model_name,
                record_id=str(instance.pk),
                old_value=None,
                new_value=new_state,
            )
        else:
            # Calculate Delta
            old_state = getattr(instance, "_old_state", {})

            # Only log if something actually changed
            if old_state != new_state:
                AuditLog.objects.create(
                    actor=user,
                    ip_address=ip,
                    action="UPDATE",
                    table_name=sender._meta.model_name,
                    record_id=str(instance.pk),
                    old_value=old_state,
                    new_value=new_state,
                )
    except Exception:
        # Silently fail during migrations or if table doesn't exist yet
        pass


@receiver(post_delete)
def log_delete(sender, instance, **kwargs):
    if sender.__name__ in IGNORED_MODELS:
        return

    # Skip logging during migrations
    if is_migrating():
        return

    try:
        user = get_current_user()
        ip = get_current_ip()
        old_state = _get_clean_dict(instance)
        AuditLog.objects.create(
            actor=user,
            ip_address=ip,
            action="DELETE",
            table_name=sender._meta.model_name,
            record_id=str(instance.pk),
            old_value=old_state,
            new_value=None,
        )
    except Exception:
        # Silently fail during migrations or if table doesn't exist yet
        pass
