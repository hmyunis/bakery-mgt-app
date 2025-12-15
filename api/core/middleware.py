from django.utils.deprecation import MiddlewareMixin

class NoCacheMiddleware(MiddlewareMixin):
    """
    Middleware to prevent caching of API responses.
    Adds no-cache headers to all API responses.
    """
    def process_response(self, request, response):
        # Only apply to API endpoints
        if request.path.startswith('/api/'):
            # Prevent caching
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        
        return response