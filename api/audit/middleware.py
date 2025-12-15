import threading

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

def get_current_ip():
    return getattr(_thread_locals, 'ip', None)

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(_thread_locals, 'user'):
            delattr(_thread_locals, 'user')
        if hasattr(_thread_locals, 'ip'):
            delattr(_thread_locals, 'ip')
        
        if request.user.is_authenticated:
            _thread_locals.user = request.user
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        _thread_locals.ip = ip

        response = self.get_response(request)
        return response

