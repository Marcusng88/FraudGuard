"""
Sui blockchain client for FraudGuard
Data structures and interfaces for Sui integration
All actual Sui operations are handled by the frontend using TypeScript/JavaScript
"""
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class NFTData:
    """NFT data structure for backend processing"""
    object_id: str
    name: str
    description: str
    image_url: str
    creator: str
    created_at: int
    metadata: str
    collection: str


@dataclass
class FraudFlagData:
    """Fraud flag data structure for backend processing"""
    flag_id: str
    nft_id: str
    flag_type: int
    confidence_score: int
    reason: str
    flagged_by: str
    flagged_at: int
    is_active: bool


class FraudGuardSuiClient:
    """
    Sui client interface for FraudGuard
    Note: All actual Sui operations are handled by the frontend
    This class provides data structures and interfaces for backend processing
    """
    
    def __init__(self):
        logger.info("Sui client interface initialized - Frontend handles actual Sui operations")
        
    async def initialize(self) -> bool:
        """Initialize interface - always returns True since frontend handles Sui"""
        logger.info("Sui client interface ready - Frontend handles actual Sui operations")
        return True


# Global client instance
sui_client = FraudGuardSuiClient()


async def initialize_sui_client() -> bool:
    """Initialize the global Sui client"""
    return await sui_client.initialize()


async def get_sui_client() -> FraudGuardSuiClient:
    """Get the global Sui client instance"""
    return sui_client
