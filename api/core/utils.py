import os
import sys
import uuid
from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image


def get_upload_path(instance, filename):
    """Generates a unique path for file uploads: uploads/modelname/uuid.ext"""
    ext = filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join("uploads", instance.__class__.__name__.lower(), filename)


def compress_image(image_field):
    """Compresses an image to 75% quality if it is an image file."""
    if not image_field:
        return
    try:
        img = Image.open(image_field)

        # Convert RGBA to RGB if strictly saving as JPEG, otherwise keep format
        if img.mode == "RGBA":
            img = img.convert("RGB")
            output_format = "JPEG"
        else:
            output_format = img.format if img.format else "JPEG"
        output = BytesIO()
        img.save(output, format=output_format, quality=75, optimize=True)
        output.seek(0)
        # Replace the image content with compressed content
        image_field.file = InMemoryUploadedFile(
            output,
            "ImageField",
            "%s.%s" % (image_field.name.split(".")[0], output_format.lower()),
            "image/%s" % output_format.lower(),
            sys.getsizeof(output),
            None,
        )
    except Exception:
        # If it's not an image or error occurs, skip compression
        pass
