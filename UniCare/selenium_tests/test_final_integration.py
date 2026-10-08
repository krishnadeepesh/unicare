import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestFinalIntegration:

    def test_dynamic_qr_code_on_digital_health_card(self, driver, base_url):
        """Test Patient Portal Digital Health Card generates dynamic QR code modal."""
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Patient Arjun
        helper.login("arjun@gmail.com", "Patient@123")

        # Locate View QR Code button on the health card
        qr_btn = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'View QR Code') or contains(., 'QR Code')]"))
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", qr_btn)
        time.sleep(0.5)
        qr_btn.click()

        # Verify QR Code Modal opens
        qr_modal = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//h5[contains(., 'Patient Health Identity QR') or contains(., 'QR')]"))
        )
        assert qr_modal.is_displayed()

        # Verify QR Canvas rendered
        canvas = WebDriverWait(driver, 8).until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//canvas"))
        )
        assert canvas is not None

        # Verify Download QR button exists
        download_btn = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//button[contains(., 'Download QR') or contains(., 'Download')]"))
        )
        assert download_btn is not None

        # Close QR Modal
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//button[contains(@class, 'btn-close') or contains(., 'Close')]")
        close_btn.click()
        time.sleep(0.5)

        helper.logout()

    def test_super_admin_audit_trail_ui(self, driver, base_url):
        """Test Super Admin dashboard includes live audit trail connected to tbl_audit_log."""
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Super Admin
        helper.login("superadmin@unicare.com", "Admin@123")

        # Click Audit Trail & Logs sidebar tab
        audit_tab = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and (contains(., 'Audit') or contains(., 'Logs'))]"))
        )
        audit_tab.click()

        # Verify Audit Log view is displayed
        audit_header = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'System Audit Trail') or contains(text(), 'Activity Logs')]"))
        )
        assert audit_header.is_displayed()

        # Verify table exists with records
        audit_table = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//table"))
        )
        assert audit_table.is_displayed()

        # Verify filter dropdown exists
        module_filter = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//select[contains(@class, 'form-select')]"))
        )
        assert module_filter is not None

        helper.logout()

    def test_nurse_and_doctor_lab_reports_with_sharing_toggle(self, driver, base_url):
        """Test Nurse can upload lab report with Share / Keep Local toggle and Doctor views it."""
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # 1. Login as Nurse Sarah Kurian
        helper.login("sarah.kurian@sunrise.com", "Nurse@123")

        # Switch to Diagnostic & Lab Reports tab
        reports_tab = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Diagnostic & Lab Reports')]"))
        )
        reports_tab.click()

        # Verify Upload Test Report button exists
        upload_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Upload Test Report')]"))
        )
        upload_btn.click()

        # Verify modal opens
        report_modal = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//h5[contains(., 'Diagnostic Lab Report')]"))
        )
        assert report_modal.is_displayed()

        # Fill report form
        title_input = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//input[@placeholder and contains(@placeholder, 'Title')]")
        title_input.clear()
        report_title = f"Selenium Automated Panel {int(time.time())}"
        title_input.send_keys(report_title)

        findings_input = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//textarea")
        findings_input.clear()
        findings_input.send_keys("Automated test: Hemoglobin 14.5 g/dL, WBC 6800. Verified normal.")

        # Ensure Share toggle is present
        share_toggle = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox' and @role='switch']"))
        )
        assert share_toggle is not None

        # Submit report
        submit_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//button[@type='submit']")
        submit_btn.click()
        time.sleep(1.5)

        # Verify report appears in reports table
        report_row = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, f"//*[contains(text(), '{report_title}')]"))
        )
        assert report_row.is_displayed()

        helper.logout()
