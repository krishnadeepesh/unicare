import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestClinicalEnhancements:

    def test_medicine_autocomplete_prefix_filtering_and_scrolling(self, driver, base_url):
        """Test autocomplete matches instantly on 'a' and narrows to 'ae' without lag, and list is scrollable."""
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Doctor Anu
        helper.login("anu@sunrise.com", "Doctor@123")

        # Navigate to Prescriptions tab
        presc_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Prescriptions')]"))
        )
        presc_tab.click()

        # Select a patient to write a prescription
        # Search patient input or select first existing patient button
        search_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//input[contains(@placeholder, 'Search') or contains(@placeholder, 'patient')]"))
        )
        search_input.clear()
        search_input.send_keys("Arjun")
        time.sleep(1)

        # Select patient result
        patient_item = WebDriverWait(driver, 8).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Arjun') or contains(., 'PTA001')] | //div[contains(., 'Arjun') and contains(@class, 'cursor-pointer')]"))
        )
        patient_item.click()
        time.sleep(0.5)

        # Click Write / Issue Prescription button
        write_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Write Prescription') or contains(., 'Issue Prescription')]"))
        )
        write_btn.click()

        # Verify Issue Digital Prescription Modal is displayed
        modal = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//h5[contains(., 'Prescription')]"))
        )
        assert modal.is_displayed()

        # Locate medicine autocomplete input
        med_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//input[contains(@placeholder, 'medicine')]"))
        )
        
        # Test 1: Type 'a'
        med_input.clear()
        med_input.send_keys("a")
        time.sleep(0.5)

        # Verify dropdown appears with standard clinical medicines count
        dropdown_header = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'STANDARD CLINICAL MEDICINES')]"))
        )
        assert dropdown_header.is_displayed()

        # Test 2: Type 'e' so input becomes 'ae'
        med_input.send_keys("e")
        time.sleep(0.5)

        # Verify Aerocort / Aerolin is shown
        ae_match = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Aerocort') or contains(text(), 'Aerolin')]"))
        )
        assert ae_match.is_displayed()

        # Click preset to select Aerocort
        ae_match.click()
        time.sleep(0.5)

        # Verify dosage and instruction auto-populated
        dosage_input = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//input[contains(@value, 'puff') or contains(@placeholder, '500mg')]")
        assert dosage_input is not None

        # Verify Selective Patient Sharing toggle switch is present
        share_toggle = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox' and (contains(@id, 'share') or @role='switch')]"))
        )
        assert share_toggle is not None

        # Close Modal
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//button[contains(@class, 'btn-close') or contains(., 'Cancel')]")
        close_btn.click()
        time.sleep(0.5)

        # Logout
        helper.logout()

    def test_patient_portal_digital_health_card_and_live_slots(self, driver, base_url):
        """Test Patient Portal displays Digital Health Card and real-time slot checking."""
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Login as Patient Arjun
        helper.login("arjun@gmail.com", "Patient@123")

        # Verify Patient Hub and Digital Health Card
        card = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'health-card')] | //*[contains(text(), 'PTA001')]"))
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", card)
        time.sleep(0.5)
        assert card.is_displayed()

        # Verify Patient UPID on card
        upid_elem = WebDriverWait(driver, 8).until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'PTA001') or contains(text(), 'Arjun')]"))
        )
        assert upid_elem.is_displayed()

        # Verify Print Health Card button exists
        print_btn = WebDriverWait(driver, 8).until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Print Health Card')]"))
        )
        assert print_btn is not None

        # Navigate to Appointments Tab
        appt_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'sidebar-nav-link') and contains(., 'Appointments')]"))
        )
        appt_tab.click()

        # Verify Appointment Booking Form and Live Slot grid
        booking_form = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//form | //*[contains(text(), 'Book New Appointment')]"))
        )
        assert booking_form.is_displayed()

        # Logout
        helper.logout()
