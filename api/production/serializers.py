from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Sum
from rest_framework import serializers

from .models import IngredientUsage, Product, ProductionRun, Recipe, RecipeItem


class ProductSerializer(serializers.ModelSerializer):
    image_clear = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ("stock_quantity",)

    def create(self, validated_data):
        # Remove image_clear from validated_data before creating
        # (it's only used in updates to clear the image)
        validated_data.pop("image_clear", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Handle image removal: check for image_clear flag first
        image_clear = validated_data.pop("image_clear", False)
        if image_clear:
            # Clear the image field
            if instance.image:
                # Delete the actual file from storage
                instance.image.delete(save=False)
            validated_data["image"] = None

        return super().update(instance, validated_data)


class RecipeItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.unit", read_only=True)

    class Meta:
        model = RecipeItem
        fields = ["id", "ingredient", "ingredient_name", "quantity", "unit"]


class RecipeSerializer(serializers.ModelSerializer):
    items = RecipeItemSerializer(many=True)

    class Meta:
        model = Recipe
        fields = [
            "id",
            "product",
            "composite_ingredient",
            "instructions",
            "standard_yield",
            "items",
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "Add at least one ingredient for this batch estimate."
            )
        ingredient_ids = [item["ingredient"].id for item in value]
        if len(ingredient_ids) != len(set(ingredient_ids)):
            raise serializers.ValidationError("Each ingredient can only be added once.")
        if any(item["quantity"] <= 0 for item in value):
            raise serializers.ValidationError(
                "Every ingredient quantity must be greater than 0."
            )
        return value

    def validate_standard_yield(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expected output must be greater than 0.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        recipe = Recipe.objects.create(**validated_data)
        for item_data in items_data:
            RecipeItem.objects.create(recipe=recipe, **item_data)
        return recipe

    def update(self, instance, validated_data):
        # Full replace of items for simplicity in updates
        items_data = validated_data.pop("items", None)
        instance = super().update(instance, validated_data)

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                RecipeItem.objects.create(recipe=instance, **item_data)
        return instance


class IngredientUsageInputSerializer(serializers.Serializer):
    """
    Used only for input in ProductionRun.
    Chef confirms how much they actually used.
    """

    ingredient_id = serializers.IntegerField()
    actual_amount = serializers.DecimalField(max_digits=10, decimal_places=3)


class ProductionRunSerializer(serializers.ModelSerializer):
    usages = serializers.SerializerMethodField()
    performance = serializers.SerializerMethodField()
    # Input field for actual usage
    usage_inputs = IngredientUsageInputSerializer(
        many=True, write_only=True, required=False
    )

    product_name = serializers.CharField(source="product.name", read_only=True)
    composite_name = serializers.CharField(
        source="composite_ingredient.name", read_only=True
    )
    chef_name = serializers.CharField(source="chef.username", read_only=True)

    class Meta:
        model = ProductionRun
        fields = [
            "id",
            "chef",
            "chef_name",
            "product",
            "product_name",
            "composite_ingredient",
            "composite_name",
            "quantity_produced",
            "date_produced",
            "notes",
            "usages",
            "performance",
            "usage_inputs",
        ]
        read_only_fields = ("chef", "date_produced")

    def get_usages(self, obj):
        # Simple representation of usage for GET requests
        return list(
            obj.usages.values(
                "ingredient__name",
                "ingredient__unit",
                "theoretical_amount",
                "actual_amount",
                "wastage",
            )
        )

    def get_performance(self, obj):
        usages = [
            usage
            for usage in obj.usages.all()
            if usage.actual_amount > 0 and obj.quantity_produced > 0
        ]
        if not usages:
            return {
                "status": "baseline",
                "historical_run_count": 0,
                "ingredients": [],
            }

        history_rows = (
            IngredientUsage.objects.filter(
                production_run__product_id=obj.product_id,
                ingredient_id__in=[usage.ingredient_id for usage in usages],
                actual_amount__gt=0,
                production_run_id__lt=obj.id,
            )
            .values("ingredient_id")
            .annotate(
                total_input=Sum("actual_amount"),
                total_output=Sum("production_run__quantity_produced"),
                run_count=Count("id"),
            )
        )
        history_by_ingredient = {row["ingredient_id"]: row for row in history_rows}
        ingredient_results = []
        for usage in usages:
            current_yield = obj.quantity_produced / usage.actual_amount
            history = history_by_ingredient.get(usage.ingredient_id, {})
            total_input = history.get("total_input") or Decimal("0")
            total_output = history.get("total_output") or Decimal("0")
            run_count = history.get("run_count") or 0
            result = {
                "status": "baseline",
                "historical_run_count": run_count,
                "ingredient_name": usage.ingredient.name,
                "unit": usage.ingredient.unit,
                "actual_amount": usage.actual_amount,
                "actual_yield_per_unit": current_yield,
            }
            if run_count and total_input > 0 and total_output > 0:
                average_yield = total_output / total_input
                deviation = ((current_yield - average_yield) / average_yield) * Decimal(
                    "100"
                )
                status = "normal"
                if deviation <= Decimal("-15"):
                    status = "underproducing"
                elif deviation >= Decimal("15"):
                    status = "overproducing"
                result.update(
                    {
                        "status": status,
                        "average_yield_per_unit": average_yield,
                        "expected_output_from_average": (
                            usage.actual_amount * average_yield
                        ),
                        "deviation_percent": deviation,
                    }
                )
            ingredient_results.append(result)

        comparable = [
            result for result in ingredient_results if "deviation_percent" in result
        ]
        if not comparable:
            return {
                "status": "baseline",
                "historical_run_count": 0,
                "ingredients": ingredient_results,
            }

        most_unusual = max(
            comparable, key=lambda result: abs(result["deviation_percent"])
        )
        return {
            "status": most_unusual["status"],
            "historical_run_count": most_unusual["historical_run_count"],
            "ingredient_name": most_unusual["ingredient_name"],
            "unit": most_unusual["unit"],
            "actual_yield_per_unit": most_unusual["actual_yield_per_unit"],
            "average_yield_per_unit": most_unusual["average_yield_per_unit"],
            "expected_output_from_average": most_unusual[
                "expected_output_from_average"
            ],
            "deviation_percent": most_unusual["deviation_percent"],
            "ingredients": ingredient_results,
        }

    def validate(self, data):
        # Ensure either product or composite is selected, not both, not neither
        if data.get("product") and data.get("composite_ingredient"):
            raise serializers.ValidationError(
                "Cannot produce Product and Composite Ingredient in same run."
            )
        if not data.get("product") and not data.get("composite_ingredient"):
            raise serializers.ValidationError(
                "Must select a Product or Composite Ingredient."
            )
        return data

    def create(self, validated_data):
        usage_inputs = validated_data.pop("usage_inputs", [])

        # 1. Identify Recipe
        product = validated_data.get("product")
        composite = validated_data.get("composite_ingredient")
        qty = validated_data.get("quantity_produced")

        recipe = None
        if product:
            recipe = getattr(product, "recipe", None)
        elif composite:
            recipe = getattr(composite, "recipe", None)

        if not recipe:
            raise serializers.ValidationError(
                "Selected item has no batch estimate configured."
            )

        recipe_items = list(
            recipe.items.select_related("ingredient").order_by("ingredient_id")
        )
        if not recipe_items:
            raise serializers.ValidationError(
                "Selected item has no batch estimate configured."
            )

        # Validate standard_yield
        if recipe.standard_yield <= 0:
            raise serializers.ValidationError(
                "Batch estimate output must be greater than 0."
            )

        # Validate quantity
        if qty <= 0:
            raise serializers.ValidationError(
                "Production quantity must be greater than 0."
            )

        configured_ids = {item.ingredient_id for item in recipe_items}
        submitted_ids = [usage["ingredient_id"] for usage in usage_inputs]
        if len(submitted_ids) != len(set(submitted_ids)):
            raise serializers.ValidationError(
                {"usage_inputs": "Each ingredient can only be entered once."}
            )
        if set(submitted_ids) != configured_ids:
            raise serializers.ValidationError(
                {
                    "usage_inputs": (
                        "Enter the actual amount used for every ingredient in the "
                        "configured batch estimate."
                    )
                }
            )
        if any(usage["actual_amount"] <= 0 for usage in usage_inputs):
            raise serializers.ValidationError(
                {
                    "usage_inputs": (
                        "Every actual ingredient amount must be greater than 0."
                    )
                }
            )

        with transaction.atomic():
            ingredient_model = recipe_items[0].ingredient.__class__
            ingredients = list(
                ingredient_model.objects.select_for_update()
                .filter(pk__in=configured_ids)
                .order_by("pk")
            )
            ingredients_by_id = {
                ingredient.id: ingredient for ingredient in ingredients
            }
            actual_by_id = {
                usage["ingredient_id"]: usage["actual_amount"] for usage in usage_inputs
            }
            for ingredient in ingredients:
                actual = actual_by_id[ingredient.id]
                if ingredient.kitchen_stock < actual:
                    raise serializers.ValidationError(
                        {
                            "usage_inputs": (
                                f"Only {ingredient.kitchen_stock} {ingredient.unit} of "
                                f"{ingredient.name} is available in the kitchen store."
                            )
                        }
                    )

            run = ProductionRun.objects.create(**validated_data)

            # Update Stock of the Finished Good (use F() to avoid race conditions)
            from django.db.models import F

            if product:
                product.stock_quantity = F("stock_quantity") + int(
                    qty
                )  # Assuming integer units for products like bread
                product.save(update_fields=["stock_quantity"])
            elif composite:
                composite.kitchen_stock = F("kitchen_stock") + qty
                composite.save(update_fields=["kitchen_stock"])

            ratio = qty / recipe.standard_yield
            for recipe_item in recipe_items:
                ingredient = ingredients_by_id[recipe_item.ingredient_id]
                actual = actual_by_id[recipe_item.ingredient_id]
                IngredientUsage.objects.create(
                    production_run=run,
                    ingredient=ingredient,
                    theoretical_amount=recipe_item.quantity * ratio,
                    actual_amount=actual,
                )
                ingredient.kitchen_stock -= actual
                ingredient.save(update_fields=["kitchen_stock"])

        # Send notification outside transaction
        from notifications.models import NotificationEvent
        from notifications.services import send_notification

        product_name = product.name if product else composite.name
        chef_name = (
            validated_data.get("chef").username
            if validated_data.get("chef")
            else "System"
        )

        send_notification(
            NotificationEvent.PRODUCTION_COMPLETE,
            {
                "chef_name": chef_name,
                "quantity": str(qty),
                "product_name": product_name,
            },
        )

        return run
