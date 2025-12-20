from rest_framework import serializers

from .models import BakerySettings


class BakerySettingsSerializer(serializers.ModelSerializer):
    """Serializer for bakery settings with fallback values."""

    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = BakerySettings
        fields = [
            "id",
            "name",
            "logo",
            "logo_url",
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
            "theme_color",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_logo_url(self, obj):
        """Return full URL for logo if available."""
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def to_representation(self, instance):
        """Apply fallback values."""
        data = super().to_representation(instance)
        # Apply fallbacks
        data["name"] = data.get("name") or "Bakery"
        data["phone_number"] = data.get("phone_number") or ""
        data["address"] = data.get("address") or ""
        data["email"] = data.get("email") or ""
        data["facebook_url"] = data.get("facebook_url") or ""
        data["instagram_url"] = data.get("instagram_url") or ""
        data["telegram_url"] = data.get("telegram_url") or ""
        data["tiktok_url"] = data.get("tiktok_url") or ""
        data["youtube_url"] = data.get("youtube_url") or ""
        data["x_url"] = data.get("x_url") or ""
        data["theme_color"] = data.get("theme_color") or "#f2751a"
        return data


class BakerySettingsUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating bakery settings (partial updates)."""

    class Meta:
        model = BakerySettings
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
            "theme_color",
        ]

    def validate_logo(self, value):
        """Validate logo file."""
        if value:
            # Check file size (max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Logo file size cannot exceed 5MB.")
            # Check file type
            allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
            if value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Logo must be a JPEG, PNG, GIF, or WebP image."
                )
        return value

    def validate_theme_color(self, value):
        """Validate theme color is a valid hex color."""
        if value:
            import re

            if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
                raise serializers.ValidationError(
                    "Theme color must be a valid hex color code (e.g., #06b6d4)."
                )
        return value

    def validate(self, attrs):
        """
        If a social link is enabled, a URL must be provided.
        """
        pairs = [
            ("facebook_enabled", "facebook_url"),
            ("instagram_enabled", "instagram_url"),
            ("telegram_enabled", "telegram_url"),
            ("tiktok_enabled", "tiktok_url"),
            ("youtube_enabled", "youtube_url"),
            ("x_enabled", "x_url"),
        ]

        errors = {}
        instance = getattr(self, "instance", None)

        for enabled_field, url_field in pairs:
            enabled = attrs.get(enabled_field)
            url = attrs.get(url_field)

            # Support partial updates by looking at instance values when field omitted
            if enabled is None and instance is not None:
                enabled = getattr(instance, enabled_field)
            if url is None and instance is not None:
                url = getattr(instance, url_field)

            if enabled and not url:
                errors[url_field] = [
                    "URL is required when this social link is enabled."
                ]

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
