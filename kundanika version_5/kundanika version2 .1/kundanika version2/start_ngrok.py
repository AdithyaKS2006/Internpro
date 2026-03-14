import os
import subprocess
import time
import json
import urllib.request
import re
import sys
import signal

def signal_handler(sig, frame):
    print('Stopping ngrok...')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def main():
    print("Starting ngrok...")
    # Start ngrok with the configuration file
    try:
        ngrok_process = subprocess.Popen(['./ngrok', 'start', '--config=ngrok.yml', '--all'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        print("Error: ./ngrok not found. Did the extraction fail?")
        return

    print("Waiting for ngrok to initialize...")
    time.sleep(5)
    
    try:
        # Get tunnels info
        req = urllib.request.Request('http://localhost:4040/api/tunnels')
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        frontend_url = None
        backend_url = None
        
        print("Active Tunnels:")
        for tunnel in data['tunnels']:
            print(f"- {tunnel['name']}: {tunnel['public_url']}")
            if tunnel['name'] == 'frontend' and tunnel['public_url'].startswith('https'):
                frontend_url = tunnel['public_url']
        
        # In proxy mode, frontend and backend share the same public URL
        backend_url = frontend_url 
        
        if not frontend_url:
            print("\nWARNING: Could not identify frontend HTTPS tunnel.")
            frontend_url = "NGROK_FRONTEND_NOT_FOUND"
            backend_url = "NGROK_FRONTEND_NOT_FOUND"

        # Update frontend .env
        frontend_env_path = 'frontend/.env'
        try:
            with open(frontend_env_path, 'r') as f:
                content = f.read()
            
            # For proxy setup, we still need REACT_APP_BACKEND_URL to point to the public URL
            if 'REACT_APP_BACKEND_URL=' in content:
                new_content = re.sub(r'REACT_APP_BACKEND_URL=.*', f'REACT_APP_BACKEND_URL={frontend_url}', content)
            else:
                new_content = content + f"\nREACT_APP_BACKEND_URL={frontend_url}\n"
            
            with open(frontend_env_path, 'w') as f:
                f.write(new_content)
            print(f"\nUpdated {frontend_env_path}")
        except Exception as e:
            print(f"Failed to update frontend env: {e}")

        # Update backend .env
        backend_env_path = 'backend/.env'
        try:
            with open(backend_env_path, 'r') as f:
                content = f.read()
            
            # Clean up the CORS origins line to avoid duplication
            if frontend_url:
                 if 'CORS_ORIGINS=' in content:
                    # Append strictly to the end of the line
                    new_content = re.sub(r'(CORS_ORIGINS=.*)', f'\\1,{frontend_url}', content)
                 else:
                    new_content = content + f"\nCORS_ORIGINS={frontend_url}\n"
                 
                 with open(backend_env_path, 'w') as f:
                    f.write(new_content)
                 print(f"Updated {backend_env_path}")

        except Exception as e:
            print(f"Failed to update backend env: {e}")

        print("\n" + "="*50)
        print("NGROK SETUP COMPLETE")
        print(f"URL: {frontend_url}")
        print("="*50)
        print("\nIMPORTANT: NOW RESTART YOUR SERVERS (./run_app.sh) TO APPLY CHANGES.")
        print("Keep this script running to maintain the tunnels.")
        print("Press Ctrl+C to stop.")
        
        ngrok_process.wait()
        
    except Exception as e:
        print(f"An error occurred: {e}")
        ngrok_process.terminate()

if __name__ == "__main__":
    main()
