import os
from datetime import timedelta

import openpyxl
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from audit.models import AuditLog


class Command(BaseCommand):
    help = "Archives audit logs older than 90 days to Excel and deletes them from DB."

    def handle(self, *args, **options):
        cutoff_date = timezone.now() - timedelta(days=90)
        old_logs = AuditLog.objects.filter(timestamp__lt=cutoff_date)

        count = old_logs.count()
        if count == 0:
            self.stdout.write("No old logs to clean.")
            return

        # 1. Prepare Archive Folder
        archive_dir = os.path.join(settings.MEDIA_ROOT, "archives")
        os.makedirs(archive_dir, exist_ok=True)

        filename = f"audit_archive_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(archive_dir, filename)

        # 2. Create Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Audit Logs"

        # Headers
        headers = [
            "ID",
            "Timestamp",
            "Actor",
            "IP",
            "Action",
            "Table",
            "Record ID",
            "Old Value",
            "New Value",
        ]
        ws.append(headers)

        # Rows
        for log in old_logs:
            ws.append(
                [
                    log.id,
                    log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    str(log.actor),
                    log.ip_address,
                    log.action,
                    log.table_name,
                    log.record_id,
                    str(log.old_value),
                    str(log.new_value),
                ]
            )

        wb.save(filepath)
        self.stdout.write(f"Archived {count} logs to {filepath}")

        # 3. Delete from DB
        old_logs.delete()
        self.stdout.write(f"Deleted {count} logs from database.")
