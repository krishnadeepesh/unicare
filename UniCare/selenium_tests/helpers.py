import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class UniCareHelper:
    def __init__(self, driver, base_url="http://localhost:5173"):
        self.driver = driver
        self.base_url = base_url

    def open_home(self):
        """Navigate to UniCare home and ensure clean guest state."""
        self.driver.get(self.base_url)
        # Clear storage and reload to start clean
        self.driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'UniCare')]"))
        )

    def open_login_modal(self):
        """Click the Login button in navbar or hero to open modal."""
        # Find Login button
        login_btn = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//nav//button[contains(., 'Login')] | //button[contains(., 'Get Started')]"))
        )
        login_btn.click()
        # Wait for modal overlay / form
        WebDriverWait(self.driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'auth-card')]//h3[contains(text(), 'UniCare Login')]"))
        )

    def login(self, identifier, password):
        """Perform full login with given identifier and password."""
        self.open_login_modal()

        # Find identifier input specifically inside auth-card
        ident_input = WebDriverWait(self.driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'auth-card')]//form//input[@type='text']"))
        )
        ident_input.clear()
        ident_input.send_keys(identifier)

        # Find password input inside auth-card
        pw_input = WebDriverWait(self.driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'auth-card')]//form//input[@type='password']"))
        )
        pw_input.clear()
        pw_input.send_keys(password)

        # Click submit button inside auth-card
        submit_btn = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'auth-card')]//form//button[@type='submit']"))
        )
        # Scroll submit button into view if needed and click
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)
        time.sleep(0.3)
        submit_btn.click()

    def wait_for_text(self, text, timeout=10):
        """Wait for specific text to appear anywhere on the page."""
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{text}')]"))
        )

    def logout(self):
        """Logout using the sign-out button in header / profile menu."""
        try:
            profile_btn = self.driver.find_elements(By.XPATH, "//button[@aria-label='User session menu'] | //header[contains(@class, 'portal-topbar')]//button[contains(@class, 'btn-link')]")
            if profile_btn and profile_btn[0].is_displayed():
                profile_btn[0].click()
                time.sleep(0.5)

            logout_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]"))
            )
            logout_btn.click()

            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Smarter Healthcare Starts With')]"))
            )
        except Exception:
            self.driver.execute_script("localStorage.clear(); sessionStorage.clear(); window.location.href = '/';")
            time.sleep(1)
