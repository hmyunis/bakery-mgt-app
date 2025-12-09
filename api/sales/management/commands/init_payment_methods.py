from django.core.management.base import BaseCommand
from sales.models import PaymentMethod

class Command(BaseCommand):
    help = 'Creates default payment methods if they do not exist'

    def handle(self, *args, **options):
        payment_methods = [
            {'name': 'Cash', 'is_active': True},
            {'name': 'Telebirr', 'is_active': True},
            {'name': 'CBE Transfer', 'is_active': True},
        ]
        
        created_count = 0
        for method_data in payment_methods:
            method, created = PaymentMethod.objects.get_or_create(
                name=method_data['name'],
                defaults={'is_active': method_data['is_active']}
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created payment method: {method.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Payment method already exists: {method.name}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nTotal payment methods created: {created_count}'))

