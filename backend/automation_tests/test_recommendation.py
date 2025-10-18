# automation_tests/test_recommendation.py

import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from test_logger import TestLogger as logger

@pytest.fixture
def driver():
    """A pytest fixture for browser setup and teardown."""
    logger.info("Setting up driver for Recommendation Test...")
    driver_instance = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    driver_instance.get("http://localhost:3000/")
    driver_instance.maximize_window()
    yield driver_instance
    time.sleep(3)
    driver_instance.quit()

def test_get_recommendation(driver):
    """
    Test case for the core recommendation functionality.
    """
    wait = WebDriverWait(driver, 20)
    logger.header("Starting Phone Recommendation Test")

    try:
        # --- 1. LOGIN ---
        logger.info("Step 1: Logging in with user 'admin'...")
        wait.until(EC.visibility_of_element_located((By.ID, "login-username"))).send_keys("admin")
        driver.find_element(By.ID, "login-password").send_keys("admin")
        login_button = driver.find_element(By.XPATH, "//form[.//input[@id='login-username']]//button[@type='submit']")
        driver.execute_script("arguments[0].click();", login_button)

        try:
            wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[text()='Get Phone Recommendation']")))
            logger.success("Login successful.")
        except TimeoutException:
            logger.fail("Login failed. Main application page did not load.")
            logger.warn("Ensure the user 'admin' with password 'pass' exists.")
            raise

        # --- 2. ADJUST FORM CONTROLS ---
        logger.info("Step 2: Adjusting recommendation controls...")
        wait.until(EC.presence_of_element_located((By.XPATH, "//select[@id='brand']/option[2]")))

        # FIX: Select the 'Samsung' option by its correctly capitalized visible text.
        brand_select = Select(driver.find_element(By.ID, "brand"))
        brand_select.select_by_visible_text("Samsung")
        logger.info("Selected Brand: Samsung")

        # Select the second OS in the list to keep it robust
        os_select = Select(driver.find_element(By.ID, "os"))
        os_select.select_by_index(1)
        selected_os = os_select.first_selected_option.text
        logger.info(f"Selected OS: {selected_os}")

        # --- 3. GET RECOMMENDATION ---
        logger.info("Step 3: Requesting recommendation...")
        recommend_button = driver.find_element(By.XPATH, "//button[text()='Get Recommendation']")
        driver.execute_script("arguments[0].scrollIntoView(true);", recommend_button)
        time.sleep(1)
        recommend_button.click()

        # --- 4. VERIFY RESULT ---
        logger.info("Step 4: Verifying result is displayed...")
        suggested_model_element = wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(., 'Suggested Model:')]")))
        
        assert "Suggested Model:" in suggested_model_element.text
        logger.test_passed("TEST PASSED: Recommendation was generated successfully.")

    except Exception as e:
        logger.fail(f"Test failed during execution: {e}")
        raise