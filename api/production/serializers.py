from rest_framework import serializers
from django.db import transaction
from .models import Product, Recipe, RecipeItem, ProductionRun, IngredientUsage
from inventory.models import Ingredient

class ProductSerializer(serializers.ModelSerializer):
    image_clear = serializers.BooleanField(write_only=True, required=False)
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('stock_quantity',)
    
    def update(self, instance, validated_data):
        # Handle image removal: check for image_clear flag first
        image_clear = validated_data.pop('image_clear', False)
        if image_clear:
            validated_data['image'] = None
        
        return super().update(instance, validated_data)

class RecipeItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    unit = serializers.CharField(source='ingredient.unit', read_only=True)

    class Meta:
        model = RecipeItem
        fields = ['id', 'ingredient', 'ingredient_name', 'quantity', 'unit']

class RecipeSerializer(serializers.ModelSerializer):
    items = RecipeItemSerializer(many=True)

    class Meta:
        model = Recipe
        fields = ['id', 'product', 'composite_ingredient', 'instructions', 'standard_yield', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        recipe = Recipe.objects.create(**validated_data)
        for item_data in items_data:
            RecipeItem.objects.create(recipe=recipe, **item_data)
        return recipe
    
    def update(self, instance, validated_data):
        # Full replace of items for simplicity in updates
        items_data = validated_data.pop('items', None)
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
    # Input field for actual usage
    usage_inputs = IngredientUsageInputSerializer(many=True, write_only=True, required=False)
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    composite_name = serializers.CharField(source='composite_ingredient.name', read_only=True)
    chef_name = serializers.CharField(source='chef.username', read_only=True)

    class Meta:
        model = ProductionRun
        fields = [
            'id', 'chef', 'chef_name', 'product', 'product_name', 
            'composite_ingredient', 'composite_name', 
            'quantity_produced', 'date_produced', 'notes', 'usages', 'usage_inputs'
        ]
        read_only_fields = ('chef', 'date_produced')

    def get_usages(self, obj):
        # Simple representation of usage for GET requests
        return list(obj.usages.values('ingredient__name', 'ingredient__unit', 'theoretical_amount', 'actual_amount', 'wastage'))

    def validate(self, data):
        # Ensure either product or composite is selected, not both, not neither
        if data.get('product') and data.get('composite_ingredient'):
            raise serializers.ValidationError("Cannot produce Product and Composite Ingredient in same run.")
        if not data.get('product') and not data.get('composite_ingredient'):
            raise serializers.ValidationError("Must select a Product or Composite Ingredient.")
        return data

    def create(self, validated_data):
        usage_inputs = validated_data.pop('usage_inputs', [])
        
        # 1. Identify Recipe
        product = validated_data.get('product')
        composite = validated_data.get('composite_ingredient')
        qty = validated_data.get('quantity_produced')
        
        recipe = None
        if product:
            recipe = getattr(product, 'recipe', None)
        elif composite:
            recipe = getattr(composite, 'recipe', None)
            
        if not recipe:
            raise serializers.ValidationError("Selected item has no recipe configured.")
        
        # Validate recipe has items
        if not recipe.items.exists():
            raise serializers.ValidationError("Recipe has no ingredients configured.")
        
        # Validate standard_yield
        if recipe.standard_yield <= 0:
            raise serializers.ValidationError("Recipe standard yield must be greater than 0.")
        
        # Validate quantity
        if qty <= 0:
            raise serializers.ValidationError("Production quantity must be greater than 0.")

        # 2. Map User Inputs for fast lookup {ingredient_id: actual_amount}
        usage_map = {item['ingredient_id']: item['actual_amount'] for item in usage_inputs}
        
        # Validate usage inputs (all must be positive)
        for ingredient_id, actual_amount in usage_map.items():
            if actual_amount < 0:
                raise serializers.ValidationError(f"Actual amount for ingredient {ingredient_id} cannot be negative.")

        with transaction.atomic():
            # Create Run
            run = ProductionRun.objects.create(**validated_data)
            
            # Update Stock of the Finished Good (use F() to avoid race conditions)
            from django.db.models import F
            if product:
                product.stock_quantity = F('stock_quantity') + int(qty) # Assuming integer units for products like bread
                product.save(update_fields=['stock_quantity'])
            elif composite:
                composite.current_stock = F('current_stock') + qty
                composite.save(update_fields=['current_stock'])

            # 3. Calculate Ingredients & Deduct Stock
            ratio = qty / recipe.standard_yield
            
            # Prefetch recipe items to avoid N+1 queries
            recipe_items = recipe.items.select_related('ingredient').all()
            
            for item in recipe_items:
                theoretical = item.quantity * ratio
                
                # If Chef input provided, use it. Else assume theoretical.
                actual = usage_map.get(item.ingredient.id, theoretical)
                
                # Validate actual amount is not negative
                if actual < 0:
                    raise serializers.ValidationError(
                        f"Actual amount for {item.ingredient.name} cannot be negative."
                    )
                
                # Record Usage
                IngredientUsage.objects.create(
                    production_run=run,
                    ingredient=item.ingredient,
                    theoretical_amount=theoretical,
                    actual_amount=actual
                )
                
                # Deduct Raw Material Stock (use F() to avoid race conditions)
                # Note: We do not stop production if stock is low (negative stock allowed per logic)
                item.ingredient.current_stock = F('current_stock') - actual
                item.ingredient.save(update_fields=['current_stock'])
                
        # Send notification outside transaction
        from notifications.services import send_notification
        from notifications.models import NotificationEvent
        
        product_name = product.name if product else composite.name
        chef_name = validated_data.get('chef').username if validated_data.get('chef') else 'System'
        
        send_notification(
            NotificationEvent.PRODUCTION_COMPLETE,
            {
                'chef_name': chef_name,
                'quantity': str(qty),
                'product_name': product_name
            }
        )
                
        return run

