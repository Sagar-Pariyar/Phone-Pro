# automation_tests/test_logger.py

class TestLogger:
    """A simple logger for beautifying terminal output during tests."""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m' # Red color for failures
    ENDC = '\033[0m'
    BOLD = '\033[1m'

    @staticmethod
    def header(message):
        print(f"\n{TestLogger.BOLD}{TestLogger.HEADER}===== {message} ====={TestLogger.ENDC}")

    @staticmethod
    def info(message):
        print(f"{TestLogger.OKBLUE}➡️  {message}{TestLogger.ENDC}")

    @staticmethod
    def success(message):
        print(f"{TestLogger.OKGREEN}✅ {message}{TestLogger.ENDC}")

    @staticmethod
    def fail(message): # FIX: Added the missing 'fail' method
        """Prints a red failure message."""
        print(f"{TestLogger.FAIL}❌ {message}{TestLogger.ENDC}")

    @staticmethod
    def test_passed(message):
        print(f"{TestLogger.BOLD}{TestLogger.OKGREEN}🚀 {message} 🚀{TestLogger.ENDC}")