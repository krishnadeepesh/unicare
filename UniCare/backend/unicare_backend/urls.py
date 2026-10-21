from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.conf import settings
from django.views.static import serve

def root_api_info(request):
    return JsonResponse({
        'service': 'UniCare Platform Backend API',
        'status': 'Online',
        'database': 'Connected',
        'super_admin_endpoints': {
            'login': '/api/super-admin/login/',
            'logout': '/api/super-admin/logout/',
            'check_session': '/api/super-admin/check-session/',
            'dashboard_stats': '/api/super-admin/dashboard-stats/'
        }
    })

urlpatterns = [
    path('', root_api_info, name='root_api_info'),
    path('api/super-admin/', include('super_admin.urls')),
    # Serve media files (license documents, QR codes, lab attachments)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
