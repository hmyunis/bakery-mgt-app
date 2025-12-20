from django.contrib import admin

from .models import BakerySettings


@admin.register(BakerySettings)
class BakerySettingsAdmin(admin.ModelAdmin):
    """Admin interface for BakerySettings singleton."""

    def has_add_permission(self, request):
        """Disable add permission - only one instance allowed."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable delete permission - singleton must exist."""
        return False

    def changelist_view(self, request, extra_context=None):
        """Redirect to edit the singleton instance."""
        obj = BakerySettings.get_instance()
        return self.change_view(request, str(obj.pk), extra_context)

    list_display = ["name", "phone_number", "email", "updated_at"]
    fields = [
        "name",
        "logo",
        "phone_number",
        "address",
        "email",
        "facebook_enabled",
        "facebook_url",
        "instagram_enabled",
        "instagram_url",
        "telegram_enabled",
        "telegram_url",
        "tiktok_enabled",
        "tiktok_url",
        "youtube_enabled",
        "youtube_url",
        "x_enabled",
        "x_url",
        "created_at",
        "updated_at",
    ]
    readonly_fields = ["created_at", "updated_at"]
