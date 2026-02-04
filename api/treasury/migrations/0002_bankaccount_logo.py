from django.db import migrations, models
import django.db.models.deletion
import core.utils


class Migration(migrations.Migration):
    dependencies = [
        ("treasury", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="bankaccount",
            name="logo_url",
        ),
        migrations.RemoveField(
            model_name="bankaccount",
            name="logo_file_name",
        ),
        migrations.AddField(
            model_name="bankaccount",
            name="logo",
            field=models.FileField(blank=True, null=True, upload_to=core.utils.get_upload_path),
        ),
    ]

