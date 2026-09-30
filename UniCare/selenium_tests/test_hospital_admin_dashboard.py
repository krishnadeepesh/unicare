import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestHospitalAdminDashboard:

    def test_hospital_admin_login_and_management(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Hospital Admin Anil Kumar
        helper.login("anil@sunrise.com", "HospAdmin@123")

        # Verify Hospital Admin Portal loaded
        header = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'HOSPITAL ADMIN') or contains(text(), 'Sunrise Hospital') or contains(text(), 'Anil Kumar')]"))
        )
        assert header.is_displayed()

        # Verify Overview statistics cards
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Doctors') or contains(text(), 'Appointments') or contains(text(), 'Staff')]"))
        )

        # Navigate to Doctors management tab
        doc_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Doctor')]"))
        )
        doc_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Doctor') or contains(text(), 'Specialization')]"))
        )

        # Navigate to Departments tab
        dept_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Department')]"))
        )
        dept_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Department')]"))
        )

        # Logout
        helper.logout()
