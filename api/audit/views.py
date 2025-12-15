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
    filterset_fields = ['action', 'table_name', 'actor', 'ip_address']
    # NOTE: Searching JSON fields can be backend-dependent; we keep them out of default search
    # for reliability (esp. SQLite). Users can still search by record/table/action/actor/ip.
    search_fields = [
        'record_id',
        'table_name',
        'action',
        'ip_address',
        'actor__username',
        'actor__full_name',
    ]
    ordering_fields = ['timestamp', 'action', 'table_name']
