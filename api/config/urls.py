from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.views.generic import TemplateView
from core.views import health_check
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health Check
    path('api/v1/health/', health_check, name='health_check'),
    
    # API Version 1
    path('api/v1/users/', include('users.urls')),
    path('api/v1/audit/', include('audit.urls')),
    path('api/v1/inventory/', include('inventory.urls')),
    path('api/v1/production/', include('production.urls')),
    path('api/v1/sales/', include('sales.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    
    # Swagger Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

urlpatterns += staticfiles_urlpatterns()

# Static/Media Serving
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # In production, CPanel usually handles static via web server config, 
    # but strictly for uploaded media we might need to expose it if not separate
    from django.views.static import serve
    from django.urls import re_path
    urlpatterns += [
        re_path(r'^uploads/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]

urlpatterns += [
  re_path(r'^.*$', TemplateView.as_view(template_name="index.html"), name='react_app'),
]