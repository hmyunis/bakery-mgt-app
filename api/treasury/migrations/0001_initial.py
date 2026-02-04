from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("sales", "0004_sale_receipt_issued"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BankAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("bank_name", models.CharField(max_length=120)),
                ("account_holder", models.CharField(max_length=120)),
                ("account_number", models.CharField(max_length=64)),
                ("balance", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("logo_url", models.URLField(blank=True, null=True)),
                ("logo_file_name", models.CharField(blank=True, max_length=255, null=True)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Expense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=150)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("status", models.CharField(choices=[("paid", "Paid"), ("pending", "Pending")], default="pending", max_length=12)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "account",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="expenses", to="treasury.bankaccount"),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="expenses", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BankTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("transaction_type", models.CharField(choices=[("deposit", "Deposit"), ("withdrawal", "Withdrawal")], max_length=20)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "account",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transactions", to="treasury.bankaccount"),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="bank_transactions", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="banktransaction",
            index=models.Index(fields=["-created_at"], name="treasury_ba_created_7c0f9b_idx"),
        ),
        migrations.AddIndex(
            model_name="banktransaction",
            index=models.Index(fields=["account", "-created_at"], name="treasury_ba_account_3dbe65_idx"),
        ),
        migrations.AddIndex(
            model_name="expense",
            index=models.Index(fields=["-created_at"], name="treasury_ex_created_7c6b49_idx"),
        ),
        migrations.AddIndex(
            model_name="expense",
            index=models.Index(fields=["status", "-created_at"], name="treasury_ex_status_ebd4b2_idx"),
        ),
        migrations.AddField(
            model_name="bankaccount",
            name="linked_payment_methods",
            field=models.ManyToManyField(blank=True, related_name="bank_accounts", to="sales.paymentmethod"),
        ),
    ]
