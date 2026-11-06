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

    def test_close_shift_with_optional_digital_declared_autofills(self):
        user = get_user_model().objects.create_user(
            username="cashier2",
            password="password123",
            role="staff",
            permissions=["sales"],
        )
        product = Product.objects.create(
            name="Cake", selling_price="50.00", stock_quantity=5
        )
        client = APIClient()
        client.force_authenticate(user)

        open_res = client.post(
            "/api/v1/sales/shift-sessions/open/",
            {"counts": [{"product_id": product.id, "opening_count": 5}]},
            format="json",
        )
        self.assertEqual(open_res.status_code, 201)
        session_id = open_res.data["id"]

        # Close without total_digital_declared
        close_res = client.post(
            f"/api/v1/sales/shift-sessions/{session_id}/close/",
            {
                "total_cash_declared": "200.00",
                "counts": [{"product_id": product.id, "closing_count": 5}],
            },
            format="json",
        )
        self.assertEqual(close_res.status_code, 200)
        self.assertEqual(float(close_res.data["total_digital_declared"]), 0.0)

    def test_auto_deduct_stock_on_sales_setting(self):
        from core.models import BakerySettings
        from sales.models import PaymentMethod

        settings = BakerySettings.get_instance()
        settings.auto_deduct_stock_on_sales = False
        settings.save()

        user = get_user_model().objects.create_user(
            username="cashier3",
            password="password123",
            role="staff",
            permissions=["sales"],
        )
        product = Product.objects.create(
            name="Roll", selling_price="5.00", stock_quantity=0
        )
        method = PaymentMethod.objects.create(name="Cash", is_active=True)

        client = APIClient()
        client.force_authenticate(user)

        open_res = client.post(
            "/api/v1/sales/shift-sessions/open/",
            {"counts": [{"product_id": product.id, "opening_count": 0}]},
            format="json",
        )
        session_id = open_res.data["id"]

        # With auto_deduct_stock = False, sale succeeds even with 0 stock
        sale_res = client.post(
            "/api/v1/sales/sales/",
            {
                "shift_session": session_id,
                "items_input": [{"product_id": product.id, "quantity": 10}],
                "payments_input": [{"method_id": method.id, "amount": "50.00"}],
            },
            format="json",
        )
        self.assertEqual(sale_res.status_code, 201)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)  # NOT deducted

        # Enable auto_deduct_stock = True
        settings.auto_deduct_stock_on_sales = True
        settings.save()

        product.stock_quantity = 5
        product.save(update_fields=["stock_quantity"])

        # Should fail when requesting more than stock (10 > 5)
        fail_res = client.post(
            "/api/v1/sales/sales/",
            {
                "shift_session": session_id,
                "items_input": [{"product_id": product.id, "quantity": 10}],
                "payments_input": [{"method_id": method.id, "amount": "50.00"}],
            },
            format="json",
        )
        self.assertEqual(fail_res.status_code, 400)

        # Should succeed and deduct when within stock (3 <= 5)
        ok_res = client.post(
            "/api/v1/sales/sales/",
            {
                "shift_session": session_id,
                "items_input": [{"product_id": product.id, "quantity": 3}],
                "payments_input": [{"method_id": method.id, "amount": "15.00"}],
            },
            format="json",
        )
        self.assertEqual(ok_res.status_code, 201)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 2)  # 5 - 3 = 2
