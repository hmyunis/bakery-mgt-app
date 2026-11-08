from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from users.serializers import FactoryResetSerializer


class FactoryResetTest(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.admin = self.User.objects.create_user(
            username="admin",
            password="adminpassword123",
            role="admin",
        )
        self.staff = self.User.objects.create_user(
            username="staff1",
            password="staffpassword123",
            role="staff",
        )

    def test_serializer_accepts_password(self):
        serializer = FactoryResetSerializer(
            data={"password": "adminpassword123", "delete_users": True}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["password"], "adminpassword123")

    def test_serializer_accepts_confirmation_as_password(self):
        serializer = FactoryResetSerializer(
            data={"confirmation": "adminpassword123", "delete_users": True}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["password"], "adminpassword123")

    def test_serializer_fails_without_password_or_confirmation(self):
        serializer = FactoryResetSerializer(data={"delete_users": True})
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_factory_reset_with_confirmation_payload(self):
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            "/api/v1/users/factory_reset/",
            {
                "confirmation": "adminpassword123",
                "delete_users": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify staff user was deleted and admin user was kept
        self.assertFalse(self.User.objects.filter(username="staff1").exists())
        self.assertTrue(self.User.objects.filter(username="admin").exists())

    def test_factory_reset_with_password_payload(self):
        # Create another user to delete
        self.User.objects.create_user(
            username="staff2",
            password="staffpassword123",
            role="staff",
        )
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            "/api/v1/users/factory_reset/",
            {
                "password": "adminpassword123",
                "delete_users": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(self.User.objects.filter(username="staff2").exists())

    def test_factory_reset_wipes_all_interdependent_data(self):
        from decimal import Decimal

        from audit.models import AuditLog
        from inventory.models import (
            Ingredient,
            KitchenTransfer,
            Purchase,
            StockAdjustment,
        )
        from notifications.models import NotificationLog
        from production.models import (
            IngredientUsage,
            Product,
            ProductionRun,
            Recipe,
            RecipeItem,
        )
        from sales.models import (
            DailyClosing,
            PaymentMethod,
            Sale,
            SaleItem,
            SalePayment,
            ShiftSession,
            ShiftSessionProductCount,
        )
        from treasury.models import Expense

        # Setup interdependent data
        product = Product.objects.create(
            name="Sourdough", selling_price=Decimal("50.00"), stock_quantity=10
        )
        ingredient = Ingredient.objects.create(
            name="Flour",
            unit="kg",
            current_stock=Decimal("100.00"),
            average_cost_per_unit=Decimal("20.00"),
        )
        KitchenTransfer.objects.create(
            ingredient=ingredient,
            quantity=Decimal("10.00"),
            transferred_by=self.staff,
            storehouse_balance_before=Decimal("100.00"),
            kitchen_balance_before=Decimal("0.00"),
        )
        StockAdjustment.objects.create(
            ingredient=ingredient,
            actor=self.staff,
            quantity_change=Decimal("-2.00"),
            reason="waste",
        )
        expense = Expense.objects.create(
            title="Flour Purchase", amount=Decimal("200.00"), status=Expense.STATUS_PAID
        )
        Purchase.objects.create(
            ingredient=ingredient,
            quantity=Decimal("10.00"),
            total_cost=Decimal("200.00"),
            purchaser=self.staff,
            expense=expense,
        )
        recipe = Recipe.objects.create(product=product, standard_yield=Decimal("10.00"))
        RecipeItem.objects.create(
            recipe=recipe, ingredient=ingredient, quantity=Decimal("5.00")
        )
        run = ProductionRun.objects.create(
            chef=self.staff, product=product, quantity_produced=Decimal("10.00")
        )
        IngredientUsage.objects.create(
            production_run=run,
            ingredient=ingredient,
            theoretical_amount=Decimal("5.00"),
            actual_amount=Decimal("5.00"),
        )

        method = PaymentMethod.objects.create(name="Cash")
        session = ShiftSession.objects.create(
            opened_by=self.staff, status=ShiftSession.STATUS_OPENED
        )
        ShiftSessionProductCount.objects.create(
            session=session, product=product, opening_count=10
        )
        sale = Sale.objects.create(
            cashier=self.staff, shift_session=session, total_amount=Decimal("50.00")
        )
        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=1,
            unit_price=Decimal("50.00"),
            subtotal=Decimal("50.00"),
        )
        SalePayment.objects.create(sale=sale, method=method, amount=Decimal("50.00"))
        DailyClosing.objects.create(
            closed_by=self.staff,
            total_sales_expected=Decimal("50.00"),
            total_cash_declared=Decimal("50.00"),
            cash_discrepancy=Decimal("0.00"),
        )
        NotificationLog.objects.create(
            user=self.staff, event_type="low_stock", title="Low Stock", body="Flour low"
        )
        AuditLog.objects.create(
            actor=self.staff,
            action="CREATE",
            table_name="Product",
            record_id=str(product.id),
        )

        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            "/api/v1/users/factory_reset/",
            {
                "password": "adminpassword123",
                "delete_users": True,
                "delete_products": True,
                "delete_ingredients": True,
                "delete_recipes": True,
                "delete_production_runs": True,
                "delete_sales": True,
                "delete_purchases": True,
                "delete_payment_methods": True,
                "delete_audit_logs": True,
                "delete_notifications": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("errors"), [])

        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(Ingredient.objects.count(), 0)
        self.assertEqual(KitchenTransfer.objects.count(), 0)
        self.assertEqual(StockAdjustment.objects.count(), 0)
        self.assertEqual(Recipe.objects.count(), 0)
        self.assertEqual(ProductionRun.objects.count(), 0)
        self.assertEqual(Purchase.objects.count(), 0)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(ShiftSession.objects.count(), 0)
        self.assertEqual(ShiftSessionProductCount.objects.count(), 0)
        self.assertEqual(PaymentMethod.objects.count(), 0)
        self.assertEqual(AuditLog.objects.count(), 0)
        self.assertFalse(self.User.objects.filter(username="staff1").exists())
        self.assertTrue(self.User.objects.filter(username="admin").exists())

    def test_factory_reset_product_error_when_sales_not_deleted(self):
        from decimal import Decimal

        from production.models import Product
        from sales.models import PaymentMethod, Sale, SaleItem, SalePayment

        product = Product.objects.create(
            name="Cake", selling_price=Decimal("100.00"), stock_quantity=5
        )
        method = PaymentMethod.objects.create(name="Card")
        sale = Sale.objects.create(cashier=self.admin, total_amount=Decimal("100.00"))
        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=1,
            unit_price=Decimal("100.00"),
            subtotal=Decimal("100.00"),
        )
        SalePayment.objects.create(sale=sale, method=method, amount=Decimal("100.00"))

        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            "/api/v1/users/factory_reset/",
            {
                "password": "adminpassword123",
                "delete_products": True,
                "delete_sales": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            any(
                "Cannot delete Products" in err
                for err in response.data.get("errors", [])
            )
        )
        self.assertTrue(Product.objects.filter(name="Cake").exists())
