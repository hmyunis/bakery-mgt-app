from django.db import migrations


def migrate_target_roles(apps, schema_editor):
    NotificationPreference = apps.get_model("notifications", "NotificationPreference")
    legacy_roles = {"cashier", "chef", "storekeeper"}
    for preference in NotificationPreference.objects.all():
        roles = set(preference.target_roles or [])
        if roles & legacy_roles:
            roles.difference_update(legacy_roles)
            roles.add("staff")
            preference.target_roles = sorted(roles)
            preference.save(update_fields=["target_roles"])


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0003_alter_notificationlog_event_type_and_more"),
        ("users", "0009_staff_permissions"),
    ]

    operations = [migrations.RunPython(migrate_target_roles, migrations.RunPython.noop)]
