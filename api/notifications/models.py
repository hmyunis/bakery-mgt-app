from django.conf import settings
from django.db import models


class NotificationEvent(models.TextChoices):
    """Predefined events that can trigger notifications"""

    LOW_STOCK = "low_stock", "Low Stock Alert"
    PRICE_ANOMALY = "price_anomaly", "Price Anomaly Detected"
    PRODUCTION_COMPLETE = "production_complete", "Production Run Completed"
    SALE_COMPLETE = "sale_complete", "Sale Completed"
    EOD_CLOSING = "eod_closing", "End of Day Closing"
    STOCK_ADJUSTMENT = "stock_adjustment", "Stock Adjustment Made"
    PURCHASE_CREATED = "purchase_created", "Purchase Recorded"
    USER_CREATED = "user_created", "New User Created"
    USER_LOGIN = "user_login", "User Login"
    FACTORY_RESET = "factory_reset", "Factory Reset Performed"


class PushSubscription(models.Model):
    """
    Stores user's browser push notification subscription.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=200)  # Public key
    auth = models.CharField(max_length=100)  # Auth secret
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["user", "endpoint"]

    def __str__(self):
        return f"{self.user.username} - {self.endpoint[:50]}"


class NotificationPreference(models.Model):
    """
    Admin-configurable: Which events trigger notifications for which roles.
    """

    event_type = models.CharField(
        max_length=50, choices=NotificationEvent.choices, unique=True
    )
    enabled = models.BooleanField(default=True)
    target_roles = models.JSONField(
        default=list,
        help_text=(
            "List of roles that should receive this notification. "
            "Empty list means all roles."
        ),
    )
    title_template = models.CharField(
        max_length=200,
        help_text="Notification title template. Use {variable} for dynamic content.",
    )
    body_template = models.TextField(
        help_text="Notification body template. Use {variable} for dynamic content."
    )
    icon_url = models.URLField(blank=True, null=True, help_text="Optional icon URL")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_type"]

    def __str__(self):
        roles_str = ", ".join(self.target_roles) if self.target_roles else "All Roles"
        return f"{self.get_event_type_display()} - {roles_str}"


class NotificationLog(models.Model):
    """
    Tracks sent notifications for auditing and debugging.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    event_type = models.CharField(max_length=50, choices=NotificationEvent.choices)
    title = models.CharField(max_length=200)
    body = models.TextField()
    data = models.JSONField(
        default=dict, blank=True, help_text="Additional notification data"
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    subscription = models.ForeignKey(
        PushSubscription, on_delete=models.SET_NULL, null=True
    )

    class Meta:
        ordering = ["-sent_at"]
        indexes = [
            models.Index(fields=["user", "-sent_at"]),
            models.Index(fields=["event_type", "-sent_at"]),
        ]

    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.event_type} - {self.user} - {self.sent_at}"
