from rest_framework import permissions


class HasPagePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        permission = getattr(view, "required_permission", None)
        return bool(
            request.user.is_authenticated
            and permission
            and request.user.has_page_permission(permission)
        )


class IsAdminOrOwner(permissions.BasePermission):
    """
    - Admins have full access.
    - Users can view/edit their own profile.
    - Users cannot list all users.
    """

    def has_permission(self, request, view):
        if view.action in ["list", "create"]:
            return bool(
                request.user.is_authenticated
                and request.user.has_page_permission("users")
            )
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.role == "admin":
            return True
        if obj == request.user:
            return True
        return request.user.has_page_permission("users") and obj.role == "staff"


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class HasEmployeesPermission(HasPagePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.has_page_permission("employees"):
            return True
        return (
            request.method in permissions.SAFE_METHODS
            and request.user.has_page_permission("hr")
        )


class HasHrPermission(HasPagePermission):
    def has_permission(self, request, view):
        view.required_permission = "hr"
        return super().has_permission(request, view)
