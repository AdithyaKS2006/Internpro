import os
import sys
import time
import re
from pyngrok import ngrok, conf

def main():
    # Set authtoken
    token = "377T5gdXj6qsacw3OV9e6cbXrfk_XSeR7sMAEbsZJ8bng9c1"
    pyngrok_config = conf.PyngrokConfig(auth_token=token)
    conf.set_default(pyngrok_config)

    print("Starting ngrok tunnels via pyngrok...")
    
    try:
        # Start tunnels
        # Note: pyngrok manages the binary for us.
        frontend_tunnel = ngrok.connect(3000, "http")
        backend_tunnel = ngrok.connect(8000, "http")
        
        frontend_url = frontend_tunnel.public_url
        backend_url = backend_tunnel.public_url

        print(f"Frontend URL: {frontend_url}")
        print(f"Backend URL: {backend_url}")

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
        
        # Keep alive
        ngrok_process = ngrok.get_ngrok_process()
        ngrok_process.proc.wait()
        
    except Exception as e:
        print(f"Error: {e}")
        print("Killing ngrok process...")
        ngrok.kill()

if __name__ == "__main__":
    main()
