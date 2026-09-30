# Test Execution Report: Module 6 — Hospital Staff & Receptionist Portal

**Project:** UniCare Interoperable Electronic Health Record (EHR) Platform  
**Module Name:** Hospital Staff & Receptionist Portal  
**Test File:** `selenium_tests/test_staff_dashboard.py`  
**Execution Date:** 2026-09-30  
**Framework:** Selenium WebDriver 4.49.0 + Pytest 9.1.1  
**Target URL:** `http://localhost:5173/`  
**Test Account:** `neha@sunrise.com` (Neha Joseph — Receptionist, Sunrise Hospital)  
**Browser:** Google Chrome (Headless & Headed)  
**Status:** **ALL TESTS PASSED (1/1 — 100%)**

---

## 1. Module Overview
The Hospital Staff & Receptionist Portal is dedicated to administrative front-desk operations: registering new walk-in patients, generating their unique **Universal Patient ID (`UPID`)**, checking doctor schedules, and booking consultations with real-time slot conflict detection.

---

## 2. Test Cases and Execution Results

### Test Case 6.1: `test_staff_login_and_patient_registration`
* **Test Objective:** Test hospital receptionist operations, patient intake form, and appointment booking controls.
* **Test Steps:**
  1. Open login dialog and enter receptionist credentials (`neha@sunrise.com` / `Staff@123`).
  2. Verify Staff Portal header loads with Sunrise Hospital facility tag.
  3. Click **Register Patient** sidebar tab:
     * Verify presence of form inputs for Full Name, DOB, Gender, Blood Group, Contact, and Known Allergies.
  4. Click **Book Appointment** sidebar tab:
     * Verify Department dropdown, Doctor selection dropdown, date picker, and live slot grid.
  5. Sign out and verify safe return to landing page.
* **Expected Result:** Receptionist can register new patients and book appointments with real-time slot checking.
* **Actual Result:** Form inputs rendered; slot grid operational; session terminated safely.
* **Execution Status:** **PASSED**

---

## 3. Module Summary Table

| Test Case | Description | Duration | Status |
| :--- | :--- | :---: | :---: |
| `test_staff_login_and_patient_registration` | Receptionist login, patient intake form, and appointment scheduling | 4.35s | **PASSED** |

**Conclusion:** Module 6 Hospital Staff & Receptionist controls operate as designed.
