from rest_framework import permissions

class IsAdminOrOwner(permissions.BasePermission):
    """
    - Admins have full access.
    - Users can view/edit their own profile.
    - Users cannot list all users.
    """
    def has_permission(self, request, view):
        # Allow listing only for admins
        if view.action == 'list':
            return request.user.is_authenticated and request.user.role == 'admin'
        # Allow creation only for admins
        if view.action == 'create':
            return request.user.is_authenticated and request.user.role == 'admin'
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.role == 'admin':
            return True
        # User can only view/edit themselves
        return obj == request.user

