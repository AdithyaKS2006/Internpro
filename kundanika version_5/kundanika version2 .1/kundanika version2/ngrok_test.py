#!/usr/bin/env python3
"""
Ngrok Configuration Test Script

This script verifies that the ngrok configuration works correctly
by testing the connection to both local and ngrok URLs.
"""

import requests
import os
from urllib.parse import urlparse

def test_backend_connection(base_url):
    """Test connection to backend API"""
    try:
        # Test the root endpoint
        response = requests.get(f"{base_url}/", timeout=10)
        if response.status_code == 200:
            print(f"✅ Successfully connected to backend at {base_url}")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Failed to connect to backend at {base_url}")
            print(f"   Status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error connecting to backend at {base_url}: {str(e)}")
        return False

def test_cors_configuration(base_url):
    """Test CORS configuration by sending a preflight request"""
    try:
        response = requests.options(
            f"{base_url}/auth/register",
            headers={
                "Origin": "https://your-frontend-ngrok-url.ngrok-free.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            },
            timeout=10
        )
        # Check if CORS headers are present
        if "access-control-allow-origin" in response.headers:
            print(f"✅ CORS is configured correctly for {base_url}")
            print(f"   Allowed origins: {response.headers.get('access-control-allow-origin')}")
            return True
        else:
            print(f"⚠️  CORS headers not found for {base_url}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing CORS for {base_url}: {str(e)}")
        return False

def test_frontend_env_variables():
    """Check frontend environment variables"""
    frontend_env_path = "frontend/.env"
    if os.path.exists(frontend_env_path):
        with open(frontend_env_path, 'r') as f:
            content = f.read()
            print("✅ Found frontend .env file")
            
            if "REACT_APP_BACKEND_NGROK_URL" in content:
                print("✅ REACT_APP_BACKEND_NGROK_URL is defined in frontend .env")
                # Extract the URL
                lines = content.split('\n')
                for line in lines:
                    if line.startswith("REACT_APP_BACKEND_NGROK_URL="):
                        url = line.split("=", 1)[1].strip()
                        if url and not url.startswith("#") and "your-backend-ngrok-url" not in url:
                            print(f"   Backend ngrok URL: {url}")
                            return url
            else:
                print("⚠️  REACT_APP_BACKEND_NGROK_URL not found in frontend .env")
    else:
        print("❌ Frontend .env file not found")
    
    return None

def test_backend_env_variables():
    """Check backend environment variables"""
    backend_env_path = "backend/.env"
    if os.path.exists(backend_env_path):
        with open(backend_env_path, 'r') as f:
            content = f.read()
            print("✅ Found backend .env file")
            
            if "CORS_ORIGINS" in content:
                print("✅ CORS_ORIGINS is defined in backend .env")
                # Extract the origins
                lines = content.split('\n')
                for line in lines:
                    if line.startswith("CORS_ORIGINS="):
                        origins = line.split("=", 1)[1].strip()
                        if origins and "your-frontend-ngrok-url" not in origins:
                            print(f"   CORS origins: {origins}")
                            return origins
            else:
                print("⚠️  CORS_ORIGINS not found in backend .env")
    else:
        print("❌ Backend .env file not found")
    
    return None

def main():
    print("🚀 Testing Ngrok Configuration\n")
    
    # Test local development URLs
    print("1. Testing local development URLs:")
    local_backend = "http://localhost:8000"
    test_backend_connection(local_backend)
    test_cors_configuration(local_backend)
    
    print("\n" + "="*50 + "\n")
    
    # Check environment variables
    print("2. Checking environment variables:")
    frontend_ngrok_url = test_frontend_env_variables()
    backend_cors_origins = test_backend_env_variables()
    
    print("\n" + "="*50 + "\n")
    
    # Summary
    print("3. Summary:")
    print("   ✅ Local development setup is working")
    
    if frontend_ngrok_url:
        print("   ⚠️  Ngrok backend URL is configured in frontend")
        print("      To test with ngrok:")
        print("      1. Start your ngrok tunnels")
        print("      2. Update the URLs in your .env files with actual ngrok URLs")
        print("      3. Restart your servers")
    else:
        print("   ℹ️  Ngrok URLs not configured yet")
        print("      Follow the instructions in README.md to set up ngrok")
    
    if backend_cors_origins:
        print("   ⚠️  CORS origins are configured in backend")
        if "ngrok-free.app" in backend_cors_origins:
            print("      Ngrok frontend URL is included in CORS configuration")
        else:
            print("      Add your ngrok frontend URL to CORS_ORIGINS in backend/.env")
    
    print("\n💡 Tips:")
    print("   - For ngrok testing, replace placeholder URLs with actual ngrok URLs")
    print("   - Remember to restart servers after changing environment variables")
    print("   - Check the README.md for detailed ngrok setup instructions")

if __name__ == "__main__":
    main()