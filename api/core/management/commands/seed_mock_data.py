from __future__ import annotations

import random
import string
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, call_command
from django.db import transaction
from django.utils import timezone

from audit.models import AuditLog
from core.models import BakerySettings
from inventory.models import Ingredient, Purchase, StockAdjustment, UnitChoices
from notifications.models import (
    NotificationEvent,
    NotificationLog,
    NotificationPreference,
    PushSubscription,
)
from production import models as production_models
from sales.models import (
    DailyClosing,
    PaymentMethod,
    Sale,
    SaleItem,
    SalePayment,
    ShiftSession,
    ShiftSessionProductCount,
)
from treasury import models as treasury_models
from users.models import (
    AttendanceRecord,
    Employee,
    LeaveRecord,
    PayrollRecord,
    ShiftAssignment,
    ShiftTemplate,
)

# NOTE: keep data deterministic-ish for consistent local dev.
random.seed(42)


class Command(BaseCommand):
    help = "Erase all data and seed mock rows for the current app schema."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Number of rows to create per model (default: 10).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]

        self.stdout.write(self.style.WARNING("Flushing database (all data erased)..."))
        call_command("flush", "--noinput")

        self.stdout.write(self.style.SUCCESS("Seeding users..."))
        users = self._seed_users(count)

        self.stdout.write(self.style.SUCCESS("Seeding employees..."))
        employees = self._seed_employees(users, count)

        self.stdout.write(self.style.SUCCESS("Seeding shift templates..."))
        shift_templates = self._seed_shift_templates(count)

        self.stdout.write(self.style.SUCCESS("Seeding shift assignments..."))
        shift_assignments = self._seed_shift_assignments(
            employees, shift_templates, count
        )

        self.stdout.write(self.style.SUCCESS("Seeding attendance records..."))
        self._seed_attendance_records(shift_assignments, users, count)

        self.stdout.write(self.style.SUCCESS("Seeding leave records..."))
        self._seed_leave_records(employees, count)

        self.stdout.write(self.style.SUCCESS("Seeding payroll records..."))
        self._seed_payroll_records(employees, count)

        self.stdout.write(self.style.SUCCESS("Seeding bakery settings..."))
        self._seed_bakery_settings(count)

        self.stdout.write(self.style.SUCCESS("Seeding ingredients..."))
        ingredients = self._seed_ingredients(count)

        self.stdout.write(self.style.SUCCESS("Seeding products + recipes..."))
        products = self._seed_products(count)
        recipes = self._seed_recipes(products)
        self._seed_recipe_items(recipes, ingredients, count)

        self.stdout.write(
            self.style.SUCCESS("Seeding purchases + stock adjustments...")
        )
        self._seed_purchases(ingredients, users, count)
        self._seed_stock_adjustments(ingredients, users, count)

        self.stdout.write(self.style.SUCCESS("Seeding production runs + usage..."))
        production_runs = self._seed_production_runs(products, users, count)
        self._seed_ingredient_usage(production_runs, ingredients, count)

        self.stdout.write(self.style.SUCCESS("Seeding sales + payments..."))
        payment_methods = self._seed_payment_methods(count)
        bank_accounts = self._seed_bank_accounts(payment_methods, count)
        self._seed_bank_transactions(bank_accounts, users, count)
        self._seed_expenses(bank_accounts, users, count)
        shift_sessions = self._seed_shift_sessions(users, count)
        self._seed_shift_session_product_counts(shift_sessions, products, count)
        sales = self._seed_sales(users, shift_sessions, count)
        self._seed_sale_items(sales, products, count)
        self._seed_sale_payments(sales, payment_methods, count)

        self.stdout.write(self.style.SUCCESS("Seeding daily closings..."))
        self._seed_daily_closings(users, count)

        self.stdout.write(self.style.SUCCESS("Seeding notifications..."))
        subscriptions = self._seed_push_subscriptions(users, count)
        self._seed_notification_preferences()
        self._seed_notification_logs(users, subscriptions, count)

        self.stdout.write(self.style.SUCCESS("Seeding audit logs..."))
        self._seed_audit_logs(users, count)

        self.stdout.write(self.style.SUCCESS("Seeding complete."))

    def _seed_users(self, count):
        User = get_user_model()
        roles = ["admin", "storekeeper", "chef", "cashier"]
        first_names = [
            "Abebe",
            "Aster",
            "Bekele",
            "Dagmawi",
            "Eleni",
            "Fikru",
            "Hana",
            "Kebede",
            "Liya",
            "Tadesse",
        ]
        last_names = [
            "Gebre",
            "Tesfaye",
            "Mekonnen",
            "Alemu",
            "Hailu",
            "Yohannes",
            "Assefa",
            "Abreha",
            "Kassa",
            "Wolde",
        ]

        users = []
        for i in range(count):
            full_name = (
                f"{first_names[i % len(first_names)]} {last_names[i % len(last_names)]}"
            )
            username = f"user{i + 1}"
            phone_number = f"0911{i + 1:06d}"
            user = User(
                username=username,
                full_name=full_name,
                phone_number=phone_number,
                role=roles[i % len(roles)],
                email=f"{username}@example.com",
            )
            user.set_password("password123")
            user.save()
            users.append(user)
        return users

    def _seed_bakery_settings(self, count):
        for i in range(count):
            BakerySettings.objects.create(
                name=f"Sunrise Bakery {i + 1}",
                phone_number=f"0111{i + 1:06d}",
                address=f"Bole, Addis Ababa #{i + 1}",
                email=f"bakery{i + 1}@example.com",
                facebook_enabled=bool(i % 2),
                facebook_url="https://facebook.com/sunrisebakery",
                instagram_enabled=bool((i + 1) % 2),
                instagram_url="https://instagram.com/sunrisebakery",
                telegram_enabled=bool(i % 3 == 0),
                telegram_url="https://t.me/sunrisebakery",
                tiktok_enabled=bool(i % 4 == 0),
                tiktok_url="https://tiktok.com/@sunrisebakery",
                youtube_enabled=bool(i % 5 == 0),
                youtube_url="https://youtube.com/@sunrisebakery",
                x_enabled=bool(i % 2 == 0),
                x_url="https://x.com/sunrisebakery",
                theme_color="#f2751a",
            )

    def _seed_ingredients(self, count):
        names = [
            "Flour",
            "Sugar",
            "Butter",
            "Yeast",
            "Milk",
            "Eggs",
            "Salt",
            "Oil",
            "Cocoa",
            "Vanilla",
        ]
        units = [
            UnitChoices.KG,
            UnitChoices.KG,
            UnitChoices.KG,
            UnitChoices.GRAM,
            UnitChoices.LITER,
            UnitChoices.PCS,
            UnitChoices.GRAM,
            UnitChoices.LITER,
            UnitChoices.GRAM,
            UnitChoices.ML,
        ]
        ingredients = []
        for i in range(count):
            ingredient = Ingredient.objects.create(
                name=names[i % len(names)] + ("" if i < len(names) else f" {i + 1}"),
                unit=units[i % len(units)],
                current_stock=Decimal("100.000") + Decimal(i),
                reorder_point=Decimal("10.000"),
                average_cost_per_unit=Decimal("25.00"),
                last_purchased_price=Decimal("27.50"),
            )
            ingredients.append(ingredient)
        return ingredients

    def _seed_products(self, count):
        product_names = [
            "Burger Bread",
            "Sponge Cake",
            "Croissant",
            "Baguette",
            "Pita",
            "Donut",
            "Muffin",
            "Biscuit",
            "Cinnamon Roll",
            "Toast Loaf",
        ]
        products = []
        for i in range(count):
            product = production_models.Product.objects.create(
                name=product_names[i % len(product_names)]
                + ("" if i < len(product_names) else f" {i + 1}"),
                description="Freshly baked and delicious.",
                selling_price=Decimal("35.00") + Decimal(i),
                stock_quantity=50 + i,
                is_active=True,
            )
            products.append(product)
        return products

    def _seed_recipes(self, products):
        recipes = []
        for product in products:
            recipe = production_models.Recipe.objects.create(
                product=product,
                instructions=f"Mix ingredients for {product.name} and bake.",
                standard_yield=Decimal("10.00"),
            )
            recipes.append(recipe)
        return recipes

    def _seed_recipe_items(self, recipes, ingredients, count):
        for i in range(count):
            production_models.RecipeItem.objects.create(
                recipe=recipes[i % len(recipes)],
                ingredient=ingredients[i % len(ingredients)],
                quantity=Decimal("2.500") + Decimal(i) / Decimal("10"),
            )

    def _seed_purchases(self, ingredients, users, count):
        for i in range(count):
            ingredient = ingredients[i % len(ingredients)]
            quantity = Decimal("10.000") + Decimal(i)
            total_cost = Decimal("250.00") + Decimal(i * 10)
            Purchase.objects.create(
                purchaser=users[i % len(users)],
                ingredient=ingredient,
                quantity=quantity,
                total_cost=total_cost,
                vendor="Addis Suppliers",
                notes="Weekly restock",
            )

    def _seed_stock_adjustments(self, ingredients, users, count):
        reasons = ["waste", "theft", "audit", "return", "packaging_usage"]
        for i in range(count):
            StockAdjustment.objects.create(
                ingredient=ingredients[i % len(ingredients)],
                actor=users[i % len(users)],
                quantity_change=Decimal("-1.000") if i % 2 == 0 else Decimal("1.500"),
                reason=reasons[i % len(reasons)],
                notes="System adjustment",
            )

    def _seed_production_runs(self, products, users, count):
        runs = []
        for i in range(count):
            run = production_models.ProductionRun.objects.create(
                chef=users[i % len(users)],
                product=products[i % len(products)],
                quantity_produced=Decimal("20.00") + Decimal(i),
                notes="Morning batch",
            )
            runs.append(run)
        return runs

    def _seed_ingredient_usage(self, runs, ingredients, count):
        for i in range(count):
            theoretical = Decimal("5.000") + Decimal(i) / Decimal("10")
            actual = theoretical + Decimal("0.300")
            production_models.IngredientUsage.objects.create(
                production_run=runs[i % len(runs)],
                ingredient=ingredients[i % len(ingredients)],
                theoretical_amount=theoretical,
                actual_amount=actual,
            )

    def _seed_payment_methods(self, count):
        names = [
            "Cash",
            "Telebirr",
            "CBE",
            "Amole",
            "HelloCash",
            "Awash Bank",
            "Dashen Bank",
            "BirrLink",
            "M-Birr",
            "Visa",
        ]
        methods = []
        for i in range(count):
            method = PaymentMethod.objects.create(
                name=names[i % len(names)] + ("" if i < len(names) else f" {i + 1}"),
                is_active=True,
                config_details="Pay to 0911-000000",
            )
            methods.append(method)
        return methods

    def _seed_bank_accounts(self, payment_methods, count):
        bank_names = [
            "Commercial Bank of Ethiopia",
            "Awash Bank",
            "Dashen Bank",
            "Bank of Abyssinia",
            "Cooperative Bank of Oromia",
        ]
        accounts = []
        for i in range(count):
            account = treasury_models.BankAccount.objects.create(
                name=f"Operating Account {i + 1}",
                bank_name=bank_names[i % len(bank_names)],
                account_holder="Sunrise Bakery PLC",
                account_number=f"1000{i + 1:06d}",
                balance=Decimal("50000.00") + Decimal(i * 2500),
                notes="Seeded bank account",
                is_active=i % 7 != 6,
            )
            account.linked_payment_methods.add(
                payment_methods[i % len(payment_methods)]
            )
            accounts.append(account)
        return accounts

    def _seed_bank_transactions(self, bank_accounts, users, count):
        for i in range(count):
            treasury_models.BankTransaction.objects.create(
                account=bank_accounts[i % len(bank_accounts)],
                transaction_type=(
                    treasury_models.BankTransaction.TYPE_DEPOSIT
                    if i % 2 == 0
                    else treasury_models.BankTransaction.TYPE_WITHDRAWAL
                ),
                amount=Decimal("1000.00") + Decimal(i * 125),
                notes="Seeded transaction",
                recorded_by=users[i % len(users)],
            )

    def _seed_expenses(self, bank_accounts, users, count):
        expense_titles = [
            "Utility Bill",
            "Packaging",
            "Equipment Repair",
            "Transport",
            "Cleaning Supplies",
        ]
        for i in range(count):
            is_paid = i % 2 == 0
            treasury_models.Expense.objects.create(
                title=f"{expense_titles[i % len(expense_titles)]} #{i + 1}",
                amount=Decimal("750.00") + Decimal(i * 50),
                status=(
                    treasury_models.Expense.STATUS_PAID
                    if is_paid
                    else treasury_models.Expense.STATUS_PENDING
                ),
                account=bank_accounts[i % len(bank_accounts)] if is_paid else None,
                notes="Seeded expense",
                recorded_by=users[i % len(users)],
            )

    def _seed_shift_sessions(self, users, count):
        sessions = []
        previous_session = None
        now = timezone.now()
        for i in range(count):
            mod = i % 3
            status = (
                ShiftSession.STATUS_OPENED
                if mod == 0
                else ShiftSession.STATUS_PENDING_HANDOVER_ACCEPTANCE
                if mod == 1
                else ShiftSession.STATUS_CLOSED
            )
            session = ShiftSession.objects.create(
                opened_by=users[i % len(users)],
                open_notes="Seeded shift session",
                closed_by=users[(i + 1) % len(users)] if mod in (1, 2) else None,
                closed_at=now - timedelta(hours=1) if mod in (1, 2) else None,
                close_notes="Seeded close notes" if mod in (1, 2) else "",
                total_cash_declared=Decimal("1200.00") + Decimal(i * 20)
                if mod in (1, 2)
                else None,
                total_digital_declared=Decimal("300.00") + Decimal(i * 10)
                if mod in (1, 2)
                else None,
                accepted_by=users[(i + 2) % len(users)] if mod == 2 else None,
                accepted_at=now if mod == 2 else None,
                acceptance_notes="Seeded acceptance notes" if mod == 2 else "",
                previous_session=previous_session,
                status=status,
            )
            sessions.append(session)
            previous_session = session
        return sessions

    def _seed_shift_session_product_counts(self, shift_sessions, products, count):
        for i in range(count):
            opening_count = 20 + i
            closing_count = opening_count - (i % 4) if i % 3 != 0 else None
            expected_closing_count = opening_count - (i % 3)
            ShiftSessionProductCount.objects.create(
                session=shift_sessions[i % len(shift_sessions)],
                product=products[(i * 2) % len(products)],
                opening_count=opening_count,
                expected_closing_count=expected_closing_count,
                closing_count=closing_count,
                variance=(
                    closing_count - expected_closing_count
                    if closing_count is not None
                    else None
                ),
            )

    def _seed_sales(self, users, shift_sessions, count):
        sales = []
        for i in range(count):
            payment_status = (
                Sale.PAYMENT_STATUS_PAID
                if i % 4 != 3
                else Sale.PAYMENT_STATUS_UNPAID_APPROVED
            )
            sale = Sale.objects.create(
                cashier=users[i % len(users)],
                shift_session=shift_sessions[i % len(shift_sessions)],
                payment_status=payment_status,
                unpaid_reason="Approved staff credit"
                if payment_status != Sale.PAYMENT_STATUS_PAID
                else "",
                approved_by=users[(i + 1) % len(users)]
                if payment_status != Sale.PAYMENT_STATUS_PAID
                else None,
                total_amount=Decimal("0.00"),
                customer_name=f"Customer {i + 1}",
                receipt_issued=i % 2 == 0,
            )
            sales.append(sale)
        return sales

    def _seed_sale_items(self, sales, products, count):
        for i in range(count):
            quantity = 1 + (i % 5)
            unit_price = Decimal("30.00") + Decimal(i)
            item = SaleItem.objects.create(
                sale=sales[i % len(sales)],
                product=products[i % len(products)],
                quantity=quantity,
                unit_price=unit_price,
                subtotal=Decimal("0.00"),
            )
            # ensure sale total is updated
            sale = item.sale
            sale.total_amount += item.subtotal
            sale.save(update_fields=["total_amount"])

    def _seed_sale_payments(self, sales, payment_methods, count):
        for i in range(count):
            sale = sales[i % len(sales)]
            if sale.payment_status != Sale.PAYMENT_STATUS_PAID:
                continue
            amount = sale.total_amount if sale.total_amount > 0 else Decimal("50.00")
            SalePayment.objects.create(
                sale=sale,
                method=payment_methods[i % len(payment_methods)],
                amount=amount,
            )

    def _seed_daily_closings(self, users, count):
        for i in range(count):
            total_sales = Decimal("500.00") + Decimal(i * 20)
            cash_declared = total_sales - Decimal("10.00")
            digital_declared = Decimal("50.00")
            DailyClosing.objects.create(
                closed_by=users[i % len(users)],
                total_sales_expected=total_sales,
                total_cash_declared=cash_declared,
                total_digital_declared=digital_declared,
                cash_discrepancy=cash_declared - (total_sales - digital_declared),
                notes="End of day reconciliation",
            )

    def _seed_push_subscriptions(self, users, count):
        subs = []
        for i in range(count):
            endpoint = f"https://example.com/push/{i + 1}"
            subscription = PushSubscription.objects.create(
                user=users[i % len(users)],
                endpoint=endpoint,
                p256dh=self._random_token(64),
                auth=self._random_token(32),
                is_active=True,
            )
            subs.append(subscription)
        return subs

    def _seed_notification_preferences(self):
        for event_type, _label in NotificationEvent.choices:
            NotificationPreference.objects.create(
                event_type=event_type,
                enabled=True,
                target_roles=[],
                title_template=f"{event_type.replace('_', ' ').title()}",
                body_template="System generated notification.",
                icon_url=None,
            )

    def _seed_notification_logs(self, users, subs, count):
        events = [e[0] for e in NotificationEvent.choices]
        for i in range(count):
            NotificationLog.objects.create(
                user=users[i % len(users)],
                event_type=events[i % len(events)],
                title="Notification",
                body="This is a dummy notification.",
                data={"seeded": True, "index": i + 1},
                success=bool(i % 2),
                error_message="" if i % 2 else "",
                subscription=subs[i % len(subs)],
            )

    def _seed_audit_logs(self, users, count):
        actions = ["CREATE", "UPDATE", "DELETE"]
        tables = [
            "users_user",
            "inventory_ingredient",
            "production_product",
            "sales_sale",
        ]
        for i in range(count):
            AuditLog.objects.create(
                actor=users[i % len(users)],
                ip_address=f"192.168.1.{i + 10}",
                action=actions[i % len(actions)],
                table_name=tables[i % len(tables)],
                record_id=str(i + 1),
                old_value={"field": "old"},
                new_value={"field": "new"},
            )

    def _random_token(self, length):
        return "".join(random.choices(string.ascii_letters + string.digits, k=length))

    def _seed_employees(self, users, count):
        positions = [
            "Baker",
            "Cashier",
            "Storekeeper",
            "Assistant Baker",
            "Delivery Person",
            "Cleaner",
            "Manager",
            "Supervisor",
            "Packager",
            "Quality Controller",
        ]
        employees = []
        for i in range(count):
            # Link some employees to users, others as standalone
            user = users[i % len(users)] if i < len(users) else None
            employee = Employee.objects.create(
                user=user,
                full_name=f"Employee {i + 1}",
                position=positions[i % len(positions)],
                phone_number=f"0912{i + 1:06d}",
                address=f"Address {i + 1}, Addis Ababa",
                hire_date=date.today() - timedelta(days=random.randint(30, 365)),
                monthly_base_salary=Decimal("5000.00") + Decimal(i * 100),
                payment_detail="Bank transfer to CBE account",
            )
            employees.append(employee)
        return employees

    def _seed_shift_templates(self, count):
        shift_names = [
            "Morning Shift",
            "Afternoon Shift",
            "Night Shift",
            "Weekend Shift",
            "Holiday Shift",
            "Overtime Shift",
            "Emergency Shift",
            "Training Shift",
            "Cleaning Shift",
            "Delivery Shift",
        ]
        templates = []
        for i in range(count):
            start_total_minutes = (i * 37) % (24 * 60)
            end_total_minutes = (start_total_minutes + (8 * 60)) % (24 * 60)
            start_hour, start_minute = divmod(start_total_minutes, 60)
            end_hour, end_minute = divmod(end_total_minutes, 60)

            template = ShiftTemplate.objects.create(
                name=shift_names[i % len(shift_names)]
                + ("" if i < len(shift_names) else f" {i + 1}"),
                start_time=time(start_hour, start_minute),
                end_time=time(end_hour, end_minute),
                is_active=i % 10 != 9,
            )
            templates.append(template)
        return templates

    def _seed_shift_assignments(self, employees, shift_templates, count):
        assignments = []
        today = date.today()
        for i in range(count):
            # Create assignments going back in time (avoid unique collisions on larger
            # counts)
            shift_date = today - timedelta(days=i)
            assignment = ShiftAssignment.objects.create(
                employee=employees[i % len(employees)],
                shift=shift_templates[i % len(shift_templates)],
                shift_date=shift_date,
            )
            assignments.append(assignment)
        return assignments

    def _seed_attendance_records(self, shift_assignments, users, count):
        statuses = [
            AttendanceRecord.STATUS_PRESENT,
            AttendanceRecord.STATUS_LATE,
            AttendanceRecord.STATUS_ABSENT,
            AttendanceRecord.STATUS_OVERTIME,
        ]
        for i in range(count):
            assignment = shift_assignments[i % len(shift_assignments)]
            status = statuses[i % len(statuses)]

            AttendanceRecord.objects.create(
                assignment=assignment,
                status=status,
                late_minutes=random.randint(0, 30)
                if status == AttendanceRecord.STATUS_LATE
                else 0,
                overtime_minutes=random.randint(0, 120)
                if status == AttendanceRecord.STATUS_OVERTIME
                else 0,
                recorded_by=users[i % len(users)],
                notes=f"Attendance for {assignment.shift_date}",
            )

    def _seed_leave_records(self, employees, count):
        leave_types = [
            LeaveRecord.TYPE_SICK,
            LeaveRecord.TYPE_ANNUAL,
            LeaveRecord.TYPE_HOLIDAY,
            LeaveRecord.TYPE_OTHER,
        ]
        for i in range(count):
            employee = employees[i % len(employees)]
            leave_type = leave_types[i % len(leave_types)]

            # Create leave records for various durations
            start_date = date.today() - timedelta(days=random.randint(1, 60))
            duration = random.randint(1, 7)  # 1-7 days
            end_date = start_date + timedelta(days=duration - 1)

            LeaveRecord.objects.create(
                employee=employee,
                leave_type=leave_type,
                start_date=start_date,
                end_date=end_date,
                notes=f"Leave request for {leave_type}",
            )

    def _seed_payroll_records(self, employees, count):
        created = 0
        today = date.today()
        months_back = 0

        while created < count:
            # Walk back month-by-month; for each month, create payroll for employees
            # in order.
            year = today.year
            month = today.month - months_back
            while month <= 0:
                month += 12
                year -= 1

            period_start = date(year, month, 1)
            if month == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month + 1, 1)
            period_end = next_month - timedelta(days=1)

            for employee in employees:
                if created >= count:
                    break

                # Deterministic-ish: every third record is paid
                is_paid = created % 3 == 0

                PayrollRecord.objects.create(
                    employee=employee,
                    period_start=period_start,
                    period_end=period_end,
                    base_salary=employee.monthly_base_salary,
                    amount_paid=employee.monthly_base_salary
                    if is_paid
                    else Decimal("0.00"),
                    status=PayrollRecord.STATUS_PAID
                    if is_paid
                    else PayrollRecord.STATUS_UNPAID,
                    paid_at=timezone.now() if is_paid else None,
                    notes="Monthly payroll" + (" - Paid" if is_paid else " - Pending"),
                )
                created += 1

            months_back += 1
