from drf_camel_case.render import CamelCaseJSONRenderer
from rest_framework.renderers import BaseRenderer
import openpyxl
from io import BytesIO

class CustomCamelCaseJSONRenderer(CamelCaseJSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response')
        # Check if the response is successful (2xx status code) and is not a file download
        if response and response.status_code // 100 == 2 and 'application/json' in response.get('Content-Type', ''):
            # For paginated responses
            if isinstance(data, dict) and 'results' in data:
                custom_data = {
                    'success': True,
                    'message': 'Data retrieved successfully.',
                    'data': data.get('results'),
                    'pagination': {
                        'count': data.get('count'),
                        'next': data.get('next'),
                        'previous': data.get('previous')
                    }
                }
            else:
                # For non-paginated successful responses
                custom_data = {
                    'success': True,
                    'message': 'Operation successful.',
                    'data': data
                }
            return super().render(custom_data, accepted_media_type, renderer_context)
        return super().render(data, accepted_media_type, renderer_context)

class ExcelRenderer(BaseRenderer):
    media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    format = 'xlsx'
    charset = None
    render_style = 'binary'

    def render(self, data, media_type=None, renderer_context=None):
        view = renderer_context['view']
        if not hasattr(view, 'get_excel_workbook'):
            raise Exception('To use ExcelRenderer, the view must implement get_excel_workbook(data) method.')
        workbook = view.get_excel_workbook(data)
        buffer = BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

