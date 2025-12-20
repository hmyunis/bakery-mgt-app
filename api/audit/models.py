from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    ACTION_TYPES = (
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    action = models.CharField(max_length=10, choices=ACTION_TYPES)
    table_name = models.CharField(max_length=50)
    record_id = models.CharField(
        max_length=50
    )  # Use Char in case of UUIDs or Non-Int PKs

    # We store diffs as JSON.
    # In SQLite (Dev) this is text, In MySQL (Prod) this handles JSON.
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["table_name", "record_id"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["actor"]),
        ]

    def __str__(self):
        return f"{self.action} - {self.table_name} - {self.timestamp}"
