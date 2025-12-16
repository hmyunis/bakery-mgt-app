from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.views.generic import TemplateView
from core.views import health_check, owner_dashboard, bakery_settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.decorators.http import require_http_methods
from django.views.static import serve
from pathlib import Path
from django.http import HttpResponse

@require_http_methods(["GET"])
def service_worker_view(request):
    """Serve service worker from root with proper headers for scope control."""
    sw_path = Path(settings.BASE_DIR) / 'core' / 'static' / 'sw.js'
    
    if not sw_path.exists():
        return HttpResponse("Service worker not found", status=404)
    
    with open(sw_path, 'r') as f:
        content = f.read()
    
    response = HttpResponse(content, content_type='application/javascript')
    # Allow service worker to control the entire site from /static/ location
    response['Service-Worker-Allowed'] = '/'
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health Check
    path('api/v1/health/', health_check, name='health_check'),
    # Dashboard aggregates (Admin/Owner)
    path('api/v1/dashboard/owner/', owner_dashboard, name='owner_dashboard'),
    # Bakery Settings
    path('api/v1/core/bakery-settings/', bakery_settings, name='bakery_settings'),
    
    # API Version 1
    path('api/v1/users/', include('users.urls')),
    path('api/v1/audit/', include('audit.urls')),
    path('api/v1/inventory/', include('inventory.urls')),
    path('api/v1/production/', include('production.urls')),
    path('api/v1/sales/', include('sales.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/reports/', include('reports.urls')),
    
    # Swagger Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # Service worker - serve from root with proper headers
    path('sw.js', service_worker_view, name='service-worker'),
]

urlpatterns += staticfiles_urlpatterns()

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(r'^(?P<path>uploads/.*)$', serve, {
            'document_root': settings.MEDIA_ROOT,
        })
    ]

urlpatterns += [
  re_path(r'^.*$', TemplateView.as_view(template_name="index.html"), name='react_app'),
]