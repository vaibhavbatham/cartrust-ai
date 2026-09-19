import os
import sys
import subprocess
import time
import signal

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, 'backend')
frontend_dir = os.path.join(base_dir, 'frontend')
mock_dir = os.path.join(base_dir, 'mock-providers')

def main():
    print("=" * 60)
    print("            CarTrust AI Local Development Runner")
    print("=" * 60)
    print("1. Initializing SQLite/Postgres and Seeding Demo Vehicles...")

    # Seed demo data if needed
    subprocess.run([sys.executable, os.path.join(base_dir, 'scripts', 'seed_demo.py')], check=True)

    print("\n2. Launching Services:")
    print("   • Backend API:        http://localhost:8000 (Docs: /docs)")
    print("   • Mock Issuer Gateway: http://localhost:8001")
    print("   • Frontend Web App:   http://localhost:5173")
    print("\nPress Ctrl+C to terminate all services.\n")

    env = os.environ.copy()
    env["PYTHONPATH"] = f"{backend_dir};{base_dir}"
    nodejs_dir = r"C:\Program Files\nodejs"
    if os.path.exists(nodejs_dir) and nodejs_dir not in env.get("PATH", ""):
        env["PATH"] = f"{nodejs_dir};" + env.get("PATH", "")

    procs = []
    try:
        # Start Mock Provider on 8001
        p_mock = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8001"],
            cwd=mock_dir,
            env=env
        )
        procs.append(p_mock)

        # Start FastAPI backend on 8000
        p_backend = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            cwd=backend_dir,
            env=env
        )
        procs.append(p_backend)

        # Start Vite dev server on 5173
        p_frontend = subprocess.Popen(
            "npx vite",
            cwd=frontend_dir,
            env=env,
            shell=True
        )
        procs.append(p_frontend)

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down CarTrust AI services...")
        for p in procs:
            p.terminate()
        sys.exit(0)

if __name__ == '__main__':
    main()
