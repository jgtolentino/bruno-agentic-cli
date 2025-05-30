#!/usr/bin/env python3
"""
ClaudeFlow Startup Script
Simple script to start the ClaudeFlow server with proper configuration
"""

import os
import sys
import subprocess
from pathlib import Path


def check_requirements():
    """Check if all requirements are installed"""
    try:
        import fastapi
        import aiohttp
        import google.oauth2.service_account
        import yaml
        import dotenv
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Please install requirements: pip install -r requirements.txt")
        return False


def check_environment():
    """Check environment configuration"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("❌ .env file not found")
        print("Please copy .env template and configure your API keys")
        return False
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    claude_key = os.getenv("CLAUDE_API_KEY")
    google_creds = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
    
    if not claude_key or claude_key == "your_claude_api_key_here":
        print("❌ CLAUDE_API_KEY not configured in .env")
        return False
    
    if not os.path.exists(google_creds):
        print(f"❌ Google credentials file not found: {google_creds}")
        print("Please download your service account credentials from Google Cloud Console")
        return False
    
    print("✅ Environment configuration looks good")
    return True


def check_flow_config():
    """Check if flow configuration exists"""
    config_file = Path("claudeflow.yaml")
    
    if not config_file.exists():
        print("❌ claudeflow.yaml not found")
        return False
    
    try:
        import yaml
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        
        if 'flows' not in config:
            print("❌ No flows defined in claudeflow.yaml")
            return False
        
        flow_count = len(config['flows'])
        print(f"✅ Found {flow_count} flows in configuration")
        return True
        
    except Exception as e:
        print(f"❌ Error reading claudeflow.yaml: {e}")
        return False


def start_server(host="0.0.0.0", port=8000, reload=True):
    """Start the FastAPI server"""
    try:
        print(f"🚀 Starting ClaudeFlow server on {host}:{port}")
        print(f"📖 API documentation will be available at http://localhost:{port}/docs")
        
        cmd = [
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", host,
            "--port", str(port)
        ]
        
        if reload:
            cmd.append("--reload")
        
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")


def main():
    """Main startup function"""
    print("🤖 ClaudeFlow Middleware System")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("main.py").exists():
        print("❌ main.py not found. Please run this script from the claudeflow directory")
        sys.exit(1)
    
    print("🔍 Checking system requirements...")
    
    if not check_requirements():
        sys.exit(1)
    
    if not check_environment():
        sys.exit(1)
    
    if not check_flow_config():
        sys.exit(1)
    
    print("\n✅ All checks passed! Starting server...")
    print("=" * 40)
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Start ClaudeFlow server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    
    args = parser.parse_args()
    
    start_server(
        host=args.host,
        port=args.port,
        reload=not args.no_reload
    )


if __name__ == "__main__":
    main()