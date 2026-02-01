from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AttendanceRecordViewSet,
    CustomTokenObtainPairView,
    EmployeeViewSet,
    LeaveRecordViewSet,
    PayrollRecordViewSet,
    ShiftAssignmentViewSet,
    ShiftTemplateViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"employees", EmployeeViewSet, basename="employees")
router.register(r"shift-templates", ShiftTemplateViewSet, basename="shift-templates")
router.register(
    r"shift-assignments", ShiftAssignmentViewSet, basename="shift-assignments"
)
router.register(r"attendance", AttendanceRecordViewSet, basename="attendance")
router.register(r"leaves", LeaveRecordViewSet, basename="leaves")
router.register(r"payroll-records", PayrollRecordViewSet, basename="payroll-records")
router.register(r"", UserViewSet, basename="users")

urlpatterns = [
    # Auth
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # User CRUD
    path("", include(router.urls)),
]
