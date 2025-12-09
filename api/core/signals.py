import os
from django.db import models
from django.dispatch import receiver
from django.db.models.signals import post_delete, pre_save
from .utils import compress_image

def _delete_file(path):
    """Deletes file from filesystem."""
    if os.path.isfile(path):
        os.remove(path)

@receiver(post_delete)
def delete_files_when_row_deleted_from_db(sender, instance, **kwargs):
    """
    When a model instance is deleted, delete attached files.
    Iterates over fields to find FileFields.
    """
    for field in instance._meta.fields:
        if isinstance(field, models.FileField):
            file = getattr(instance, field.name)
            if file and file.name:
                try:
                    _delete_file(file.path)
                except Exception:
                    # Silently fail if file doesn't exist or can't be deleted
                    pass

@receiver(pre_save)
def auto_delete_file_on_change_and_compress(sender, instance, **kwargs):
    """
    1. Deletes old file when updating with a new file.
    2. Compresses new image files.
    """
    if not instance.pk:
        # New instance: just compress if it's an image
        for field in instance._meta.fields:
            if isinstance(field, models.FileField):
                file = getattr(instance, field.name)
                if file:
                    compress_image(file)
        return

    try:
        old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    for field in instance._meta.fields:
        if isinstance(field, models.FileField):
            old_file = getattr(old_instance, field.name)
            new_file = getattr(instance, field.name)
            # If file changed
            if old_file != new_file:
                # Delete old file
                if old_file and old_file.name:
                    _delete_file(old_file.path)
                
                # Compress new file
                if new_file:
                    compress_image(new_file)

