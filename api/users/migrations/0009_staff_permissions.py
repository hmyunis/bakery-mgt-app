from django.db import migrations, models


def migrate_roles(apps, schema_editor):
    User = apps.get_model("users", "User")
    permission_map = {
        "cashier": ["sales", "settings"],
        "chef": ["production", "settings"],
        "storekeeper": ["inventory", "settings"],
    }
    for old_role, permissions in permission_map.items():
        User.objects.filter(role=old_role).update(
            role="staff", permissions=permissions
        )


class Migration(migrations.Migration):
    dependencies = [("users", "0008_alter_leaverecord_leave_type")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="permissions",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("staff", "Staff")],
                default="staff",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_roles, migrations.RunPython.noop),
    ]
