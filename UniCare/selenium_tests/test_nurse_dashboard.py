import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestNurseDashboard:

    def test_nurse_login_and_station_overview(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Nurse Sarah Kurian
        helper.login("sarah.kurian@sunrise.com", "Nurse@123")

        # Verify Nurse Station loaded
        header = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'CLINICAL STATION') or contains(text(), 'Sarah Kurian') or contains(text(), 'Nurse')]"))
        )
        assert header.is_displayed()

        # Verify Key Metric Cards
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Today')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Vitals')]"))
        )

        # Verify Vitals Intake Queue is visible
        queue_table = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//table | //div[contains(@class, 'card')]"))
        )
        assert queue_table.is_displayed()

        # Test Opening Change Password & Security modal
        profile_menu_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'btn-link') or contains(., 'Sarah') or contains(@aria-label, 'menu')]"))
        )
        profile_menu_btn.click()
        time.sleep(0.5)

        security_opt = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Change Password') or contains(text(), 'Security Settings')]"))
        )
        security_opt.click()

        # Verify Security modal opened
        modal_title = WebDriverWait(driver, 8).until(
            EC.visibility_of_element_located((By.XPATH, "//h5[contains(text(), 'Change Password') or contains(text(), 'Security')]"))
        )
        assert modal_title.is_displayed()

        # Close Modal
        close_btn = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'modal')]//button[contains(@class, 'btn-close') or contains(., 'Cancel')]"))
        )
        close_btn.click()
        time.sleep(0.5)

        # Logout
        helper.logout()
