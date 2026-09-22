import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestAuthentication:

    def test_invalid_login_shows_error(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()
        helper.login("nonexistent_user@unicare.test", "WrongPassword123!")

        # Verify error alert is displayed specifically inside the auth modal
        alert = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'auth-card')]//div[contains(@class, 'alert-danger')]"))
        )
        assert alert.is_displayed()
        assert len(alert.text.strip()) > 0

    def test_switch_between_login_and_register(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()
        helper.open_login_modal()

        # Click "Register Account" link inside auth card
        register_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'auth-card')]//button[contains(., 'Register Account')]"))
        )
        register_link.click()

        # Check for Register view heading
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//h3[contains(text(), 'Hospital Admin Registration')]"))
        )

        # Switch back to Login using "Go to Login" button
        back_to_login_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Go to Login') or contains(., 'Sign In')]"))
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", back_to_login_btn)
        back_to_login_btn.click()

        # Verify login form is visible again
        login_header = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'auth-card')]//h3[contains(text(), 'UniCare Login')]"))
        )
        assert login_header.is_displayed()

    def test_forgot_password_lookup_nonexistent_user(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()
        helper.open_login_modal()

        # Click "Forgot Password?" inside auth card
        forgot_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'auth-card')]//button[contains(text(), 'Forgot Password?')]"))
        )
        forgot_btn.click()

        # Enter nonexistent identifier in recovery modal
        recovery_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//input[@type='text']"))
        )
        recovery_input.clear()
        recovery_input.send_keys("ghost_user_9999@example.com")

        # Submit lookup using "Continue" button in recovery modal
        find_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'modal')]//button[@type='submit' and contains(., 'Continue')]"))
        )
        find_btn.click()

        # Verify error message shows account not found
        error_elem = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'modal')]//div[contains(@class, 'alert-danger')]"))
        )
        assert error_elem.is_displayed()
