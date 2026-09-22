import os
import sys
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser(description="UniCare Selenium Test Runner")
    parser.add_argument("--headed", action="store_true", help="Run browser in visible/headed mode")
    parser.add_argument("--browser", default="chrome", choices=["chrome", "edge"], help="Browser to test (chrome or edge)")
    parser.add_argument("--test", default="", help="Specific test file or pattern to run")
    parser.add_argument("--base-url", default="http://localhost:5173", help="Base URL of UniCare frontend")
    args = parser.parse_args()

    # Step 1: Ensure test fixtures exist
    print("==================================================")
    print(" [1/2] Verifying and setting up test data fixtures...")
    print("==================================================")
    setup_script = os.path.join(os.path.dirname(__file__), "setup_test_data.py")
    result = subprocess.run([sys.executable, setup_script], capture_output=True, text=True)
    if result.returncode != 0:
        print("Warning during test data setup:")
        print(result.stderr)
    else:
        print(result.stdout.strip())

    # Step 2: Assemble pytest command
    print("\n==================================================")
    print(" [2/2] Running Selenium End-to-End Test Suite...")
    print(f" Browser: {args.browser.upper()} | Headed: {args.headed} | Base URL: {args.base_url}")
    print("==================================================\n")

    reports_dir = os.path.join(os.path.dirname(__file__), "reports")
    os.makedirs(reports_dir, exist_ok=True)
    report_file = os.path.join(reports_dir, "test_report.html")

    test_target = args.test if args.test else "selenium_tests"
    pytest_cmd = [
        sys.executable, "-m", "pytest",
        test_target,
        "-v",
        "--tb=short",
        f"--browser={args.browser}",
        f"--base-url={args.base_url}",
        f"--html={report_file}",
        "--self-contained-html"
    ]

    if args.headed:
        pytest_cmd.append("--headed")

    exit_code = subprocess.call(pytest_cmd)
    
    print("\n==================================================")
    if exit_code == 0:
        print(" [SUCCESS] All Selenium tests passed successfully!")
    else:
        print(f" [ALERT] Test suite exited with code: {exit_code}")
    print(f" [REPORT] Interactive HTML Test Report generated at:\n  {report_file}")
    print("==================================================")

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
