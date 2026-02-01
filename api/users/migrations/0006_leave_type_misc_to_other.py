from django.db import migrations


def forward(apps, schema_editor):
    LeaveRecord = apps.get_model("users", "LeaveRecord")
    LeaveRecord.objects.filter(leave_type="misc").update(leave_type="other")


def backward(apps, schema_editor):
    LeaveRecord = apps.get_model("users", "LeaveRecord")
    LeaveRecord.objects.filter(leave_type="other").update(leave_type="misc")


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_employee_shift_attendance_leave_payroll"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
