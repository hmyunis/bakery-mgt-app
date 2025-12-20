from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict):
            message = response.data.get("detail", "An error occurred.")
            errors = response.data
        else:
            message = "Validation error occurred."
            errors = {"detail": response.data}

        custom_data = {"success": False, "message": message, "errors": errors}
        response.data = custom_data
    return response
