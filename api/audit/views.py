from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for audit logs. Only accessible by Admins.
    """
    queryset = AuditLog.objects.select_related('actor').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'table_name', 'actor']
    search_fields = ['record_id', 'old_value', 'new_value', 'table_name']
    ordering_fields = ['timestamp']
