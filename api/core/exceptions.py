from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        custom_data = {
            'success': False,
            'message': response.data.get('detail', 'An error occurred.'),
            'errors': response.data if isinstance(response.data, dict) else {'detail': response.data}
        }
        response.data = custom_data
    return response

