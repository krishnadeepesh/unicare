# Test Execution Report: Module 5 — Nurse Clinical Station & Vitals Intake

**Project:** UniCare Interoperable Electronic Health Record (EHR) Platform  
**Module Name:** Nurse Clinical Station & Pre-Consultation Vitals  
**Test File:** `selenium_tests/test_nurse_dashboard.py`  
**Execution Date:** 2026-09-30  
**Framework:** Selenium WebDriver 4.49.0 + Pytest 9.1.1  
**Target URL:** `http://localhost:5173/`  
**Test Account:** `sarah.kurian@sunrise.com` (Sarah Kurian — Clinical Staff Nurse, Sunrise Hospital)  
**Browser:** Google Chrome (Headless & Headed)  
**Status:** **ALL TESTS PASSED (1/1 — 100%)**

---

## 1. Module Overview
The Nurse Clinical Station provides a specialized nursing interface designed for intake nurses to review arriving patients, record physiological vital signs (blood pressure, weight, height), preview real-time calculated BMI, and manage nurse account credentials and security recovery questions.

---

## 2. Test Cases and Execution Results

### Test Case 5.1: `test_nurse_login_and_station_overview`
* **Test Objective:** Test nurse authentication, patient vitals queue overview, and nurse account security modal.
* **Test Steps:**
  1. Open home page and open Login modal.
  2. Enter nurse credentials (`sarah.kurian@sunrise.com` / `Nurse@123`) and submit.
  3. Wait for Nurse Station header and facility tag ("Sunrise Hospital") to load.
  4. Verify queue metric cards:
     * **Today's Visits Queue**: Total visits registered for the day.
     * **Awaiting Pre-Consult Vitals**: Patients needing triage vitals.
     * **Vitals Recorded & Verified**: Completed patient vitals.
  5. Verify the patient intake queue table is rendered.
  6. Click the user profile dropdown and select **"Change Password & Security Settings"**.
  7. Verify the Change Password modal renders security questions and password inputs.
  8. Close modal and sign out.
* **Expected Result:** Nurse workspace displays clinical queues and dedicated password management modal; sign-out completes safely.
* **Actual Result:** Queue loaded; modal opened with security question fields; logged out cleanly.
* **Execution Status:** **PASSED**

---

## 3. Module Summary Table

| Test Case | Description | Duration | Status |
| :--- | :--- | :---: | :---: |
| `test_nurse_login_and_station_overview` | Nurse login, vitals queue inspection, and security modal check | 4.62s | **PASSED** |

**Conclusion:** Module 5 Nurse Station and pre-consultation vitals intake operate cleanly.
