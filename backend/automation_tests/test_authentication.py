# automation_tests/test_authentication.py

import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from test_logger import TestLogger as logger

@pytest.fixture
def driver():
    """A pytest fixture to set up and tear down the WebDriver for each test."""
    # --- Setup ---
    driver_instance = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    driver_instance.get("http://localhost:3000/")
    driver_instance.maximize_window()
    yield driver_instance  # Provide the driver instance to the test
    # --- Teardown ---
    time.sleep(2)
    driver_instance.quit()

@pytest.mark.parametrize("test_run_number", range(1, 11))
def test_full_authentication_flow(driver, test_run_number):
    """
    Performs a full user journey: Signup -> Login -> Logout.
    This test is parameterized to run 10 times.
    """
    wait = WebDriverWait(driver, 15)
    logger.header(f"Starting Test Run {test_run_number}/10")

    # --- 1. SIGNUP ---
    logger.info("Step 1: Signing up a new user...")
    wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Sign Up']"))).click()

    unique_username = f"testuser_{int(time.time())}"
    driver.find_element(By.ID, "signup-username").send_keys(unique_username)
    driver.find_element(By.ID, "signup-email").send_keys(f"{unique_username}@example.com")
    driver.find_element(By.ID, "signup-password").send_keys("password123")
    driver.find_element(By.ID, "signup-confirm").send_keys("password123")
    driver.find_element(By.XPATH, "//form[.//input[@id='signup-username']]//button[@type='submit']").click()
    
    # Verify signup by checking that the UI switched back to the login form
    login_username_field = wait.until(EC.visibility_of_element_located((By.ID, "login-username")))
    assert login_username_field.is_displayed()
    logger.success("Signup successful, UI switched to login form.")

    # --- 2. LOGIN ---
    logger.info("Step 2: Logging in with the new user...")
    login_username_field.send_keys(unique_username)
    driver.find_element(By.ID, "login-password").send_keys("password123")
    login_button = driver.find_element(By.XPATH, "//form[.//input[@id='login-username']]//button[@type='submit']")
    driver.execute_script("arguments[0].click();", login_button)

    # Verify login by checking for the welcome message
    welcome_header = wait.until(
        EC.visibility_of_element_located((By.XPATH, f"//span[contains(., 'Signed in as {unique_username}')]"))
    )
    assert welcome_header.is_displayed()
    logger.success("Login successful, main application page is visible.")

    # --- 3. LOGOUT ---
    logger.info("Step 3: Logging out...")
    logout_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
    logout_button.click()

    # Verify logout by checking for the login form's username field again
    logout_confirmation = wait.until(EC.visibility_of_element_located((By.ID, "login-username")))
    assert logout_confirmation.is_displayed()
    logger.success("Logout successful, authentication page is visible.")