from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer to add specific user data to the token payload.
    This avoids extra API calls on the frontend to fetch 'me'.
    Supports login with either username or phone_number.
    """
    username_field = 'username'  # Keep for compatibility
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow username or phone_number as identifier
        self.fields['username'] = serializers.CharField(required=False)
        self.fields['phone_number'] = serializers.CharField(required=False)
    
    def validate(self, attrs):
        username = attrs.get('username')
        phone_number = attrs.get('phone_number')
        password = attrs.get('password')
        
        # Determine which field to use for authentication
        identifier = None
        if username:
            identifier = username
            lookup_field = 'username'
        elif phone_number:
            identifier = phone_number
            lookup_field = 'phone_number'
        else:
            raise serializers.ValidationError({
                'non_field_errors': ['Either username or phone_number is required.']
            })
        
        if not password:
            raise serializers.ValidationError({
                'password': ['Password is required.']
            })
        
        # Try to find user by identifier
        try:
            user = User.objects.get(**{lookup_field: identifier})
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': ['Invalid credentials.']
            })
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError({
                'non_field_errors': ['Invalid credentials.']
            })
        
        if not user.is_active:
            raise serializers.ValidationError({
                'non_field_errors': ['User account is disabled.']
            })
        
        # Update last_login timestamp
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Send notification to all admins about user login
        from notifications.services import send_notification
        from notifications.models import NotificationEvent
        from django.contrib.auth import get_user_model
        
        send_notification(
            NotificationEvent.USER_LOGIN,
            {
                'username': user.username,
                'role': user.get_role_display(),
                'login_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            target_roles=['admin']
        )
        
        attrs['username'] = user.username
        return super().validate(attrs)
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['full_name'] = user.full_name or ""
        token['username'] = user.username
        token['email'] = user.email
        token['phone_number'] = user.phone_number
        token['role'] = user.role
        token['push_notifications_enabled'] = user.push_notifications_enabled
        
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
    avatar_clear = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'full_name', 'email', 
            'phone_number', 'role', 'address', 'avatar', 'avatar_clear',
            'push_notifications_enabled',
            'password', 'confirm_password', 'date_joined', 'last_login', 'is_active'
        )
        read_only_fields = ('id', 'date_joined', 'last_login')

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
        validated_data.pop('avatar_clear', None)  # Remove write-only field
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
        
        # Handle avatar removal: check for avatar_clear flag first
        avatar_clear = validated_data.pop('avatar_clear', False)
        if avatar_clear:
            validated_data['avatar'] = None
        elif 'avatar' in validated_data:
            # If avatar is provided, check if it's an empty file
            avatar = validated_data['avatar']
            # Check if it's an empty file (to clear the avatar)
            if hasattr(avatar, 'size') and avatar.size == 0:
                validated_data['avatar'] = None
            elif isinstance(avatar, str) and avatar == '':
                validated_data['avatar'] = None
        
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

class FactoryResetSerializer(serializers.Serializer):
    """
    Serializer for factory reset operation.
    Admin must provide their password and select which data types to delete.
    """
    password = serializers.CharField(required=True, write_only=True)
    
    # Data types to delete
    delete_users = serializers.BooleanField(default=False)
    delete_products = serializers.BooleanField(default=False)
    delete_ingredients = serializers.BooleanField(default=False)
    delete_recipes = serializers.BooleanField(default=False)
    delete_production_runs = serializers.BooleanField(default=False)
    delete_sales = serializers.BooleanField(default=False)
    delete_purchases = serializers.BooleanField(default=False)
    delete_payment_methods = serializers.BooleanField(default=False)
    delete_audit_logs = serializers.BooleanField(default=False)
    delete_notifications = serializers.BooleanField(default=False)
    
    def validate(self, data):
        # Check that at least one data type is selected
        data_types = [
            'delete_users', 'delete_products', 'delete_ingredients', 'delete_recipes',
            'delete_production_runs', 'delete_sales', 'delete_purchases', 
            'delete_payment_methods', 'delete_audit_logs', 'delete_notifications'
        ]
        
        if not any(data.get(dt, False) for dt in data_types):
            raise serializers.ValidationError({
                "non_field_errors": ["At least one data type must be selected for deletion."]
            })
        
        return data

