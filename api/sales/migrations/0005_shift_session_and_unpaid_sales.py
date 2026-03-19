from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("production", "0004_alter_recipe_composite_ingredient"),
        ("sales", "0004_sale_receipt_issued"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftSession",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("opened_at", models.DateTimeField(auto_now_add=True)),
                ("open_notes", models.TextField(blank=True)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                ("close_notes", models.TextField(blank=True)),
                (
                    "total_cash_declared",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                (
                    "total_digital_declared",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("acceptance_notes", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("opened", "Opened"),
                            (
                                "pending_handover_acceptance",
                                "Pending Handover Acceptance",
                            ),
                            ("closed", "Closed"),
                        ],
                        default="opened",
                        max_length=32,
                    ),
                ),
                (
                    "accepted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="accepted_shift_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "closed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="closed_shift_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "opened_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="opened_shift_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "previous_session",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="next_sessions",
                        to="sales.shiftsession",
                    ),
                ),
            ],
            options={
                "ordering": ["-opened_at"],
            },
        ),
        migrations.AddField(
            model_name="sale",
            name="approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="approved_sales",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="payment_status",
            field=models.CharField(
                choices=[("paid", "Paid"), ("unpaid_approved", "Unpaid (Approved)")],
                default="paid",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="shift_session",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sales",
                to="sales.shiftsession",
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="unpaid_reason",
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name="ShiftSessionProductCount",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("opening_count", models.IntegerField(default=0)),
                ("expected_closing_count", models.IntegerField(blank=True, null=True)),
                ("closing_count", models.IntegerField(blank=True, null=True)),
                ("variance", models.IntegerField(blank=True, null=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="production.product",
                    ),
                ),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_counts",
                        to="sales.shiftsession",
                    ),
                ),
            ],
        ),
        migrations.AlterUniqueTogether(
            name="shiftsessionproductcount",
            unique_together={("session", "product")},
        ),
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["shift_session", "-created_at"],
                name="sales_sale_shift_s_5f8452_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["payment_status"], name="sales_sale_payment_8f61f5_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="shiftsession",
            index=models.Index(
                fields=["status", "-opened_at"],
                name="sales_shift_status_bca2bb_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shiftsession",
            index=models.Index(
                fields=["opened_by", "-opened_at"],
                name="sales_shift_opened__2832e4_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shiftsessionproductcount",
            index=models.Index(
                fields=["session", "product"], name="sales_shift_session_4d8c2e_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="shiftsessionproductcount",
            index=models.Index(
                fields=["product"], name="sales_shift_product_5f66f4_idx"
            ),
        ),
    ]
