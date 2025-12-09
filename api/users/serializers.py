from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer to add specific user data to the token payload.
    This avoids extra API calls on the frontend to fetch 'me'.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['full_name'] = f"{user.first_name} {user.last_name}".strip()
        token['username'] = user.username
        token['email'] = user.email
        token['phone_number'] = user.phone_number
        token['role'] = user.role
        
        # Handle Avatar URL
        if user.avatar:
            token['avatar'] = user.avatar.url
        else:
            token['avatar'] = None
        return token

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    avatar = serializers.FileField(required=False)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 'email', 
            'phone_number', 'role', 'address', 'avatar', 
            'password', 'confirm_password', 'date_joined'
        )
        read_only_fields = ('id', 'date_joined')

    def validate(self, data):
        """
        Check that passwords match if provided.
        Prevent non-admins from changing their own role.
        """
        if 'password' in data:
            password = data['password']
            confirm_password = data.get('confirm_password')
            
            if not confirm_password:
                raise serializers.ValidationError({"confirm_password": "This field is required when setting password."})
            
            if password != confirm_password:
                raise serializers.ValidationError({"password": "Passwords do not match."})
            
            # Validate password strength
            if len(password) < 8:
                raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
        
        # Role protection logic
        request = self.context.get('request')
        if request and request.user.role != 'admin':
            if 'role' in data and data['role'] != request.user.role:
                raise serializers.ValidationError({"role": "You cannot change your own role."})
        
        # Validate phone number format if provided
        if 'phone_number' in data and data.get('phone_number'):
            phone = data['phone_number']
            # Basic validation: should contain only digits and optional + at start
            if not phone.replace('+', '').replace('-', '').replace(' ', '').isdigit():
                raise serializers.ValidationError({"phone_number": "Phone number must contain only digits and optional +, -, or spaces."})
        
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)
        
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        
        # Send notification
        from notifications.services import send_notification
        from notifications.models import NotificationEvent
        
        send_notification(
            NotificationEvent.USER_CREATED,
            {
                'username': user.username,
                'role': user.get_role_display(),
                'email': user.email or 'N/A'
            }
        )
        
        return user

    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return data

