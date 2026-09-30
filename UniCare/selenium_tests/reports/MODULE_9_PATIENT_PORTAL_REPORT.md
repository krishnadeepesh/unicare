# Test Execution Report: Module 9 — Patient Access Center & Self-Service Portal

**Project:** UniCare Interoperable Electronic Health Record (EHR) Platform  
**Module Name:** Patient Access Center & Self-Service Portal  
**Test File:** `selenium_tests/test_patient_portal.py`  
**Execution Date:** 2026-09-30  
**Framework:** Selenium WebDriver 4.49.0 + Pytest 9.1.1  
**Target URL:** `http://localhost:5173/`  
**Test Account:** `arjun@gmail.com` (Arjun — Health ID `PTA001`)  
**Browser:** Google Chrome (Headless & Headed)  
**Status:** **ALL TESTS PASSED (1/1 — 100%)**

---

## 1. Module Overview
The Patient Access Center is the patient's personal healthcare dashboard, enabling them to inspect their unified longitudinal record across all participating hospitals, verify their Universal Patient ID (`UPID`), view their Digital Health Card, check shared prescriptions, schedule doctor appointments, and upload diagnostic lab reports.

---

## 2. Test Cases and Execution Results

### Test Case 9.1: `test_patient_login_and_hub_navigation`
* **Test Objective:** Validate patient self-service portal, medical records, and prescription privacy.
* **Test Steps:**
  1. Open Login modal and enter patient credentials (`arjun@gmail.com` / `Patient@123`).
  2. Verify Patient Hub loads with Health ID badge in sidebar (`Health ID: PTA001`).
  3. Navigate to **My Appointments**: Verify appointment history and status tags (`Confirmed`, `Completed`).
  4. Navigate to **Prescriptions**: Verify that only prescriptions flagged as `Shared with Patient` appear (Internal Only are hidden).
  5. Navigate to **Lab Reports**: Verify diagnostic investigation table and **Upload Lab Report** button.
  6. Sign out and verify safe return to landing page.
* **Expected Result:** Patient can view appointments, shared prescriptions, and lab reports; unshared records remain private.
* **Actual Result:** Records loaded; prescription privacy verified; sign-out redirected to home.
* **Execution Status:** **PASSED**

---

## 3. Module Summary Table

| Test Case | Description | Duration | Status |
| :--- | :--- | :---: | :---: |
| `test_patient_login_and_hub_navigation` | Patient login, Health ID badge, appointments, prescriptions, and lab reports | 4.65s | **PASSED** |

**Conclusion:** Module 9 Patient Access Center is verified and operational.
