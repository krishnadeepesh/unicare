from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def root_api_info(request):
    return JsonResponse({
        'service': 'UniCare Platform Backend API',
        'status': 'Online',
        'database': 'db_unicare',
        'super_admin_endpoints': {
            'login': '/api/super-admin/login/',
            'logout': '/api/super-admin/logout/',
            'check_session': '/api/super-admin/check-session/',
            'dashboard_stats': '/api/super-admin/dashboard-stats/'
        },
        'frontend_url': 'http://localhost:5173/admin'
    })

urlpatterns = [
    path('', root_api_info, name='root_api_info'),
    path('api/super-admin/', include('super_admin.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
