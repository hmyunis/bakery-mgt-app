from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("sales", "0003_sale_sales_sale_created_66311a_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="receipt_issued",
            field=models.BooleanField(default=False),
        ),
    ]

