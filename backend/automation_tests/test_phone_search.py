# automation_tests/test_phone_search.py

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
    """A pytest fixture to set up and tear down the WebDriver for each test."""
    logger.info("Setting up driver for Phone Search Test...")
    driver_instance = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    driver_instance.get("http://localhost:3000/")
    driver_instance.maximize_window()
    yield driver_instance
    time.sleep(3)
    driver_instance.quit()

def test_phone_search_and_details(driver):
    wait = WebDriverWait(driver, 20)
    logger.header("Starting Phone Search & Details Test")

    try:
        # --- 1. LOGIN ---
        logger.info("Step 1: Logging in with user 'admin'...")
        wait.until(EC.visibility_of_element_located((By.ID, "login-username"))).send_keys("admin")
        driver.find_element(By.ID, "login-password").send_keys("admin")
        
        # FIX: Using the more specific and reliable button locator from the authentication test.
        login_button = driver.find_element(By.XPATH, "//form[.//input[@id='login-username']]//button[@type='submit']")
        driver.execute_script("arguments[0].click();", login_button)

        # Verify login was successful.
        try:
            wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[text()='Search Phone Details']")))
            logger.success("Login successful.")
        except TimeoutException:
            logger.fail("Login failed. The main application page did not load.")
            logger.warn("Ensure the user 'admin' with password 'pass' exists.")
            raise

        # --- 2. SEARCH FOR PHONE ---
        logger.info("Step 2: Waiting for phone list to populate...")
        first_option = wait.until(
            EC.presence_of_element_located((By.XPATH, "//select[@id='phone-select']/option[2]"))
        )
        phone_to_search = first_option.text
        logger.success(f"Phone list populated. Selecting first available phone: '{phone_to_search}'")
        phone_select = Select(driver.find_element(By.ID, "phone-select"))
        phone_select.select_by_visible_text(phone_to_search)

        # --- 3. VERIFY DETAILS ---
        logger.info("Step 3: Verifying that details are displayed correctly...")
        model_name_element = wait.until(EC.visibility_of_element_located((By.XPATH, "//dt[text()='model']/following-sibling::dd")))
        assert model_name_element.text.lower() == phone_to_search.lower()
        logger.success(f"Verified model name: '{model_name_element.text}' is correct.")
        
        price_element = driver.find_element(By.XPATH, "//dt[text()='price']")
        assert price_element.is_displayed()
        logger.success("Verified that the 'price' field is also displayed.")
        
        logger.test_passed("TEST PASSED: Phone search and detail view works correctly.")

    except Exception as e:
        logger.fail(f"Test failed during execution: {e}")
        raise