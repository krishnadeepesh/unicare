import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestDoctorDashboard:

    def test_doctor_login_and_clinical_navigation(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Doctor Anu
        helper.login("anu@sunrise.com", "Doctor@123")

        # Verify Doctor Portal loaded
        header = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'DOCTOR PORTAL') or contains(text(), 'Dr. Anu')]"))
        )
        assert header.is_displayed()

        # Navigate to Appointments tab
        appts_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Appointments')]"))
        )
        appts_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Appointments') or contains(text(), 'Today')]"))
        )

        # Navigate to Patient Search tab
        search_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Patient Search')]"))
        )
        search_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Patient Search') or contains(@placeholder, 'Search')]"))
        )

        # Navigate to Consultations & EHR tab
        ehr_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Consultations')]"))
        )
        ehr_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Consultations') or contains(text(), 'EHR') or contains(text(), 'Clinical')]"))
        )

        # Navigate to Prescriptions tab
        presc_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Prescriptions')]"))
        )
        presc_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Prescription')]"))
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
