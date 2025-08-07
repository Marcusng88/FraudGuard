"""
Authentication API endpoints for FraudGuard
Handles basic authentication flows
"""
import logging

try:
    from fastapi import APIRouter, HTTPException, Depends
    from pydantic import BaseModel
except ImportError:
    # Fallback for development without dependencies
    APIRouter = None
    HTTPException = None
    Depends = None
    BaseModel = None

logger = logging.getLogger(__name__)

# Create router if FastAPI is available
if APIRouter:
    router = APIRouter(prefix="/api/auth", tags=["authentication"])
else:
    router = None

# Basic authentication models can be added here if needed in the future
class AuthResponse(BaseModel):
    message: str
    success: bool

if router:
    @router.get("/health", response_model=AuthResponse)
    async def health_check():
        """
        Health check endpoint for authentication service
        """
        return AuthResponse(
            message="Authentication service is running",
            success=True
        ) 