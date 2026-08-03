from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("sales", "0006_shift_count_audit_stock")]

    operations = [
        migrations.RenameIndex(
            model_name="sale",
            new_name="sales_sale_shift_s_0b75a7_idx",
            old_name="sales_sale_shift_s_5f8452_idx",
        ),
        migrations.RenameIndex(
            model_name="sale",
            new_name="sales_sale_payment_f41ab8_idx",
            old_name="sales_sale_payment_8f61f5_idx",
        ),
        migrations.RenameIndex(
            model_name="shiftsession",
            new_name="sales_shift_status_67ffd5_idx",
            old_name="sales_shift_status_bca2bb_idx",
        ),
        migrations.RenameIndex(
            model_name="shiftsession",
            new_name="sales_shift_opened__258fd3_idx",
            old_name="sales_shift_opened__2832e4_idx",
        ),
        migrations.RenameIndex(
            model_name="shiftsessionproductcount",
            new_name="sales_shift_session_d19696_idx",
            old_name="sales_shift_session_4d8c2e_idx",
        ),
        migrations.RenameIndex(
            model_name="shiftsessionproductcount",
            new_name="sales_shift_product_674e3e_idx",
            old_name="sales_shift_product_5f66f4_idx",
        ),
    ]
