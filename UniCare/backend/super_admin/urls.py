from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.super_admin_login, name='super_admin_login'),
    path('logout/', views.super_admin_logout, name='super_admin_logout'),
    path('check-session/', views.check_session, name='check_session'),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    
    # Public Hospital Operations
    path('hospital-register-public/', views.register_hospital_public, name='register_hospital_public'),
    path('hospital-status-public/', views.check_hospital_status_public, name='check_hospital_status_public'),
    path('hospital-admin-login/', views.hospital_admin_login, name='hospital_admin_login'),
    path('hospital-admin/dashboard-data/', views.get_hospital_admin_dashboard_data, name='get_hospital_admin_dashboard_data'),

    # Hospital Requests
    path('hospital-requests/', views.get_hospital_requests, name='get_hospital_requests'),
    path('hospital-requests/action/', views.hospital_request_action, name='hospital_request_action'),
    
    # Manage Hospitals CRUD
    path('hospitals/', views.get_hospitals, name='get_hospitals'),
    path('hospitals/add/', views.add_hospital, name='add_hospital'),
    path('hospitals/update/', views.update_hospital, name='update_hospital'),
    path('hospitals/toggle-active/', views.toggle_hospital_active, name='toggle_hospital_active'),
    path('hospitals/delete/', views.delete_hospital, name='delete_hospital'),
    
    # Doctor Management CRUD & Doctor Login
    path('doctors/', views.get_doctors, name='get_doctors'),
    path('doctors/add/', views.add_doctor, name='add_doctor'),
    path('doctors/delete/', views.delete_doctor, name='delete_doctor'),
    path('doctor-login-public/', views.doctor_login_public, name='doctor_login_public'),

    # Analytics
    path('analytics/', views.analytics_data, name='analytics_data'),
]
