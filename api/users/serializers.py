from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    AttendanceRecord,
    Employee,
    LeaveRecord,
    PayrollRecord,
    ShiftAssignment,
    ShiftTemplate,
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer to add specific user data to the token payload.
    This avoids extra API calls on the frontend to fetch 'me'.
    Supports login with either username or phone_number.
    """

    username_field = "username"  # Keep for compatibility

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow username or phone_number as identifier
        self.fields["username"] = serializers.CharField(required=False)
        self.fields["phone_number"] = serializers.CharField(required=False)

    def validate(self, attrs):
        username = attrs.get("username")
        phone_number = attrs.get("phone_number")
        password = attrs.get("password")

        # Determine which field to use for authentication
        identifier = None
        if username:
            identifier = username
            lookup_field = "username"
        elif phone_number:
            identifier = phone_number
            lookup_field = "phone_number"
        else:
            raise serializers.ValidationError(
                {"non_field_errors": ["Either username or phone_number is required."]}
            )

        if not password:
            raise serializers.ValidationError({"password": ["Password is required."]})

        # Try to find user by identifier
        try:
            user = User.objects.get(**{lookup_field: identifier})
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"non_field_errors": ["Invalid credentials."]}
            )

        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError(
                {"non_field_errors": ["Invalid credentials."]}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": ["User account is disabled."]}
            )

        # Update last_login timestamp
        from django.utils import timezone

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        # Send notification to all admins about user login

        from notifications.models import NotificationEvent
        from notifications.services import send_notification

        send_notification(
            NotificationEvent.USER_LOGIN,
            {
                "username": user.username,
                "role": user.get_role_display(),
                "login_time": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
            },
            target_roles=["admin"],
        )

        attrs["username"] = user.username
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token["full_name"] = user.full_name or ""
        token["username"] = user.username
        token["email"] = user.email
        token["phone_number"] = user.phone_number
        token["role"] = user.role
        token["push_notifications_enabled"] = user.push_notifications_enabled

        # Handle Avatar URL
        if user.avatar:
            token["avatar"] = user.avatar.url
        else:
            token["avatar"] = None
        return token


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    avatar = serializers.FileField(required=False)
    avatar_clear = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "phone_number",
            "role",
            "address",
            "avatar",
            "avatar_clear",
            "push_notifications_enabled",
            "password",
            "confirm_password",
            "date_joined",
            "last_login",
            "is_active",
        )
        read_only_fields = ("id", "date_joined", "last_login")

    def validate(self, data):
        """
        Check that passwords match if provided.
        Prevent non-admins from changing their own role.
        """
        if "password" in data:
            password = data["password"]
            confirm_password = data.get("confirm_password")

            if not confirm_password:
                raise serializers.ValidationError(
                    {
                        "confirm_password": (
                            "This field is required when setting password."
                        )
                    }
                )

            if password != confirm_password:
                raise serializers.ValidationError(
                    {"password": "Passwords do not match."}
                )

            # Validate password strength
            if len(password) < 8:
                raise serializers.ValidationError(
                    {"password": "Password must be at least 8 characters long."}
                )

        # Role protection logic
        request = self.context.get("request")
        if request and request.user.role != "admin":
            if "role" in data and data["role"] != request.user.role:
                raise serializers.ValidationError(
                    {"role": "You cannot change your own role."}
                )

        # Validate phone number format if provided
        if "phone_number" in data and data.get("phone_number"):
            phone = data["phone_number"]
            # Basic validation: should contain only digits and optional + at start
            if not phone.replace("+", "").replace("-", "").replace(" ", "").isdigit():
                raise serializers.ValidationError(
                    {
                        "phone_number": (
                            "Phone number must contain only digits and "
                            "optional +, -, or spaces."
                        )
                    }
                )

        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        validated_data.pop("avatar_clear", None)  # Remove write-only field
        password = validated_data.pop("password", None)

        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()

        # Send notification
        from notifications.models import NotificationEvent
        from notifications.services import send_notification

        send_notification(
            NotificationEvent.USER_CREATED,
            {
                "username": user.username,
                "role": user.get_role_display(),
                "email": user.email or "N/A",
            },
        )

        return user

    def update(self, instance, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password", None)

        # Handle avatar removal: check for avatar_clear flag first
        avatar_clear = validated_data.pop("avatar_clear", False)
        if avatar_clear:
            validated_data["avatar"] = None
        elif "avatar" in validated_data:
            # If avatar is provided, check if it's an empty file
            avatar = validated_data["avatar"]
            # Check if it's an empty file (to clear the avatar)
            if hasattr(avatar, "size") and avatar.size == 0:
                validated_data["avatar"] = None
            elif isinstance(avatar, str) and avatar == "":
                validated_data["avatar"] = None

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
        if data["new_password"] != data["confirm_new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New passwords do not match."}
            )
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
            "delete_users",
            "delete_products",
            "delete_ingredients",
            "delete_recipes",
            "delete_production_runs",
            "delete_sales",
            "delete_purchases",
            "delete_payment_methods",
            "delete_audit_logs",
            "delete_notifications",
        ]

        if not any(data.get(dt, False) for dt in data_types):
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "At least one data type must be selected for deletion."
                    ]
                }
            )

        return data


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "full_name", "phone_number", "email", "role")


class EmployeeSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=User.objects.all(), required=False, allow_null=True
    )
    user_summary = UserSummarySerializer(source="user", read_only=True)
    full_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "user_id",
            "user_summary",
            "full_name",
            "position",
            "phone_number",
            "address",
            "hire_date",
            "monthly_base_salary",
            "payment_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        user = attrs.get("user")
        if user:
            existing = getattr(user, "employee_profile", None)
            if existing and getattr(self.instance, "id", None) != existing.id:
                raise serializers.ValidationError(
                    {
                        "user_id": (
                            "This user is already linked to another employee profile."
                        )
                    }
                )

        # Allow omitting full_name if user is provided (it will be autofilled if
        # possible).
        if not attrs.get("full_name") and not (
            attrs.get("user") or getattr(self.instance, "user", None)
        ):
            raise serializers.ValidationError({"full_name": "This field is required."})
        return attrs

    def _autofill_from_user(self, validated_data):
        user = validated_data.get("user")
        if not user:
            return validated_data

        if not validated_data.get("full_name") and user.full_name:
            validated_data["full_name"] = user.full_name
        if not validated_data.get("phone_number") and user.phone_number:
            validated_data["phone_number"] = user.phone_number
        if not validated_data.get("address") and user.address:
            validated_data["address"] = user.address
        return validated_data

    def create(self, validated_data):
        validated_data = self._autofill_from_user(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._autofill_from_user(validated_data)
        return super().update(instance, validated_data)


class ShiftTemplateSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))

        if start_time and end_time:
            qs = ShiftTemplate.objects.filter(start_time=start_time, end_time=end_time)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "end_time": (
                            "A shift template with the same start and end times "
                            "already exists."
                        )
                    }
                )

        return attrs

    class Meta:
        model = ShiftTemplate
        fields = ("id", "name", "start_time", "end_time", "is_active")


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = (
            "id",
            "employee",
            "employee_name",
            "shift",
            "shift_name",
            "shift_date",
            "created_at",
        )
        read_only_fields = ("created_at",)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    assignment = serializers.PrimaryKeyRelatedField(
        queryset=ShiftAssignment.objects.all(), required=False, allow_null=True
    )
    late_time = serializers.CharField(write_only=True, required=False, allow_blank=True)
    overtime_time = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), write_only=True, required=False
    )
    shift = serializers.PrimaryKeyRelatedField(
        queryset=ShiftTemplate.objects.all(), write_only=True, required=False
    )
    shift_date_input = serializers.DateField(write_only=True, required=False)
    employee_name = serializers.CharField(
        source="assignment.employee.full_name", read_only=True
    )
    shift_name = serializers.CharField(source="assignment.shift.name", read_only=True)
    shift_date = serializers.DateField(source="assignment.shift_date", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "assignment",
            "employee",
            "shift",
            "shift_date_input",
            "employee_name",
            "shift_name",
            "shift_date",
            "status",
            "late_minutes",
            "overtime_minutes",
            "late_time",
            "overtime_time",
            "recorded_by",
            "recorded_at",
            "notes",
        )
        read_only_fields = ("recorded_at", "recorded_by")

    def _parse_time_to_minutes(self, value):
        if not value:
            return 0
        parts = value.split(":")
        if len(parts) != 2:
            raise serializers.ValidationError("Time must be in HH:MM format.")
        hours, minutes = parts
        if not hours.isdigit() or not minutes.isdigit():
            raise serializers.ValidationError("Time must be numeric in HH:MM format.")
        return int(hours) * 60 + int(minutes)

    def validate(self, data):
        # Support admin upsert without knowing assignment id: (employee, shift,
        # shift_date_input)
        if not data.get("assignment") and not getattr(
            self.instance, "assignment", None
        ):
            if (
                not data.get("employee")
                or not data.get("shift")
                or not data.get("shift_date_input")
            ):
                raise serializers.ValidationError(
                    {
                        "assignment": (
                            "Provide assignment OR (employee, shift, shift_date_input)."
                        )
                    }
                )

        late_time = data.pop("late_time", None)
        overtime_time = data.pop("overtime_time", None)

        if late_time is not None:
            data["late_minutes"] = self._parse_time_to_minutes(late_time)
        if overtime_time is not None:
            data["overtime_minutes"] = self._parse_time_to_minutes(overtime_time)

        status = data.get("status")
        if status == AttendanceRecord.STATUS_LATE and data.get("late_minutes", 0) < 0:
            raise serializers.ValidationError(
                {"late_minutes": "Late minutes are required for late status."}
            )
        if (
            status == AttendanceRecord.STATUS_OVERTIME
            and data.get("overtime_minutes", 0) < 0
        ):
            raise serializers.ValidationError(
                {
                    "overtime_minutes": (
                        "Overtime minutes are required for overtime status."
                    )
                }
            )
        return data

    def create(self, validated_data):
        validated_data["recorded_by"] = self.context["request"].user
        # If assignment isn't provided, create/get it from the provided identifiers.
        if not validated_data.get("assignment"):
            employee = validated_data.pop("employee")
            shift = validated_data.pop("shift")
            shift_date = validated_data.pop("shift_date_input")
            assignment, _created = ShiftAssignment.objects.get_or_create(
                employee=employee, shift=shift, shift_date=shift_date
            )
            validated_data["assignment"] = assignment
        return super().create(validated_data)


class LeaveRecordSerializer(serializers.ModelSerializer):
    day_count = serializers.IntegerField(read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)

    class Meta:
        model = LeaveRecord
        fields = (
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "start_date",
            "end_date",
            "day_count",
            "notes",
            "created_at",
        )
        read_only_fields = ("created_at",)

    def validate(self, data):
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] < data["start_date"]:
                raise serializers.ValidationError(
                    {"end_date": "End date cannot be before start date."}
                )
        return data


class PayrollRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    amount_due = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRecord
        fields = (
            "id",
            "employee",
            "employee_name",
            "period_start",
            "period_end",
            "base_salary",
            "amount_paid",
            "amount_due",
            "status",
            "paid_at",
            "receipt",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "paid_at")

    def get_amount_due(self, obj):
        try:
            return max(
                Decimal("0.00"),
                (obj.base_salary or Decimal("0.00"))
                - (obj.amount_paid or Decimal("0.00")),
            )
        except Exception:
            return Decimal("0.00")

    def update(self, instance, validated_data):
        status = validated_data.get("status")
        amount_paid = validated_data.get("amount_paid", instance.amount_paid)
        base_salary = validated_data.get("base_salary", instance.base_salary)

        if status == PayrollRecord.STATUS_PAID and (
            amount_paid is None or amount_paid <= 0
        ):
            raise serializers.ValidationError(
                {
                    "amount_paid": (
                        "Amount paid must be greater than 0 when marking payroll as "
                        "paid."
                    )
                }
            )

        # If admin doesn't explicitly set status, infer it from amounts.
        if status is None:
            if (
                base_salary is not None
                and amount_paid is not None
                and amount_paid >= base_salary
            ):
                validated_data["status"] = PayrollRecord.STATUS_PAID
            else:
                validated_data["status"] = PayrollRecord.STATUS_UNPAID

        status = validated_data.get("status", instance.status)
        if status == PayrollRecord.STATUS_PAID and not instance.paid_at:
            validated_data["paid_at"] = timezone.now()
        if status == PayrollRecord.STATUS_UNPAID:
            validated_data["paid_at"] = None
        return super().update(instance, validated_data)


class DailyShiftAttendanceSerializer(serializers.Serializer):
    date = serializers.DateField()
    shift_name = serializers.CharField(allow_null=True)
    start_time = serializers.TimeField(allow_null=True)
    end_time = serializers.TimeField(allow_null=True)
    attendance_status = serializers.CharField(allow_null=True)
    is_on_leave = serializers.BooleanField(default=False)
    leave_type = serializers.CharField(allow_null=True)


class PayrollDetailSerializer(serializers.Serializer):
    payroll_record = PayrollRecordSerializer()
    attendance_summary = serializers.DictField()
    leave_summary = serializers.DictField()
    waste_summary = serializers.DictField()
    payment_detail = serializers.CharField(allow_blank=True, allow_null=True)
    daily_calendar = DailyShiftAttendanceSerializer(many=True)


class WasteSummarySerializer(serializers.Serializer):
    total_wastage_volume = serializers.DecimalField(max_digits=12, decimal_places=3)
    total_wastage_value = serializers.DecimalField(max_digits=12, decimal_places=2)

    @classmethod
    def from_queryset(cls, usages):
        total_volume = Decimal("0")
        total_value = Decimal("0")
        for usage in usages:
            wastage = usage.wastage or Decimal("0")
            total_volume += wastage
            cost = usage.ingredient.average_cost_per_unit or Decimal("0")
            total_value += wastage * cost
        return {
            "total_wastage_volume": total_volume,
            "total_wastage_value": total_value,
        }
