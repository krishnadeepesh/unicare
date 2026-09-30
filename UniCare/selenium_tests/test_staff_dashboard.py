import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestStaffDashboard:

    def test_staff_login_and_patient_registration(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Receptionist Neha
        helper.login("neha@sunrise.com", "Staff@123")

        # Verify Staff Portal loaded
        header = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'HOSPITAL STAFF') or contains(text(), 'Neha') or contains(text(), 'Receptionist')]"))
        )
        assert header.is_displayed()

        # Navigate to Register Patient Tab
        reg_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and (contains(., 'Register') or contains(., 'Patient'))]"))
        )
        reg_tab.click()

        # Verify Patient Registration form fields are present
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//form//input | //form//label[contains(text(), 'Name') or contains(text(), 'Phone')]"))
        )

        # Navigate to Book Appointment Tab
        appt_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Appointment')]"))
        )
        appt_tab.click()

        # Verify Live Slot checking interface
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Doctor') or contains(text(), 'Appointment') or contains(text(), 'Time Slot')]"))
        )

        # Logout
        helper.logout()
