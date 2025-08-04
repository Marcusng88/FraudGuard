"""
Configuration module for FraudGuard backend
Handles environment variables and application settings
"""
import os
from typing import Optional
from pydantic import Field
try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Configuration
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    debug: bool = Field(default=True, env="DEBUG")

    # Sui Blockchain Configuration
    sui_network: str = Field(default="testnet", env="SUI_NETWORK")
    sui_rpc_url: str = Field(
        default="https://fullnode.testnet.sui.io:443",
        env="SUI_RPC_URL"
    )
    sui_websocket_url: str = Field(
        default="wss://fullnode.testnet.sui.io:443",
        env="SUI_WEBSOCKET_URL"
    )

    # Smart Contract Addresses (set after deployment)
    marketplace_package_id: Optional[str] = Field(default=None, env="MARKETPLACE_PACKAGE_ID")
    nft_module_address: Optional[str] = Field(default=None, env="NFT_MODULE_ADDRESS")
    fraud_module_address: Optional[str] = Field(default=None, env="FRAUD_MODULE_ADDRESS")

    # AI Agent Configuration
    ai_agent_private_key: Optional[str] = Field(default=None, env="AI_AGENT_PRIVATE_KEY")
    ai_agent_address: Optional[str] = Field(default=None, env="AI_AGENT_ADDRESS")

    # Google AI Configuration (Gemini)
    google_api_key: Optional[str] = Field(default=None, env="GOOGLE_API_KEY")
    gemini_model: str = Field(default="gemini-pro-vision", env="GEMINI_MODEL")
    gemini_embedding_model: str = Field(default="models/embedding-001", env="GEMINI_EMBEDDING_MODEL")
    gemini_temperature: float = Field(default=0.1, env="GEMINI_TEMPERATURE")
    gemini_max_tokens: int = Field(default=1000, env="GEMINI_MAX_TOKENS")

    # Supabase Configuration
    supabase_url: Optional[str] = Field(default=None, env="SUPABASE_URL")
    supabase_key: Optional[str] = Field(default=None, env="SUPABASE_KEY")
    supabase_db_url: Optional[str] = Field(default=None, env="SUPABASE_DB_URL")
    supabase_db_password: Optional[str] = Field(default=None, env="SUPABASE_DB_PASSWORD")

    # Pinata IPFS Configuration
    pinata_api_key: Optional[str] = Field(default=None, env="PINATA_API_KEY")
    pinata_secret_api_key: Optional[str] = Field(default=None, env="PINATA_SECRET_API_KEY")
    pinata_jwt: Optional[str] = Field(default=None, env="PINATA_JWT")

    # Fraud Detection Configuration
    fraud_confidence_threshold: float = Field(default=0.7, env="FRAUD_CONFIDENCE_THRESHOLD")
    image_similarity_threshold: float = Field(default=0.85, env="IMAGE_SIMILARITY_THRESHOLD")
    max_nfts_per_wallet_per_hour: int = Field(default=10, env="MAX_NFTS_PER_WALLET_PER_HOUR")

    # Image Processing Configuration
    max_image_size_mb: int = Field(default=10, env="MAX_IMAGE_SIZE_MB")
    supported_image_formats: list = Field(
        default=["jpg", "jpeg", "png", "gif", "webp"],
        env="SUPPORTED_IMAGE_FORMATS"
    )

    # Monitoring and Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"  # Allow extra fields to prevent validation errors


# Global settings instance
settings = Settings()


# Validation functions
def validate_sui_config() -> bool:
    """Validate Sui blockchain configuration"""
    required_fields = [
        settings.marketplace_package_id,
        settings.ai_agent_private_key,
        settings.ai_agent_address
    ]
    return all(field is not None for field in required_fields)


def validate_ai_config() -> bool:
    """Validate AI configuration"""
    required_fields = [
        settings.google_api_key
    ]
    return all(field is not None for field in required_fields)


def validate_supabase_config() -> bool:
    """Validate Supabase configuration"""
    required_fields = [
        settings.supabase_url,
        settings.supabase_key,
        settings.supabase_db_url
    ]
    return all(field is not None for field in required_fields)


def get_contract_addresses() -> dict:
    """Get smart contract addresses"""
    return {
        "marketplace": settings.marketplace_package_id,
        "nft": settings.nft_module_address or f"{settings.marketplace_package_id}::nft",
        "fraud_flag": settings.fraud_module_address or f"{settings.marketplace_package_id}::fraud_flag"
    }


def get_fraud_detection_config() -> dict:
    """Get fraud detection configuration"""
    return {
        "confidence_threshold": settings.fraud_confidence_threshold,
        "image_similarity_threshold": settings.image_similarity_threshold,
        "max_nfts_per_wallet_per_hour": settings.max_nfts_per_wallet_per_hour,
        "max_image_size_mb": settings.max_image_size_mb,
        "supported_formats": settings.supported_image_formats
    }


def get_pinata_config() -> dict:
    """Get Pinata IPFS configuration"""
    return {
        "api_key": settings.pinata_api_key,
        "secret_api_key": settings.pinata_secret_api_key,
        "jwt": settings.pinata_jwt
    }


def get_vertex_ai_config() -> dict:
    """Get Vertex AI configuration"""
    return {
        "project_id": settings.PROJECT_ID,
        "location": settings.LOCATION,
        "api_key": settings.google_api_key,
        "model": settings.google_model
    }


def validate_pinata_config() -> bool:
    """Validate Pinata configuration"""
    required_fields = [
        settings.pinata_api_key,
        settings.pinata_secret_api_key,
        settings.pinata_jwt
    ]
    return all(field is not None for field in required_fields)


# Environment-specific configurations
DEVELOPMENT_CONFIG = {
    "debug": True,
    "log_level": "DEBUG",
    "fraud_confidence_threshold": 0.5,  # Lower threshold for testing
}

PRODUCTION_CONFIG = {
    "debug": False,
    "log_level": "INFO",
    "fraud_confidence_threshold": 0.8,  # Higher threshold for production
}

HACKATHON_CONFIG = {
    "debug": True,
    "log_level": "INFO",
    "fraud_confidence_threshold": 0.6,  # Balanced for demo
    "max_nfts_per_wallet_per_hour": 50,  # Higher limit for demo
}