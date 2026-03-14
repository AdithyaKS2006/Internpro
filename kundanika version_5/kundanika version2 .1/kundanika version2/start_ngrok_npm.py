import os
import sys
import time
import re
import subprocess
import json

def main():
    # Set authtoken using command line since we use the binary directly
    token = "377T5gdXj6qsacw3OV9e6cbXrfk_XSeR7sMAEbsZJ8bng9c1"
    
    # Path to ngrok binary from npm install
    ngrok_path = "./node_modules/.bin/ngrok"
    
    if not os.path.exists(ngrok_path):
        print(f"Error: {ngrok_path} not found. Did npm install fail?")
        return

    print("Configuring authtoken...")
    subprocess.run([ngrok_path, "config", "add-authtoken", token], check=True)

    print("Starting ngrok tunnels...")
    # Start all tunnels defined in ngrok.yml
    # We need a valid ngrok.yml first
    if not os.path.exists("ngrok.yml"):
        print("Error: ngrok.yml not found.")
        return

    try:
        ngrok_process = subprocess.Popen([ngrok_path, "start", "--config=ngrok.yml", "--all"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        print("Waiting for ngrok initialization...")
        time.sleep(5)
        
        # Get tunnels info
        import urllib.request
        try:
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
                elif tunnel['name'] == 'backend' and tunnel['public_url'].startswith('https'):
                    backend_url = tunnel['public_url']
            
            if not frontend_url or not backend_url:
                print("Could not find both tunnels. Please check.")
                return

            # Update frontend .env
            frontend_env_path = 'frontend/.env'
            try:
                with open(frontend_env_path, 'r') as f:
                    content = f.read()
                
                if 'REACT_APP_BACKEND_URL=' in content:
                    new_content = re.sub(r'REACT_APP_BACKEND_URL=.*', f'REACT_APP_BACKEND_URL={backend_url}', content)
                else:
                    new_content = content + f"\nREACT_APP_BACKEND_URL={backend_url}\n"
                
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
                
                if f'{frontend_url}' not in content:
                     if 'CORS_ORIGINS=' in content:
                        new_content = re.sub(r'(CORS_ORIGINS=.*)', f'\\1,{frontend_url},{backend_url}', content)
                     else:
                        new_content = content + f"\nCORS_ORIGINS={frontend_url},{backend_url}\n"
                     
                     with open(backend_env_path, 'w') as f:
                        f.write(new_content)
                     print(f"Updated {backend_env_path}")
                else:
                    print(f"Backend env already contains {frontend_url}")

            except Exception as e:
                print(f"Failed to update backend env: {e}")

            print("\n" + "="*50)
            print("NGROK SETUP COMPLETE")
            print("="*50)
            print("Keep this script running.")
            print("Press Ctrl+C to stop.")
            
            ngrok_process.wait()

        except Exception as e:
            print(f"Error checking tunnels: {e}")
            ngrok_process.terminate()

    except Exception as e:
        print(f"Error starting ngrok: {e}")

if __name__ == "__main__":
    main()
