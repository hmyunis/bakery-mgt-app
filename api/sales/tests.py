from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from production.models import Product

from .models import ShiftSessionProductCount


class ShiftStockOverrideTest(TestCase):
    def test_open_and_close_override_stock_and_keep_audit_counts(self):
        user = get_user_model().objects.create_user(
            username="cashier",
            password="password123",
            role="staff",
            permissions=["sales"],
        )
        product = Product.objects.create(
            name="Bread", selling_price="10.00", stock_quantity=10
        )
        client = APIClient()
        client.force_authenticate(user)

        response = client.post(
            "/api/v1/sales/shift-sessions/open/",
            {"counts": [{"product_id": product.id, "opening_count": 7}]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        count = ShiftSessionProductCount.objects.get()
        product.refresh_from_db()
        self.assertEqual(count.opening_stock_before_override, 10)
        self.assertEqual(product.stock_quantity, 7)

        product.stock_quantity = 4
        product.save(update_fields=["stock_quantity"])
        response = client.post(
            f"/api/v1/sales/shift-sessions/{count.session_id}/close/",
            {
                "total_cash_declared": "0.00",
                "total_digital_declared": "0.00",
                "counts": [{"product_id": product.id, "closing_count": 3}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        count.refresh_from_db()
        product.refresh_from_db()
        self.assertEqual(count.closing_stock_before_override, 4)
        self.assertEqual(product.stock_quantity, 3)
