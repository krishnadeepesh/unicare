import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_tests.helpers import UniCareHelper

class TestLandingPage:

    def test_landing_page_branding_and_hero(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Verify page title or navbar brand
        navbar_brand = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".navbar-brand-unicare"))
        )
        assert "UniCare" in navbar_brand.text

        # Verify Hero headline
        hero_title = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//h1[contains(., 'Smarter Healthcare Starts With')]"))
        )
        assert "UniCare" in hero_title.text

    def test_landing_page_nav_links(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Find navbar navigation links
        nav_links = driver.find_elements(By.CSS_SELECTOR, ".nav-link-unicare")
        link_texts = [link.text.strip() for link in nav_links if link.text.strip()]
        
        assert "Home" in link_texts
        assert "Features" in link_texts
        assert "About" in link_texts

    def test_features_section_displayed(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        features_section = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "features"))
        )
        assert features_section.is_displayed()

        # Verify at least one feature card exists
        feature_cards = driver.find_elements(By.CSS_SELECTOR, ".careplus-card")
        assert len(feature_cards) >= 4

    def test_open_and_close_auth_modal(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        # Click Login button
        login_nav_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//nav//button[contains(., 'Login')]"))
        )
        login_nav_btn.click()

        # Verify modal opened
        modal = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".auth-overlay"))
        )
        assert modal.is_displayed()

        # Close modal
        close_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".auth-overlay-close"))
        )
        close_btn.click()

        # Verify modal dismissed
        WebDriverWait(driver, 10).until(
            EC.invisibility_of_element_located((By.CSS_SELECTOR, ".auth-overlay"))
        )

    def test_get_started_button_triggers_login(self, driver, base_url):
        helper = UniCareHelper(driver, base_url)
        helper.open_home()

        get_started_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Get Started')]"))
        )
        get_started_btn.click()

        # Modal should appear
        login_header = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//h3[contains(text(), 'UniCare Login')]"))
        )
        assert login_header.is_displayed()
