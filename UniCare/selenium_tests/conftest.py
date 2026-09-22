import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions

def pytest_addoption(parser):
    parser.addoption(
        "--headed", action="store_true", default=False, help="Run browser in headed mode"
    )
    parser.addoption(
        "--browser", action="store", default="chrome", help="Browser to test: chrome or edge"
    )
    parser.addoption(
        "--base-url", action="store", default="http://localhost:5173", help="Base URL of frontend application"
    )

@pytest.fixture(scope="session")
def base_url(request):
    return request.config.getoption("--base-url").rstrip('/')

@pytest.fixture
def driver(request):
    browser_name = request.config.getoption("--browser").lower()
    is_headed = request.config.getoption("--headed")

    if browser_name == "chrome":
        options = ChromeOptions()
        if not is_headed:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,900")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--ignore-certificate-errors")
        driver_instance = webdriver.Chrome(options=options)
    elif browser_name == "edge":
        options = EdgeOptions()
        if not is_headed:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,900")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--ignore-certificate-errors")
        driver_instance = webdriver.Edge(options=options)
    else:
        raise ValueError(f"Unsupported browser: {browser_name}")

    driver_instance.implicitly_wait(6)

    # Make driver available on node for screenshot capture
    request.node.driver = driver_instance

    yield driver_instance

    try:
        driver_instance.quit()
    except Exception:
        pass

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        driver = getattr(item, "driver", None)
        if driver:
            screenshots_dir = os.path.join(os.path.dirname(__file__), "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)
            screenshot_path = os.path.join(screenshots_dir, f"FAIL_{item.name}.png")
            try:
                driver.save_screenshot(screenshot_path)
                print(f"\n[Screenshot saved to {screenshot_path}]")
            except Exception as e:
                print(f"\nFailed to save screenshot: {e}")
