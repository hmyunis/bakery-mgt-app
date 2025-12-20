from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sales"

    def ready(self):
        # NOTE:
        # Stock deduction for sales is handled in `SaleSerializer.create()` atomically.
        # We intentionally do NOT register sales signals to avoid
        # double-deducting stock.
        pass
