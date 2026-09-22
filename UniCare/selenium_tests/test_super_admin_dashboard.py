import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestSuperAdminDashboard:

    def test_super_admin_login_and_dashboard_navigation(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Perform login as Super Admin
        helper.login("superadmin@unicare.com", "Admin@123")

        # Verify Super Admin Dashboard header is loaded
        badge = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Super Administrator Control Center')]"))
        )
        assert badge.is_displayed()

        # Check sidebar tabs exist and click "Manage Hospitals"
        hospitals_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Manage Hospitals')]"))
        )
        hospitals_tab.click()

        # Verify Manage Hospitals view is active
        hospitals_header = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Hospital Directory') or contains(text(), 'Manage Hospitals')]"))
        )
        assert hospitals_header.is_displayed()

        # Switch to Analytics tab
        analytics_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Platform Analytics')]"))
        )
        analytics_tab.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Analytics') or contains(text(), 'Platform Overview')]"))
        )

        # Test Sign Out
        profile_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//header[contains(@class, 'portal-topbar')]//button[contains(@class, 'btn-link')]"))
        )
        profile_btn.click()

        logout_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Sign Out')]"))
        )
        logout_btn.click()

        # Verify return to Landing Page
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//h1[contains(., 'Smarter Healthcare Starts With')]"))
        )
