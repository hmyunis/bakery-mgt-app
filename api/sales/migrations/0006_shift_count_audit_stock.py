from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("sales", "0005_shift_session_and_unpaid_sales")]

    operations = [
        migrations.AddField(
            model_name="shiftsessionproductcount",
            name="opening_stock_before_override",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="shiftsessionproductcount",
            name="closing_stock_before_override",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
