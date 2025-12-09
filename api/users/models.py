from django.db import models
from django.contrib.auth.models import AbstractUser
from core.utils import get_upload_path

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('storekeeper', 'Storekeeper'),
        ('chef', 'Chef'),
        ('cashier', 'Cashier'),
    )
    
    # We use username for login, but store phone separately
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    avatar = models.FileField(upload_to=get_upload_path, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cashier')

    class Meta:
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.username} ({self.role})"
