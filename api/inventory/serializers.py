from rest_framework import serializers

from .models import Ingredient, Purchase, StockAdjustment


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = "__all__"
        read_only_fields = (
            "current_stock",
            "average_cost_per_unit",
            "last_purchased_price",
            "updated_at",
        )

    def validate_reorder_point(self, value):
        if value < 0:
            raise serializers.ValidationError("Reorder point cannot be negative.")
        return value


class PurchaseSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    purchaser_name = serializers.CharField(source="purchaser.username", read_only=True)

    class Meta:
        model = Purchase
        fields = "__all__"
        read_only_fields = ("unit_cost", "is_price_anomaly", "purchase_date")


class StockAdjustmentSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    actor_name = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = StockAdjustment
        fields = "__all__"
