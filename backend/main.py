"""
FraudGuard Backend API
FastAPI application for AI-powered fraud detection in NFT marketplace
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

# Note: These imports will work once dependencies are installed
try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    # Fallback for development without dependencies
    FastAPI = None
    HTTPException = None
    BackgroundTasks = None
    CORSMiddleware = None
    BaseModel = None
    uvicorn = None

try:
    # Try relative imports first (when running from backend directory)
    from core.config import settings, validate_sui_config, validate_ai_config
    from agent.listener import start_fraud_detection_service, stop_fraud_detection_service
    from agent.sui_client import sui_client
    from agent.fraud_detector import analyze_nft_for_fraud, NFTData
    from api.marketplace import router as marketplace_router
    from database.connection import create_tables
except ImportError:
    # Fallback to absolute imports (when running from project root)
    from backend.core.config import settings, validate_sui_config, validate_ai_config
    from backend.agent.listener import start_fraud_detection_service, stop_fraud_detection_service
    from backend.agent.sui_client import sui_client
    from backend.agent.fraud_detector import analyze_nft_for_fraud, NFTData
    from backend.api.marketplace import router as marketplace_router
    from backend.database.connection import create_tables

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Pydantic models for API
class NFTAnalysisRequest(BaseModel):
    """Request model for NFT analysis"""
    nft_id: str
    force_reanalysis: bool = False


class NFTAnalysisResponse(BaseModel):
    """Response model for NFT analysis"""
    nft_id: str
    is_fraud: bool
    confidence_score: float
    flag_type: int
    reason: str
    analysis_timestamp: str
    details: Dict


class FraudFlagResponse(BaseModel):
    """Response model for fraud flags"""
    flag_id: str
    nft_id: str
    flag_type: int
    confidence_score: int
    reason: str
    flagged_by: str
    flagged_at: int
    is_active: bool


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    sui_connected: bool
    ai_configured: bool
    fraud_detection_active: bool


# Background task for fraud detection service
fraud_detection_task = None


@asynccontextmanager
async def lifespan(app):
    """Application lifespan manager"""
    global fraud_detection_task

    logger.info("Starting FraudGuard backend...")

    # Create database tables
    create_tables()

    # Validate configuration
    if not validate_sui_config():
        logger.warning("Sui configuration incomplete - some features may not work")

    if not validate_ai_config():
        logger.warning("AI configuration incomplete - using mock analysis")

    # Start fraud detection service in background
    fraud_detection_task = asyncio.create_task(start_fraud_detection_service())

    yield

    # Cleanup
    logger.info("Shutting down FraudGuard backend...")
    if fraud_detection_task:
        fraud_detection_task.cancel()
    await stop_fraud_detection_service()


# Create FastAPI app
if FastAPI:
    app = FastAPI(
        title="FraudGuard API",
        description="AI-powered fraud detection for NFT marketplace",
        version="1.0.0",
        lifespan=lifespan
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include marketplace routes
    app.include_router(marketplace_router)
    
else:
    app = None
    logger.warning("FastAPI not available - running in mock mode")


# API Routes
if app:
    @app.get("/", response_model=Dict)
    async def root():
        """Root endpoint"""
        return {
            "message": "FraudGuard API",
            "version": "1.0.0",
            "status": "running"
        }

    @app.get("/health", response_model=HealthResponse)
    async def health_check():
        """Health check endpoint"""
        try:
            # Check Sui connection
            sui_connected = await sui_client.initialize() if sui_client else False

            return HealthResponse(
                status="healthy",
                version="1.0.0",
                sui_connected=sui_connected,
                ai_configured=validate_ai_config(),
                fraud_detection_active=fraud_detection_task is not None and not fraud_detection_task.done()
            )
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            raise HTTPException(status_code=500, detail="Health check failed")

    @app.post("/analyze-nft", response_model=NFTAnalysisResponse)
    async def analyze_nft(request: NFTAnalysisRequest):
        """Analyze an NFT for fraud indicators"""
        try:
            logger.info(f"Analyzing NFT: {request.nft_id}")

            # Get NFT data from blockchain
            nft_data = await sui_client.get_nft_data(request.nft_id)
            if not nft_data:
                raise HTTPException(status_code=404, detail="NFT not found")

            # Perform fraud analysis
            fraud_result = await analyze_nft_for_fraud(nft_data)

            return NFTAnalysisResponse(
                nft_id=request.nft_id,
                is_fraud=fraud_result.is_fraud,
                confidence_score=fraud_result.confidence_score,
                flag_type=fraud_result.flag_type,
                reason=fraud_result.reason,
                analysis_timestamp=str(asyncio.get_event_loop().time()),
                details=fraud_result.details
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error analyzing NFT {request.nft_id}: {e}")
            raise HTTPException(status_code=500, detail="Analysis failed")

    @app.get("/nft/{nft_id}/fraud-flags", response_model=List[FraudFlagResponse])
    async def get_fraud_flags(nft_id: str):
        """Get fraud flags for an NFT"""
        try:
            flags = await sui_client.get_fraud_flags_for_nft(nft_id)

            return [
                FraudFlagResponse(
                    flag_id=flag.flag_id,
                    nft_id=flag.nft_id,
                    flag_type=flag.flag_type,
                    confidence_score=flag.confidence_score,
                    reason=flag.reason,
                    flagged_by=flag.flagged_by,
                    flagged_at=flag.flagged_at,
                    is_active=flag.is_active
                )
                for flag in flags
            ]

        except Exception as e:
            logger.error(f"Error getting fraud flags for NFT {nft_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to get fraud flags")

    @app.post("/create-fraud-flag")
    async def create_fraud_flag(
        nft_id: str,
        flag_type: int,
        confidence_score: int,
        reason: str,
        background_tasks
    ):
        """Manually create a fraud flag (admin only)"""
        try:
            # This would typically require admin authentication
            flag_id = await sui_client.create_fraud_flag(
                nft_id=nft_id,
                flag_type=flag_type,
                confidence_score=confidence_score,
                reason=reason
            )

            if flag_id:
                return {"flag_id": flag_id, "status": "created"}
            else:
                raise HTTPException(status_code=500, detail="Failed to create fraud flag")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating fraud flag: {e}")
            raise HTTPException(status_code=500, detail="Failed to create fraud flag")


# Development server
if __name__ == "__main__":
    if uvicorn and app:
        uvicorn.run(
            "main:app",
            host=settings.api_host,
            port=settings.api_port,
            reload=settings.debug,
            log_level=settings.log_level.lower()
        )
    else:
        logger.error("FastAPI dependencies not available")
        print("Please install dependencies: pip install -r requirements.txt")