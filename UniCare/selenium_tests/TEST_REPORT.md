# UniCare Selenium Test Execution Report

**Execution Date:** 2026-09-22  
**Target Environment:** Local Dev (`Frontend: http://localhost:5173` | `Backend: http://localhost:8000`)  
**Test Framework:** Pytest 9.1.1 + Selenium WebDriver 4.49.0  
**Browsers Validated:** Google Chrome (v153), Microsoft Edge (v153)  

---

## 1. Executive Summary

| Metric | Result |
| :--- | :--- |
| **Total Test Cases** | **11** |
| **Passed** | **11 (100%)** |
| **Failed** | **0 (0%)** |
| **Execution Mode** | Headless & Headed |
| **Interactive HTML Report** | [`selenium_tests/reports/test_report.html`](file:///d:/MINI%20PROJECT/UniCare/selenium_tests/reports/test_report.html) |

---

## 2. Detailed Results by Test Suite

### A. Landing Page & Public Navigation ([`test_landing_page.py`](file:///d:/MINI%20PROJECT/UniCare/selenium_tests/test_landing_page.py))

| Test Case | Description | Result |
| :--- | :--- | :---: |
| `test_landing_page_branding_and_hero` | Verifies brand logo, UniCare title, and hero header banner. | **PASSED** |
| `test_landing_page_nav_links` | Verifies presence of main navbar links (Home, Features, About). | **PASSED** |
| `test_features_section_displayed` | Verifies features section anchor and clinical feature cards. | **PASSED** |
| `test_open_and_close_auth_modal` | Tests opening login modal from navbar and closing it via overlay button. | **PASSED** |
| `test_get_started_button_triggers_login` | Tests hero CTA "Get Started" triggers the authentication modal. | **PASSED** |

### B. Authentication & Security Recovery ([`test_authentication.py`](file:///d:/MINI%20PROJECT/UniCare/selenium_tests/test_authentication.py))

| Test Case | Description | Result |
| :--- | :--- | :---: |
| `test_invalid_login_shows_error` | Submits bad credentials and confirms error alert appears. | **PASSED** |
| `test_switch_between_login_and_register` | Verifies seamless modal toggle between Login and Registration forms. | **PASSED** |
| `test_forgot_password_lookup_nonexistent_user` | Tests account recovery lookup with unknown identifier and validates error alert. | **PASSED** |

### C. Clinical & Administrative Portals

| Test File | Description | Result |
| :--- | :--- | :---: |
| [`test_super_admin_dashboard.py`](file:///d:/MINI%20PROJECT/UniCare/selenium_tests/test_super_admin_dashboard.py) | **Super Admin**: Login, dashboard metrics, Hospital Directory tab, Platform Analytics tab, and safe sign-out. | **PASSED** |
| [`test_doctor_dashboard.py`](file:///d:/MINI%20PROJECT/UniCare/selenium_tests/test_doctor_dashboard.py) | **Doctor Portal**: Login as Dr. Anu, view Appointments, Patient Search, Consultations & EHR, Digital Prescriptions, and logout. | **PASSED** |
| [`test_patient_portal.py`](file:///d:/MINI%20PROJECT/UniCare/selenium_tests/test_patient_portal.py) | **Patient Portal**: Login as Arjun, verify Health ID badge, My Appointments, Prescriptions, Lab Reports, and logout. | **PASSED** |

---

## 3. How to View and Re-run Reports

### Open the HTML Report in Browser
Open the file directly in any web browser:
```text
D:\MINI PROJECT\UniCare\selenium_tests\reports\test_report.html
```

### Re-run the Tests Anytime
```powershell
# Run all tests and refresh HTML report
py selenium_tests/run_tests.py

# Run on Microsoft Edge
py selenium_tests/run_tests.py --browser=edge

# Run in headed mode (watch browser)
py selenium_tests/run_tests.py --headed
```
