from rest_framework_simplejwt.authentication import JWTAuthentication

from .middleware import _thread_locals


class AuditJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets the user in thread locals
    for audit logging purposes.
    """

    def authenticate(self, request):
        # Authenticate the user using the standard JWT mechanism
        result = super().authenticate(request)

        # If authentication was successful, set the user in thread locals
        if result is not None:
            user, token = result
            _thread_locals.user = user

        return result
