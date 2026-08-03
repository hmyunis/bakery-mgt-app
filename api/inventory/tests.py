from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Ingredient, KitchenTransfer, Purchase


class KitchenTransferTest(TestCase):
    def setUp(self):
        self.storekeeper = get_user_model().objects.create_user(
            username="storekeeper",
            password="password123",
            role="staff",
            permissions=["inventory"],
        )
        self.chef = get_user_model().objects.create_user(
            username="chef",
            password="password123",
            role="staff",
            permissions=["production"],
        )
        self.ingredient = Ingredient.objects.create(
            name="Flour",
            unit="kg",
            current_stock=Decimal("20.000"),
            kitchen_stock=Decimal("2.000"),
        )

    def test_transfer_moves_stock_and_keeps_an_immutable_snapshot(self):
        client = APIClient()
        client.force_authenticate(self.storekeeper)

        response = client.post(
            "/api/v1/inventory/kitchen-transfers/",
            {"ingredient": self.ingredient.id, "quantity": "5.000"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.ingredient.refresh_from_db()
        transfer = KitchenTransfer.objects.get()
        self.assertEqual(self.ingredient.current_stock, Decimal("15.000"))
        self.assertEqual(self.ingredient.kitchen_stock, Decimal("7.000"))
        self.assertEqual(transfer.storehouse_balance_before, Decimal("20.000"))
        self.assertEqual(transfer.kitchen_balance_before, Decimal("2.000"))

    def test_chef_can_view_balances_but_cannot_restock_kitchen(self):
        client = APIClient()
        client.force_authenticate(self.chef)

        self.assertEqual(
            client.get("/api/v1/inventory/kitchen-transfers/").status_code, 200
        )
        response = client.post(
            "/api/v1/inventory/kitchen-transfers/",
            {"ingredient": self.ingredient.id, "quantity": "1.000"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    @patch("inventory.signals.send_notification")
    def test_purchase_enters_storehouse_without_changing_kitchen(self, _):
        Purchase.objects.create(
            purchaser=self.storekeeper,
            ingredient=self.ingredient,
            quantity=Decimal("3.000"),
            total_cost=Decimal("90.00"),
        )

        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.current_stock, Decimal("23.000"))
        self.assertEqual(self.ingredient.kitchen_stock, Decimal("2.000"))
