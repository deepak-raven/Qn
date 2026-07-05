import os
import sys
import subprocess
import time

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    is_windows = os.name == 'nt'

    # 1. Determine Backend command
    if is_windows:
        backend_python = os.path.join(root_dir, '.venv', 'Scripts', 'python.exe')
    else:
        backend_python = os.path.join(root_dir, '.venv', 'bin', 'python')

    # Fallback to system python if venv python doesn't exist
    if not os.path.exists(backend_python):
        print(f"Virtual environment python not found at {backend_python}. Using system python.")
        backend_python = sys.executable

    backend_script = os.path.join(root_dir, 'backend', 'run.py')
    backend_cmd = [backend_python, backend_script]

    # 2. Determine Frontend command
    # npm needs shell=True or npm.cmd on Windows to resolve properly
    frontend_cmd = ['npm', 'run', 'dev']

    print("=" * 60)
    print("Starting backend and frontend services...")
    print(f"Backend CMD:  {' '.join(backend_cmd)}")
    print(f"Frontend CMD: {' '.join(frontend_cmd)}")
    print("=" * 60)

    processes = []
    try:
        # Start backend
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=os.path.join(root_dir, 'backend'),
            shell=is_windows
        )
        processes.append(('Backend', backend_proc))
        
        # Start frontend
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=os.path.join(root_dir, 'frontend'),
            shell=is_windows
        )
        processes.append(('Frontend', frontend_proc))

        # Keep running and monitor process health
        while True:
            for name, proc in processes:
                ret = proc.poll()
                if ret is not None:
                    print(f"\n[Run Script] {name} process stopped with exit code {ret}.")
                    raise KeyboardInterrupt
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[Run Script] Stopping all services...")
        for name, proc in processes:
            if proc.poll() is None:
                print(f"Stopping {name}...")
                try:
                    if is_windows:
                        # Use taskkill to kill the whole process tree (so node/vite subprocesses are terminated)
                        subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        proc.terminate()
                except Exception as e:
                    print(f"Error stopping {name}: {e}")

        # Wait for all processes to close
        for name, proc in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(f"Forcing exit on {name}...")
                try:
                    if is_windows:
                        subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        proc.kill()
                except:
                    pass
        print("[Run Script] All services stopped.")

if __name__ == '__main__':
    main()
