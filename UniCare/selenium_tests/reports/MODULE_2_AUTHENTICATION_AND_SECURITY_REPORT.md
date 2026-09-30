# Test Execution Report: Module 2 — Authentication & Account Security

**Project:** UniCare Interoperable Electronic Health Record (EHR) Platform  
**Module Name:** Authentication & Account Security  
**Test File:** `selenium_tests/test_authentication.py`  
**Execution Date:** 2026-09-30  
**Framework:** Selenium WebDriver 4.49.0 + Pytest 9.1.1  
**Target URL:** `http://localhost:5173/`  
**Browser:** Google Chrome (Headless & Headed)  
**Status:** **ALL TESTS PASSED (3/3 — 100%)**

---

## 1. Module Overview
This module governs role-based authentication, credential verification, protection against unauthorized access, hospital onboarding registration toggling, and self-service password recovery mechanisms across the platform.

---

## 2. Test Cases and Execution Results

### Test Case 2.1: `test_invalid_login_shows_error`
* **Test Objective:** Ensure the system blocks unauthorized logins and provides feedback.
* **Test Steps:**
  1. Open the universal Login modal.
  2. Enter invalid email credentials (`invalid.user@test.com`) and invalid password (`WrongPass@999`).
  3. Click **Sign In**.
* **Expected Result:** HTTP 401 response handled; an alert ("Invalid email or password") appears; user remains on login dialog.
* **Actual Result:** Unauthorized login blocked immediately; red danger alert rendered; session not granted.
* **Execution Status:** **PASSED**

---

### Test Case 2.2: `test_switch_between_login_and_register`
* **Test Objective:** Verify seamless switching between user login and hospital onboarding forms.
* **Test Steps:**
  1. Open Auth modal.
  2. Click "Register Your Healthcare Organization".
  3. Verify presence of hospital registration fields (Hospital Name, License Upload, Admin Email, Contact).
  4. Click "Back to Login".
* **Expected Result:** Form inputs swap dynamically without page reload or state corruption.
* **Actual Result:** Both forms toggle smoothly with correct input fields and labels.
* **Execution Status:** **PASSED**

---

### Test Case 2.3: `test_forgot_password_lookup_nonexistent_user`
* **Test Objective:** Test security recovery lookup behavior for unknown email identifiers during password reset.
* **Test Steps:**
  1. Open Auth modal and click "Forgot Password?".
  2. Enter a non-existent email (`ghost.account@unicare.org`).
  3. Submit lookup request.
* **Expected Result:** Safe error alert indicates no account was found matching the email address.
* **Actual Result:** Handled gracefully with error notification; zero server crashes or unhandled exceptions.
* **Execution Status:** **PASSED**

---

## 3. Module Summary Table

| Test Case | Description | Duration | Status |
| :--- | :--- | :---: | :---: |
| `test_invalid_login_shows_error` | Negative authentication check and danger alert validation | 2.15s | **PASSED** |
| `test_switch_between_login_and_register` | Modal dynamic toggling between Login and Hospital Registration | 1.84s | **PASSED** |
| `test_forgot_password_lookup_nonexistent_user` | Account recovery email lookup and safety error handling | 2.05s | **PASSED** |

**Conclusion:** Module 2 authentication and security controls conform to specifications.
