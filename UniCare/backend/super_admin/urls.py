from django.urls import path
from . import views
from . import workflows

urlpatterns = [
    path('login/', views.super_admin_login, name='super_admin_login'),
    path('logout/', views.super_admin_logout, name='super_admin_logout'),
    path('password-reset/request/', views.request_password_reset, name='request_password_reset'),
    path('password-reset/confirm/', views.confirm_password_reset, name='confirm_password_reset'),
    path('check-session/', views.check_session, name='check_session'),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    
    # Forgot Password Recovery (email/phone → question → answer → new password)
    path('recovery/lookup/', views.recovery_account_lookup, name='recovery_account_lookup'),
    path('recovery/verify/', views.recovery_answer_verify, name='recovery_answer_verify'),

    # Public Hospital Operations
    path('hospital-register-public/', views.register_hospital_public, name='register_hospital_public'),
    path('hospital-registration/submit/', views.submit_hospital_registration, name='submit_hospital_registration'),
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
    path('doctors/update/', views.update_doctor, name='update_doctor'),
    path('doctors/delete/', views.delete_doctor, name='delete_doctor'),
    path('receptionists/', views.get_receptionists, name='get_receptionists'),
    path('receptionists/add/', views.add_receptionist, name='add_receptionist'),
    path('receptionists/update/', views.update_receptionist, name='update_receptionist'),
    path('receptionists/delete/', views.delete_receptionist, name='delete_receptionist'),
    path('departments/', views.get_departments, name='get_departments'),
    path('departments/save/', views.save_department, name='save_department'),
    path('departments/delete/', views.delete_department, name='delete_department'),
    path('unicare-access-requests/', views.request_unicare_access, name='request_unicare_access'),
    path('doctor-login-public/', views.doctor_login_public, name='doctor_login_public'),
    path('staff-login/', views.staff_login, name='staff_login'),

    # Role-aware clinical workflow APIs (separate from legacy admin APIs)
    path('auth/login/', workflows.unified_login, name='unified_login'),
    path('auth/logout/', workflows.logout, name='workflow_logout'),
    path('profile/', workflows.profile, name='profile'),
    path('profile/change-password/', workflows.change_password, name='change_password'),
    path('doctor/hospitals/', workflows.doctor_hospitals, name='doctor_hospitals'),
    path('doctor/patient-suggestions/', workflows.doctor_patient_suggestions, name='doctor_patient_suggestions'),
    path('receptionist/patient-suggestions/', workflows.receptionist_patient_suggestions, name='receptionist_patient_suggestions'),
    path('patient-history/', workflows.patient_history, name='patient_history'),
    path('patients/register/', workflows.register_patient, name='register_patient'),
    path('patients/lookup/', workflows.patient_lookup, name='patient_lookup'),
    path('appointments/options/', workflows.booking_options, name='booking_options'),
    path('appointments/', workflows.appointments, name='appointments'),
    path('visits/', workflows.visits, name='visits'),

    # Analytics
    path('analytics/', views.analytics_data, name='analytics_data'),
]
