from django.db import migrations, models
import django.db.models.deletion
import core.utils


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_alter_user_push_notifications_enabled"),
    ]

    operations = [
        migrations.CreateModel(
            name="Employee",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("position", models.CharField(max_length=255)),
                ("phone_number", models.CharField(blank=True, max_length=15, null=True)),
                ("address", models.TextField(blank=True, null=True)),
                ("hire_date", models.DateField()),
                ("monthly_base_salary", models.DecimalField(decimal_places=2, max_digits=12)),
                ("payment_detail", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="employee_profile",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ShiftTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("start_time", models.TimeField()),
                ("end_time", models.TimeField()),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="ShiftAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("shift_date", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_assignments",
                        to="users.employee",
                    ),
                ),
                (
                    "shift",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="assignments",
                        to="users.shifttemplate",
                    ),
                ),
            ],
            options={
                "ordering": ["-shift_date", "employee_id"],
                "unique_together": {("employee", "shift", "shift_date")},
            },
        ),
        migrations.CreateModel(
            name="LeaveRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("leave_type", models.CharField(choices=[("sick", "Sick Leave"), ("annual", "Annual Leave"), ("holiday", "Holiday Leave"), ("misc", "Misc Leave")], max_length=20)),
                ("start_date", models.DateField()),
                ("end_date", models.DateField()),
                ("notes", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leave_records",
                        to="users.employee",
                    ),
                ),
            ],
            options={
                "ordering": ["-start_date"],
            },
        ),
        migrations.CreateModel(
            name="PayrollRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("base_salary", models.DecimalField(decimal_places=2, max_digits=12)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("status", models.CharField(choices=[("paid", "Paid"), ("unpaid", "Unpaid")], default="unpaid", max_length=10)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("receipt", models.FileField(blank=True, null=True, upload_to=core.utils.get_upload_path)),
                ("notes", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payroll_records",
                        to="users.employee",
                    ),
                ),
            ],
            options={
                "ordering": ["-period_start"],
                "unique_together": {("employee", "period_start", "period_end")},
            },
        ),
        migrations.CreateModel(
            name="AttendanceRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("present", "Present"), ("late", "Late"), ("absent", "Absent"), ("overtime", "Overtime")], max_length=20)),
                ("late_minutes", models.PositiveIntegerField(default=0)),
                ("overtime_minutes", models.PositiveIntegerField(default=0)),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                ("notes", models.TextField(blank=True, null=True)),
                (
                    "assignment",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attendance",
                        to="users.shiftassignment",
                    ),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="attendance_records",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-recorded_at"],
            },
        ),
    ]
