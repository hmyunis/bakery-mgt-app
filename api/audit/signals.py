import json
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection
from .models import AuditLog
from .middleware import get_current_user, get_current_ip

# List of models to ignore (to prevent loops or noise)
IGNORED_MODELS = ['AuditLog', 'Session', 'LogEntry', 'MigrationRecorder']

# Sensitive fields to redact
SENSITIVE_FIELDS = ['password', 'token']

def is_migrating():
    """Check if migrations are currently running"""
    # Check if we're in a migration context by checking if the table exists
    # and if we can actually query it
    try:
        # Try to check if table exists and is accessible
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_auditlog'")
            table_exists = cursor.fetchone() is not None
            if not table_exists:
                return True
            # Also check if we can query the table structure
            cursor.execute("PRAGMA table_info(audit_auditlog)")
            columns = cursor.fetchall()
            # Check if actor_id column exists (added in migration 0002)
            column_names = [col[1] for col in columns]
            if 'actor_id' not in column_names:
                return True
            return False
    except Exception:
        # If we can't check, assume we're migrating to be safe
        return True

def _get_clean_dict(instance):
    """Convert model instance to dict, excluding sensitive fields/binary data."""
    data = model_to_dict(instance)
    # Remove sensitive data
    for key in list(data.keys()):
        if key in SENSITIVE_FIELDS:
            del data[key]
        # Handle FileFields (store name only)
        if hasattr(instance, key) and hasattr(getattr(instance, key), 'name'):
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
                action='CREATE',
                table_name=sender._meta.model_name,
                record_id=str(instance.pk),
                old_value=None,
                new_value=new_state
            )
        else:
            # Calculate Delta
            old_state = getattr(instance, '_old_state', {})
            
            # Only log if something actually changed
            if old_state != new_state:
                AuditLog.objects.create(
                    actor=user,
                    ip_address=ip,
                    action='UPDATE',
                    table_name=sender._meta.model_name,
                    record_id=str(instance.pk),
                    old_value=old_state,
                    new_value=new_state
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
            action='DELETE',
            table_name=sender._meta.model_name,
            record_id=str(instance.pk),
            old_value=old_state,
            new_value=None
        )
    except Exception:
        # Silently fail during migrations or if table doesn't exist yet
        pass

