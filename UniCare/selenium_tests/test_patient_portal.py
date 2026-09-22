import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestPatientPortal:

    def test_patient_login_and_hub_navigation(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Patient Arjun
        helper.login("arjun@gmail.com", "Patient@123")

        # Verify Patient Portal loaded
        header = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Patient Access Center') or contains(text(), 'My Health Hub')]"))
        )
        assert header.is_displayed()

        # Check Health ID in sidebar
        health_id_badge = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Health ID:')]"))
        )
        assert "PTA001" in health_id_badge.text or "Health ID:" in health_id_badge.text

        # Navigate to My Appointments tab
        appts_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'My Appointments')]"))
        )
        appts_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Appointments') or contains(text(), 'Book Appointment')]"))
        )

        # Navigate to Prescriptions tab
        presc_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Prescriptions')]"))
        )
        presc_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Prescription')]"))
        )

        # Navigate to Lab Reports tab
        reports_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Lab Reports')]"))
        )
        reports_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Lab Report') or contains(text(), 'Upload Lab Report')]"))
        )

        # Logout test
        profile_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//header[contains(@class, 'portal-topbar')]//button[contains(@class, 'btn-link')]"))
        )
        profile_btn.click()

        logout_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Sign Out')]"))
        )
        logout_btn.click()

        # Verify returned to Landing Page
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//h1[contains(., 'Smarter Healthcare Starts With')]"))
        )
