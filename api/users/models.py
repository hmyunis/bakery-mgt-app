from django.contrib.auth.models import AbstractUser
from django.db import models

from core.utils import get_upload_path


class User(AbstractUser):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("storekeeper", "Storekeeper"),
        ("chef", "Chef"),
        ("cashier", "Cashier"),
    )

    # Override first_name and last_name to be unused
    first_name = None
    last_name = None

    # Use full_name instead
    full_name = models.CharField(max_length=255, blank=True, null=True)

    # We use username for login, but store phone separately
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    avatar = models.FileField(upload_to=get_upload_path, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="cashier")
    push_notifications_enabled = models.BooleanField(
        default=False, help_text="Receive push notifications"
    )

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.username} ({self.role})"


class Employee(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    full_name = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    hire_date = models.DateField()
    monthly_base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    payment_detail = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.full_name


class ShiftTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["start_time", "end_time"],
                name="unique_shift_template_start_end_time",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.start_time}-{self.end_time})"


class ShiftAssignment(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="shift_assignments"
    )
    shift = models.ForeignKey(
        ShiftTemplate, on_delete=models.PROTECT, related_name="assignments"
    )
    shift_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("employee", "shift", "shift_date")
        ordering = ["-shift_date", "employee_id"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.shift.name} ({self.shift_date})"


class AttendanceRecord(models.Model):
    STATUS_PRESENT = "present"
    STATUS_LATE = "late"
    STATUS_ABSENT = "absent"
    STATUS_OVERTIME = "overtime"

    STATUS_CHOICES = (
        (STATUS_PRESENT, "Present"),
        (STATUS_LATE, "Late"),
        (STATUS_ABSENT, "Absent"),
        (STATUS_OVERTIME, "Overtime"),
    )

    assignment = models.OneToOneField(
        ShiftAssignment,
        on_delete=models.CASCADE,
        related_name="attendance",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    late_minutes = models.PositiveIntegerField(default=0)
    overtime_minutes = models.PositiveIntegerField(default=0)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="attendance_records"
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.assignment} - {self.status}"


class LeaveRecord(models.Model):
    TYPE_SICK = "sick"
    TYPE_ANNUAL = "annual"
    TYPE_HOLIDAY = "holiday"
    TYPE_OTHER = "other"

    TYPE_CHOICES = (
        (TYPE_SICK, "Sick Leave"),
        (TYPE_ANNUAL, "Annual Leave"),
        (TYPE_HOLIDAY, "Holiday Leave"),
        (TYPE_OTHER, "Other Leave"),
    )

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_records"
    )
    leave_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type}"

    @property
    def day_count(self):
        return (self.end_date - self.start_date).days + 1


class PayrollRecord(models.Model):
    STATUS_PAID = "paid"
    STATUS_UNPAID = "unpaid"

    STATUS_CHOICES = (
        (STATUS_PAID, "Paid"),
        (STATUS_UNPAID, "Unpaid"),
    )

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="payroll_records"
    )
    period_start = models.DateField()
    period_end = models.DateField()
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_UNPAID
    )
    paid_at = models.DateTimeField(blank=True, null=True)
    receipt = models.FileField(upload_to=get_upload_path, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("employee", "period_start", "period_end")
        ordering = ["-period_start"]

    def __str__(self):
        return f"{self.employee.full_name} - {self.period_start:%Y-%m}"
