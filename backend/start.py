"""
Simple startup script for FraudGuard backend
Run this to test the backend without complex dependencies
"""
import os
import sys
import logging

# Add both the backend directory and project root to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_root)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'pydantic_settings',
        'httpx',
        # 'python-dotenv'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing required packages: {missing_packages}")
        logger.info("Install them with: pip install " + " ".join(missing_packages))
        return False
    
    return True

def check_optional_dependencies():
    """Check optional dependencies and warn if missing"""
    optional_packages = [
        ('langchain', 'LangChain integration'),
        ('langchain_google_genai', 'Google Gemini AI'),
        ('langgraph', 'LangGraph workflows')
    ]
    
    for package, description in optional_packages:
        try:
            __import__(package)
            logger.info(f"✓ {description} available")
        except ImportError:
            logger.warning(f"✗ {description} not available - install with: pip install {package}")

def main():
    """Main startup function"""
    logger.info("🚀 Starting FraudGuard Backend...")
    
    # Check dependencies
    if not check_dependencies():
        logger.error("❌ Cannot start - missing required dependencies")
        return False
    
    logger.info("✓ Required dependencies found")
    
    # Check optional dependencies
    check_optional_dependencies()
    
    # Check environment file
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(env_file):
        logger.warning("⚠️  No .env file found - copy .env.example to .env and configure")
    else:
        logger.info("✓ Environment file found")
    
    try:
        # Import and start the FastAPI app
        import uvicorn
        
        logger.info("🌟 Starting FastAPI server...")
        logger.info("📍 API will be available at: http://localhost:8000")
        logger.info("📚 API docs will be available at: http://localhost:8000/docs")
        
        # Start the server
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except ImportError as e:
        logger.error(f"❌ Failed to import main app: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
