from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from inventory.models import Ingredient

from .models import IngredientUsage, Product, ProductionRun, Recipe, RecipeItem


class KitchenProductionTest(TestCase):
    def setUp(self):
        self.chef = get_user_model().objects.create_user(
            username="chef",
            password="password123",
            role="staff",
            permissions=["production"],
        )
        self.flour = Ingredient.objects.create(
            name="Flour",
            unit="kg",
            current_stock=Decimal("50.000"),
            kitchen_stock=Decimal("40.000"),
        )
        self.salt = Ingredient.objects.create(
            name="Salt",
            unit="kg",
            current_stock=Decimal("10.000"),
            kitchen_stock=Decimal("5.000"),
        )
        self.product = Product.objects.create(name="Bread", selling_price="10.00")
        recipe = Recipe.objects.create(product=self.product, standard_yield="200.00")
        RecipeItem.objects.create(
            recipe=recipe, ingredient=self.flour, quantity="10.000"
        )
        RecipeItem.objects.create(recipe=recipe, ingredient=self.salt, quantity="1.000")
        self.client = APIClient()
        self.client.force_authenticate(self.chef)

    def _record(self, output, flour_used, salt_used="1.000"):
        return self.client.post(
            "/api/v1/production/runs/",
            {
                "product": self.product.id,
                "quantity_produced": str(output),
                "usage_inputs": [
                    {
                        "ingredient_id": self.flour.id,
                        "actual_amount": str(flour_used),
                    },
                    {
                        "ingredient_id": self.salt.id,
                        "actual_amount": str(salt_used),
                    },
                ],
            },
            format="json",
        )

    @patch("notifications.services.send_notification")
    def test_runs_consume_kitchen_stock_and_flag_historical_yield_anomalies(self, _):
        baseline = self._record("200.00", "10.000")
        under = self._record("150.00", "10.000")
        over = self._record("220.00", "10.000")

        self.assertEqual(baseline.status_code, 201)
        self.assertEqual(under.status_code, 201)
        self.assertEqual(over.status_code, 201)
        self.assertEqual(baseline.data["performance"]["status"], "baseline")
        self.assertEqual(under.data["performance"]["status"], "underproducing")
        self.assertEqual(over.data["performance"]["status"], "overproducing")

        self.flour.refresh_from_db()
        self.salt.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.flour.current_stock, Decimal("50.000"))
        self.assertEqual(self.flour.kitchen_stock, Decimal("10.000"))
        self.assertEqual(self.salt.kitchen_stock, Decimal("2.000"))
        self.assertEqual(self.product.stock_quantity, 570)
        self.assertEqual(
            IngredientUsage.objects.filter(
                production_run_id=baseline.data["id"]
            ).count(),
            2,
        )
        self.assertEqual(len(under.data["performance"]["ingredients"]), 2)
        self.assertEqual(
            IngredientUsage.objects.get(
                production_run_id=baseline.data["id"], ingredient=self.flour
            ).wastage,
            0,
        )

    @patch("notifications.services.send_notification")
    def test_run_rejects_more_than_the_available_kitchen_balance(self, _):
        response = self._record("200.00", "41.000")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(ProductionRun.objects.exists())
        self.flour.refresh_from_db()
        self.assertEqual(self.flour.kitchen_stock, Decimal("40.000"))

    @patch("notifications.services.send_notification")
    def test_run_requires_actual_amounts_for_the_full_bulk_batch(self, _):
        response = self.client.post(
            "/api/v1/production/runs/",
            {
                "product": self.product.id,
                "quantity_produced": "200.00",
                "usage_inputs": [
                    {
                        "ingredient_id": self.flour.id,
                        "actual_amount": "10.000",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(ProductionRun.objects.exists())
