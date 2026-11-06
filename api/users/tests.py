from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from users.serializers import FactoryResetSerializer


class FactoryResetTest(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.admin = self.User.objects.create_user(
            username="admin",
            password="adminpassword123",
            role="admin",
        )
        self.staff = self.User.objects.create_user(
            username="staff1",
            password="staffpassword123",
            role="staff",
        )

    def test_serializer_accepts_password(self):
        serializer = FactoryResetSerializer(
            data={"password": "adminpassword123", "delete_users": True}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["password"], "adminpassword123")

    def test_serializer_accepts_confirmation_as_password(self):
        serializer = FactoryResetSerializer(
            data={"confirmation": "adminpassword123", "delete_users": True}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["password"], "adminpassword123")

    def test_serializer_fails_without_password_or_confirmation(self):
        serializer = FactoryResetSerializer(data={"delete_users": True})
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_factory_reset_with_confirmation_payload(self):
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            "/api/v1/users/factory_reset/",
            {
                "confirmation": "adminpassword123",
                "delete_users": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify staff user was deleted and admin user was kept
        self.assertFalse(self.User.objects.filter(username="staff1").exists())
        self.assertTrue(self.User.objects.filter(username="admin").exists())

    def test_factory_reset_with_password_payload(self):
        # Create another user to delete
        self.User.objects.create_user(
            username="staff2",
            password="staffpassword123",
            role="staff",
        )
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            "/api/v1/users/factory_reset/",
            {
                "password": "adminpassword123",
                "delete_users": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(self.User.objects.filter(username="staff2").exists())
