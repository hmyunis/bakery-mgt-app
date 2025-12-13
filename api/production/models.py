from django.db import models
from django.conf import settings
from core.utils import get_upload_path

class Product(models.Model):
    """
    Finished Goods sold at the POS (e.g., Burger Bread, Sponge Cake).
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image = models.FileField(upload_to=get_upload_path, null=True, blank=True)
    
    # Financials
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Stock of Finished Goods (separate from Raw Ingredients)
    stock_quantity = models.IntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.name

class Recipe(models.Model):
    """
    Linking instructions to a Product OR a Composite Ingredient.
    Only ONE of 'product' or 'composite_ingredient' should be set.
    """
    product = models.OneToOneField(
        Product, 
        on_delete=models.CASCADE, 
        null=True, blank=True, 
        related_name='recipe'
    )
    composite_ingredient = models.OneToOneField(
        'inventory.Ingredient',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='recipe'
    )
    
    instructions = models.TextField(blank=True)
    
    # Yield info (e.g., This recipe makes 100 breads)
    standard_yield = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)

    def __str__(self):
        if self.product:
            return f"Recipe for {self.product.name}"
        return f"Recipe for {self.composite_ingredient.name}"

class RecipeItem(models.Model):
    """
    The lines in a recipe. 
    E.g., "10kg Flour"
    """
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='items')
    ingredient = models.ForeignKey('inventory.Ingredient', on_delete=models.PROTECT)
    
    # Quantity required per Standard Yield of the Recipe
    quantity = models.DecimalField(max_digits=10, decimal_places=3)

    def __str__(self):
        return f"{self.ingredient.name} - {self.quantity}"

class ProductionRun(models.Model):
    """
    The event of Baking.
    """
    chef = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # What was made?
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    composite_ingredient = models.ForeignKey('inventory.Ingredient', on_delete=models.CASCADE, null=True, blank=True)
    
    quantity_produced = models.DecimalField(max_digits=10, decimal_places=2)
    
    date_produced = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        if self.product:
            name = self.product.name
        elif self.composite_ingredient:
            name = self.composite_ingredient.name
        else:
            name = "Unknown"
        return f"Produced {self.quantity_produced} {name}"

class IngredientUsage(models.Model):
    """
    Tracks theoretical vs actual usage for a specific run.
    This is where wastage is calculated.
    """
    production_run = models.ForeignKey(ProductionRun, on_delete=models.CASCADE, related_name='usages')
    ingredient = models.ForeignKey('inventory.Ingredient', on_delete=models.PROTECT)
    
    theoretical_amount = models.DecimalField(max_digits=10, decimal_places=3)
    actual_amount = models.DecimalField(max_digits=10, decimal_places=3)
    
    # Wastage = Actual - Theoretical
    wastage = models.DecimalField(max_digits=10, decimal_places=3, default=0)

    def save(self, *args, **kwargs):
        self.wastage = self.actual_amount - self.theoretical_amount
        super().save(*args, **kwargs)
