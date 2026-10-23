from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.conf import settings
from django.views.static import serve

def root_api_info(request):
    db_status = "Disconnected"
    db_error = None
    table_count = 0
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            table_count = len(tables)
        db_status = "Connected"
        try:
            from super_admin.workflows import ensure_workflow_schema
            ensure_workflow_schema()
        except Exception:
            pass
    except Exception as e:
        db_status = "Disconnected"
        db_error = str(e)

    db_cfg = settings.DATABASES['default']
    db_host = db_cfg.get('HOST') or 'localhost'

    response_data = {
        'service': 'UniCare Platform Backend API',
        'status': 'Online',
        'database': {
            'status': db_status,
            'host': db_host,
            'name': db_cfg.get('NAME'),
            'user': db_cfg.get('USER'),
            'table_count': table_count,
            'is_cloud_db': db_host not in ('localhost', '127.0.0.1', ''),
        },
        'endpoints': {
            'login': '/api/super-admin/auth/login/',
            'hospitals': '/api/super-admin/hospitals/',
            'dashboard_stats': '/api/super-admin/dashboard-stats/'
        }
    }
    if db_error:
        response_data['database']['error'] = db_error

    status_code = 200 if db_status == "Connected" else 503
    return JsonResponse(response_data, status=status_code)

urlpatterns = [
    path('', root_api_info, name='root_api_info'),
    path('api/super-admin/', include('super_admin.urls')),
    # Serve media files (license documents, QR codes, lab attachments)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
