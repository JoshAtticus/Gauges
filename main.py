import subprocess
import sys
import os
from importlib.metadata import distributions
import ctypes

def install_packages(requirements_path='requirements.txt'):
    try:
        with open(requirements_path, 'r') as f:
            packages = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Error: {requirements_path} not found.")
        sys.exit(1)

    installed_packages = {dist.metadata['name'].lower().replace('-', '_') for dist in distributions()}

    for package in packages:
        if package.lower().replace('-', '_') not in installed_packages:
            print(f"Installing {package}...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            except subprocess.CalledProcessError as e:
                print(f"Failed to install {package}: {e}")
                sys.exit(1)

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

if __name__ == "__main__":
    if not is_admin():
        # Re-run the script with admin rights
        print("Requesting administrator privileges...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        print("Success (?) Opening in new window and exiting, if new window doesn't open it's because you pressed No on the last prompt.")
        print("You may now close this window.")
        sys.exit(0)

    install_packages()
    print("Starting application...")
    try:
        env = os.environ.copy()
        env["RUN_BY_MAIN"] = "true"
        subprocess.run([sys.executable, "app.py"], check=True, env=env)
    except FileNotFoundError:
        print("Error: app.py not found.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"Application failed to start: {e}")
        sys.exit(1)
