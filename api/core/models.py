from django.db import models


class BakerySettings(models.Model):
    """
    Singleton model for bakery information.
    Only one instance should exist.
    """

    name = models.CharField(max_length=200, blank=True, null=True)
    logo = models.ImageField(upload_to="uploads/bakery/", blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Social media (optional). Shown publicly only when enabled AND URL provided.
    facebook_enabled = models.BooleanField(default=False)
    facebook_url = models.URLField(blank=True, null=True)
    instagram_enabled = models.BooleanField(default=False)
    instagram_url = models.URLField(blank=True, null=True)
    telegram_enabled = models.BooleanField(default=False)
    telegram_url = models.URLField(blank=True, null=True)
    tiktok_enabled = models.BooleanField(default=False)
    tiktok_url = models.URLField(blank=True, null=True)
    youtube_enabled = models.BooleanField(default=False)
    youtube_url = models.URLField(blank=True, null=True)
    x_enabled = models.BooleanField(default=False)
    x_url = models.URLField(blank=True, null=True)

    # Theme customization
    theme_color = models.CharField(
        max_length=7,
        default="#f2751a",
        help_text="Hex color code for app accent/theme color (e.g., #f2751a)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bakery Settings"
        verbose_name_plural = "Bakery Settings"

    def __str__(self):
        return self.name or "Bakery"

    @classmethod
    def get_instance(cls):
        """Get or create the singleton instance."""
        instance, created = cls.objects.get_or_create(pk=1)
        return instance
