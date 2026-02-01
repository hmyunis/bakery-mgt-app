from calendar import monthrange
from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count, ProtectedError, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLog
from inventory.models import Ingredient, Purchase
from notifications.models import NotificationLog
from production.models import Product, ProductionRun, Recipe
from sales.models import PaymentMethod, Sale

from .models import (
    AttendanceRecord,
    Employee,
    LeaveRecord,
    PayrollRecord,
    ShiftAssignment,
    ShiftTemplate,
)
from .permissions import IsAdmin, IsAdminOrOwner
from .serializers import (
    AttendanceRecordSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmployeeSerializer,
    FactoryResetSerializer,
    LeaveRecordSerializer,
    PayrollDetailSerializer,
    PayrollRecordSerializer,
    ShiftAssignmentSerializer,
    ShiftTemplateSerializer,
    UserSerializer,
    WasteSummarySerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrOwner]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "full_name", "phone_number", "email"]
    ordering_fields = ["date_joined", "username"]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return User.objects.all()
        return User.objects.filter(id=user.id)

    # --- New Features ---
    @action(
        detail=False,
        methods=["get", "put", "patch"],
        permission_classes=[IsAuthenticated],
    )
    def me(self, request):
        """
        GET: Retrieve currently logged-in user profile.
        PUT/PATCH: Update currently logged-in user profile.
        """
        user = request.user
        if request.method == "GET":
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        elif request.method in ["PUT", "PATCH"]:
            # Users can't update their own role via this endpoint
            # (handled in Serializer validation)
            serializer = self.get_serializer(
                user, data=request.data, partial=True, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Allows the logged-in user to change their password.
        """
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            if not user.check_password(serializer.data.get("old_password")):
                return Response(
                    {"old_password": ["Wrong password."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response(
                {"message": "Password updated successfully."}, status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def factory_reset(self, request):
        """
        Selectively wipe out data. Requires admin password.
        """
        user = request.user
        if user.role != "admin":
            return Response(
                {"detail": "Only admins can perform factory reset."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = FactoryResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Verify password
        if not user.check_password(serializer.validated_data["password"]):
            return Response(
                {"password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        deleted_counts = {}
        errors = []

        try:
            # Order matters due to foreign keys!

            # 1. Sales (Dependent on Products, PaymentMethods, Users)
            if data.get("delete_sales"):
                try:
                    count, _ = Sale.objects.all().delete()
                    deleted_counts["sales"] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Sales: {e}")

            # 2. Production Runs (Dependent on Products, Ingredients, Users)
            if data.get("delete_production_runs"):
                try:
                    count, _ = ProductionRun.objects.all().delete()
                    deleted_counts["production_runs"] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Production Runs: {e}")

            # 3. Recipes (Dependent on Products, Ingredients)
            if data.get("delete_recipes"):
                try:
                    count, _ = Recipe.objects.all().delete()
                    deleted_counts["recipes"] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Recipes: {e}")

            # 4. Purchases (Dependent on Ingredients, Users)
            if data.get("delete_purchases"):
                try:
                    count, _ = Purchase.objects.all().delete()
                    deleted_counts["purchases"] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Purchases: {e}")

            # 5. Products (Referenced by Sales, ProductionRuns, Recipes)
            if data.get("delete_products"):
                try:
                    # Only delete if not referenced by existing sales/production/recipes
                    count, _ = Product.objects.all().delete()
                    deleted_counts["products"] = count
                except ProtectedError as e:
                    # Parse the error to give a user-friendly message
                    protected_objects = list(e.protected_objects)
                    example = (
                        protected_objects[0] if protected_objects else "unknown objects"
                    )
                    model_name = example._meta.verbose_name_plural
                    errors.append(
                        f"Cannot delete Products because they are used in "
                        f"{model_name}. Delete those first."
                    )

            # 6. Ingredients (Referenced by Recipes, ProductionRuns, Purchases)
            if data.get("delete_ingredients"):
                try:
                    count, _ = Ingredient.objects.all().delete()
                    deleted_counts["ingredients"] = count
                except ProtectedError as e:
                    protected_objects = list(e.protected_objects)
                    example = (
                        protected_objects[0] if protected_objects else "unknown objects"
                    )
                    model_name = example._meta.verbose_name_plural
                    errors.append(
                        f"Cannot delete Ingredients because they are used in "
                        f"{model_name}. Delete those first."
                    )

            # 7. Payment Methods (Referenced by Sales)
            if data.get("delete_payment_methods"):
                try:
                    count, _ = PaymentMethod.objects.all().delete()
                    deleted_counts["payment_methods"] = count
                except ProtectedError as e:
                    protected_objects = list(e.protected_objects)
                    example = (
                        protected_objects[0] if protected_objects else "unknown objects"
                    )
                    model_name = example._meta.verbose_name_plural
                    errors.append(
                        f"Cannot delete Payment Methods because they are used "
                        f"in {model_name}."
                    )

            # 8. Notifications
            if data.get("delete_notifications"):
                try:
                    count, _ = NotificationLog.objects.all().delete()
                    deleted_counts["notifications"] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Notifications: {e}")

            # 9. Audit Logs
            if data.get("delete_audit_logs"):
                try:
                    count, _ = AuditLog.objects.all().delete()
                    deleted_counts["audit_logs"] = count
                except ProtectedError as e:
                    errors.append(f"Cannot delete Audit Logs: {e}")

            # 10. Users (Referenced by EVERYTHING)
            if data.get("delete_users"):
                try:
                    # Exclude the current admin user and superusers
                    users_to_delete = User.objects.exclude(id=user.id).exclude(
                        is_superuser=True
                    )
                    count, _ = users_to_delete.delete()
                    deleted_counts["users"] = count
                except ProtectedError as e:
                    protected_objects = list(e.protected_objects)
                    example = (
                        protected_objects[0] if protected_objects else "unknown objects"
                    )
                    model_name = example._meta.verbose_name_plural
                    errors.append(
                        f"Cannot delete Users because they are referenced by "
                        f"{model_name}."
                    )

        except Exception as e:
            return Response(
                {"detail": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_status = status.HTTP_200_OK
        message = "Factory reset completed."

        if errors:
            response_status = status.HTTP_207_MULTI_STATUS  # Partial content/status
            message = "Factory reset completed with some errors."

        # Send notification to all admins about factory reset
        from notifications.models import NotificationEvent
        from notifications.services import send_notification

        send_notification(
            NotificationEvent.FACTORY_RESET,
            {
                "admin_name": user.username,
                "deleted_counts": deleted_counts,
                "errors_count": len(errors),
                "reset_time": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
            },
            target_roles=["admin"],
        )

        return Response(
            {"message": message, "deleted_counts": deleted_counts, "errors": errors},
            status=response_status,
        )


def _get_month_range(target_date):
    start = target_date.replace(day=1)
    end_day = monthrange(target_date.year, target_date.month)[1]
    end = target_date.replace(day=end_day)
    return start, end


def _iter_month_ranges(start_date, end_date):
    cursor = date(start_date.year, start_date.month, 1)
    end_cursor = date(end_date.year, end_date.month, 1)
    while cursor <= end_cursor:
        start, end = _get_month_range(cursor)
        yield start, end
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("user").all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["user"]
    search_fields = ["full_name", "phone_number", "position", "user__username"]
    ordering_fields = ["created_at", "full_name", "hire_date"]

    @action(detail=False, methods=["get"], permission_classes=[IsAdmin])
    def prefill(self, request):
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"detail": "user_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "full_name": user.full_name,
                "phone_number": user.phone_number,
                "address": user.address,
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAdmin])
    def payroll_summary(self, request, pk=None):
        employee = self.get_object()
        today = timezone.localdate()
        start_date = employee.hire_date or employee.created_at.date()
        records = []

        existing = {
            (rec.period_start, rec.period_end): rec
            for rec in PayrollRecord.objects.filter(employee=employee)
        }

        for period_start, period_end in _iter_month_ranges(start_date, today):
            record = existing.get((period_start, period_end))
            if not record:
                try:
                    with transaction.atomic():
                        record = PayrollRecord.objects.create(
                            employee=employee,
                            period_start=period_start,
                            period_end=period_end,
                            base_salary=employee.monthly_base_salary,
                        )
                except IntegrityError:
                    record = PayrollRecord.objects.get(
                        employee=employee,
                        period_start=period_start,
                        period_end=period_end,
                    )
            records.append(record)

        records.sort(key=lambda r: r.period_start, reverse=True)
        serializer = PayrollRecordSerializer(records, many=True)
        latest = records[0] if records else None
        return Response(
            {
                "records": serializer.data,
                "latest_record_id": latest.id if latest else None,
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAdmin])
    def payroll_detail(self, request, pk=None):
        employee = self.get_object()
        record_id = request.query_params.get("record_id")
        if not record_id:
            return Response(
                {"detail": "record_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            record = PayrollRecord.objects.get(id=record_id, employee=employee)
        except PayrollRecord.DoesNotExist:
            return Response(
                {"detail": "Payroll record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignments = ShiftAssignment.objects.filter(
            employee=employee,
            shift_date__range=(record.period_start, record.period_end),
        ).select_related("shift")

        attendance_records = {
            rec.assignment_id: rec
            for rec in AttendanceRecord.objects.filter(assignment__in=assignments)
        }

        # Get all leave days within the period
        leave_days = {}
        leaves = LeaveRecord.objects.filter(
            employee=employee,
            start_date__lte=record.period_end,
            end_date__gte=record.period_start,
        )
        for leave in leaves:
            # Add each day of the leave to the leave_days dict
            current_date = max(leave.start_date, record.period_start)
            end_date = min(leave.end_date, record.period_end)
            while current_date <= end_date:
                leave_days[current_date] = {
                    "is_on_leave": True,
                    "leave_type": leave.leave_type,
                }
                current_date += timedelta(days=1)

        # Generate daily data
        daily_data = []
        current_date = record.period_start
        while current_date <= record.period_end:
            day_assignments = [a for a in assignments if a.shift_date == current_date]
            day_data = {
                "date": current_date,
                "shift_name": None,
                "start_time": None,
                "end_time": None,
                "attendance_status": None,
                "is_on_leave": current_date in leave_days,
                "leave_type": leave_days.get(current_date, {}).get("leave_type"),
            }

            if day_assignments:
                # For simplicity, we'll just take the first shift if there are multiple
                assignment = day_assignments[0]
                day_data.update(
                    {
                        "shift_name": assignment.shift.name,
                        "start_time": assignment.shift.start_time,
                        "end_time": assignment.shift.end_time,
                    }
                )

                # Add attendance status if available
                if assignment.id in attendance_records:
                    attendance = attendance_records[assignment.id]
                    day_data["attendance_status"] = attendance.status

            daily_data.append(day_data)
            current_date += timedelta(days=1)

        attendance = AttendanceRecord.objects.filter(
            assignment__in=assignments
        ).select_related("assignment", "assignment__shift")

        attendance_summary = attendance.values("status").annotate(
            count=Count("id"),
            total_late=Sum("late_minutes"),
            total_overtime=Sum("overtime_minutes"),
        )
        total_scheduled_minutes = 0
        total_worked_minutes = 0
        for rec in attendance:
            shift = rec.assignment.shift
            shift_date = rec.assignment.shift_date
            start_dt = timezone.make_aware(
                datetime.combine(shift_date, shift.start_time)
            )
            end_dt = timezone.make_aware(datetime.combine(shift_date, shift.end_time))
            if end_dt <= start_dt:
                end_dt = end_dt + timedelta(days=1)
            scheduled_minutes = int((end_dt - start_dt).total_seconds() // 60)
            total_scheduled_minutes += scheduled_minutes

            if rec.status == AttendanceRecord.STATUS_ABSENT:
                continue

            worked = scheduled_minutes
            if rec.status == AttendanceRecord.STATUS_LATE:
                worked = max(0, worked - int(rec.late_minutes or 0))
            if rec.status in (
                AttendanceRecord.STATUS_PRESENT,
                AttendanceRecord.STATUS_OVERTIME,
            ):
                worked = worked + int(rec.overtime_minutes or 0)
            total_worked_minutes += worked

        attendance_stats = {
            "total": attendance.count(),
            "statuses": list(attendance_summary),
            "total_scheduled_minutes": total_scheduled_minutes,
            "total_worked_minutes": total_worked_minutes,
        }

        leaves = LeaveRecord.objects.filter(
            employee=employee,
            start_date__lte=record.period_end,
            end_date__gte=record.period_start,
        )
        leave_counts = {}
        for leave in leaves:
            leave_counts[leave.leave_type] = (
                leave_counts.get(leave.leave_type, 0) + leave.day_count
            )

        waste_summary = {"total_wastage_volume": 0, "total_wastage_value": 0}
        if employee.user:
            from production.models import IngredientUsage

            usages = IngredientUsage.objects.filter(
                production_run__chef=employee.user,
                production_run__date_produced__date__range=(
                    record.period_start,
                    record.period_end,
                ),
                wastage__gt=0,
            ).select_related("ingredient")
            waste_summary = WasteSummarySerializer.from_queryset(usages)

        payload = {
            "payroll_record": record,
            "attendance_summary": attendance_stats,
            "leave_summary": leave_counts,
            "waste_summary": waste_summary,
            "payment_detail": employee.payment_detail,
            "daily_calendar": daily_data,
        }
        # Serialize to ensure consistent shape/types (renderer will camelCase the keys)
        return Response(PayrollDetailSerializer(instance=payload).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAdmin])
    def waste_monthly(self, request, pk=None):
        employee = self.get_object()
        if not employee.user:
            return Response({"detail": "Employee is not linked to a user."}, status=400)

        today = timezone.localdate()
        period_start, period_end = _get_month_range(today)

        from production.models import IngredientUsage

        usages = IngredientUsage.objects.filter(
            production_run__chef=employee.user,
            production_run__date_produced__date__range=(period_start, period_end),
            wastage__gt=0,
        ).select_related("ingredient")

        return Response(
            {
                "period_start": period_start,
                "period_end": period_end,
                **WasteSummarySerializer.from_queryset(usages),
            }
        )


class ShiftTemplateViewSet(viewsets.ModelViewSet):
    queryset = ShiftTemplate.objects.all()
    serializer_class = ShiftTemplateSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "start_time", "end_time"]


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ShiftAssignment.objects.select_related("employee", "shift").all()
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "shift", "shift_date"]
    ordering_fields = ["shift_date", "created_at"]

    @action(detail=False, methods=["post"], permission_classes=[IsAdmin])
    def bulk_create(self, request):
        employee_id = request.data.get("employee")
        shift_id = request.data.get("shift")
        start_date_str = request.data.get("start_date")
        end_date_str = request.data.get("end_date")

        skip_weekends = bool(request.data.get("skip_weekends", True))
        skip_leave_days = bool(request.data.get("skip_leave_days", True))

        if not employee_id or not shift_id or not start_date_str or not end_date_str:
            return Response(
                {
                    "detail": "employee, shift, start_date, and end_date are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_d = date.fromisoformat(str(start_date_str))
            end_d = date.fromisoformat(str(end_date_str))
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )

        if end_d < start_d:
            return Response(
                {"detail": "end_date cannot be before start_date."}, status=400
            )

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=404)

        try:
            shift = ShiftTemplate.objects.get(id=shift_id)
        except ShiftTemplate.DoesNotExist:
            return Response({"detail": "Shift template not found."}, status=404)

        leave_day_set = set()
        if skip_leave_days:
            leaves = LeaveRecord.objects.filter(
                employee=employee,
                start_date__lte=end_d,
                end_date__gte=start_d,
            )
            for leave in leaves:
                cur = max(leave.start_date, start_d)
                last = min(leave.end_date, end_d)
                while cur <= last:
                    leave_day_set.add(cur)
                    cur += timedelta(days=1)

        created_ids = []
        skipped_existing = 0
        skipped_weekend = 0
        skipped_leave = 0

        with transaction.atomic():
            cur = start_d
            while cur <= end_d:
                if skip_weekends and cur.weekday() >= 5:
                    skipped_weekend += 1
                    cur += timedelta(days=1)
                    continue

                if skip_leave_days and cur in leave_day_set:
                    skipped_leave += 1
                    cur += timedelta(days=1)
                    continue

                try:
                    obj, created = ShiftAssignment.objects.get_or_create(
                        employee=employee,
                        shift=shift,
                        shift_date=cur,
                    )
                except IntegrityError:
                    created = False

                if created:
                    created_ids.append(obj.id)
                else:
                    skipped_existing += 1

                cur += timedelta(days=1)

        return Response(
            {
                "employee": employee.id,
                "shift": shift.id,
                "start_date": start_d,
                "end_date": end_d,
                "created_count": len(created_ids),
                "created_ids": created_ids,
                "skipped_existing": skipped_existing,
                "skipped_weekends": skipped_weekend,
                "skipped_leave_days": skipped_leave,
            },
            status=status.HTTP_201_CREATED,
        )


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related(
        "assignment", "assignment__employee", "assignment__shift"
    ).all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["assignment__employee", "status"]
    ordering_fields = ["recorded_at"]

    @action(detail=False, methods=["post"], permission_classes=[IsAdmin])
    def upsert(self, request):
        """
        Create or update attendance for a shift assignment.
        Supports payload with either:
        - assignment: <id>
        OR
        - employee, shift, shift_date_input
        """
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        validated = dict(serializer.validated_data)
        assignment = validated.get("assignment")

        if not assignment:
            employee = validated.pop("employee")
            shift = validated.pop("shift")
            shift_date = validated.pop("shift_date_input")
            assignment, _created = ShiftAssignment.objects.get_or_create(
                employee=employee, shift=shift, shift_date=shift_date
            )

        validated.pop("employee", None)
        validated.pop("shift", None)
        validated.pop("shift_date_input", None)

        obj, created = AttendanceRecord.objects.update_or_create(
            assignment=assignment,
            defaults={
                **validated,
                "assignment": assignment,
                "recorded_by": request.user,
            },
        )

        out = self.get_serializer(obj)
        return Response(
            out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAdmin])
    def daily_summary(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"detail": "date query parameter is required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({"detail": "Invalid date format."}, status=400)

        attendance = AttendanceRecord.objects.filter(
            assignment__shift_date=target_date
        ).select_related("assignment", "assignment__employee", "assignment__shift")

        summary = attendance.values("status").annotate(
            count=Count("id"),
            total_late=Sum("late_minutes"),
            total_overtime=Sum("overtime_minutes"),
        )

        total_scheduled_minutes = 0
        total_worked_minutes = 0
        for rec in attendance:
            shift = rec.assignment.shift
            start_dt = timezone.make_aware(
                datetime.combine(target_date, shift.start_time)
            )
            end_dt = timezone.make_aware(datetime.combine(target_date, shift.end_time))
            if end_dt <= start_dt:
                end_dt = end_dt + timedelta(days=1)
            scheduled_minutes = int((end_dt - start_dt).total_seconds() // 60)
            total_scheduled_minutes += scheduled_minutes

            if rec.status == AttendanceRecord.STATUS_ABSENT:
                continue

            worked = scheduled_minutes
            if rec.status == AttendanceRecord.STATUS_LATE:
                worked = max(0, worked - int(rec.late_minutes or 0))
            if rec.status == AttendanceRecord.STATUS_OVERTIME:
                worked = worked + int(rec.overtime_minutes or 0)
            if rec.status == AttendanceRecord.STATUS_PRESENT:
                worked = worked + int(rec.overtime_minutes or 0)
            total_worked_minutes += worked

        return Response(
            {
                "date": target_date,
                "total_records": attendance.count(),
                "total_scheduled_minutes": total_scheduled_minutes,
                "total_worked_minutes": total_worked_minutes,
                "status_breakdown": list(summary),
            }
        )


class LeaveRecordViewSet(viewsets.ModelViewSet):
    queryset = LeaveRecord.objects.select_related("employee").all()
    serializer_class = LeaveRecordSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "leave_type"]
    ordering_fields = ["start_date", "end_date"]


class PayrollRecordViewSet(viewsets.ModelViewSet):
    queryset = PayrollRecord.objects.select_related("employee").all()
    serializer_class = PayrollRecordSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "status"]
    ordering_fields = ["period_start", "created_at"]
