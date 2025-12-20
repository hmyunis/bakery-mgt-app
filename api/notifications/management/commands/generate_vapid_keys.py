import base64
import sys

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate VAPID keys for web push notifications"

    def handle(self, *args, **options):
        """Generate VAPID keys using cryptography library."""
        try:
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives.asymmetric import ec
        except ImportError:
            self.stdout.write(
                self.style.ERROR(
                    "Error: cryptography is not installed.\n"
                    "Install it with: pipenv install cryptography"
                )
            )
            sys.exit(1)

        try:
            # Generate EC key pair for VAPID (P-256 curve)
            private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
            public_key = private_key.public_key()

            # Get the public key in uncompressed format
            # (65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
            public_numbers = public_key.public_numbers()
            x = public_numbers.x.to_bytes(32, "big")
            y = public_numbers.y.to_bytes(32, "big")
            public_key_bytes = b"\x04" + x + y

            # Get private key bytes (32 bytes)
            private_key_bytes = private_key.private_numbers().private_value.to_bytes(
                32, "big"
            )

            # Convert to base64url format (URL-safe base64 without padding)
            public_key_b64 = (
                base64.urlsafe_b64encode(public_key_bytes).decode("utf-8").rstrip("=")
            )
            private_key_b64 = (
                base64.urlsafe_b64encode(private_key_bytes).decode("utf-8").rstrip("=")
            )

            self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
            self.stdout.write(self.style.SUCCESS("VAPID Keys Generated Successfully!"))
            self.stdout.write(self.style.SUCCESS("=" * 60))
            self.stdout.write(self.style.WARNING("\nAdd these to your .env file:\n"))
            self.stdout.write(f"VAPID_PUBLIC_KEY={public_key_b64}")
            self.stdout.write(f"VAPID_PRIVATE_KEY={private_key_b64}")
            self.stdout.write("VAPID_EMAIL=admin@bakery.com")
            self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
            self.stdout.write(
                self.style.WARNING("\n⚠️  IMPORTANT: Keep the private key secret!")
            )
            self.stdout.write(
                self.style.WARNING("   Never commit it to version control.")
            )
            self.stdout.write(self.style.SUCCESS("=" * 60 + "\n"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error generating keys: {e}"))
            import traceback

            traceback.print_exc()
            sys.exit(1)
