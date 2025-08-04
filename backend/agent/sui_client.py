"""
Sui blockchain client for FraudGuard
Handles mock operations and data structures for Sui integration
Frontend handles actual Sui operations using TypeScript/JavaScript
"""
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

try:
    from core.config import settings, get_contract_addresses
except ImportError:
    from backend.core.config import settings, get_contract_addresses

logger = logging.getLogger(__name__)


@dataclass
class NFTData:
    """NFT data structure"""
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
    """Fraud flag data structure"""
    flag_id: str
    nft_id: str
    flag_type: int
    confidence_score: int
    reason: str
    flagged_by: str
    flagged_at: int
    is_active: bool


class FraudGuardSuiClient:
    """Mock Sui client for FraudGuard - Frontend handles actual Sui operations"""
    
    def __init__(self):
        self.client = None  # No actual client - frontend handles Sui operations
        self.contracts = get_contract_addresses()
        self.agent_address = settings.ai_agent_address
        
    async def initialize(self) -> bool:
        """Initialize mock client - always returns True since frontend handles Sui"""
        logger.info("Mock Sui client initialized - Frontend handles actual Sui operations")
        return True
    
    async def get_nft_data(self, object_id: str) -> Optional[NFTData]:
        """Get NFT data - returns mock data since frontend provides real data"""
        logger.info(f"Mock NFT data request for {object_id}")
        return NFTData(
            object_id=object_id,
            name="NFT Data from Frontend",
            description="Frontend provides actual NFT data",
            image_url="https://ipfs.pinata.cloud/ipfs/example",
            creator="0x123",
            created_at=int(datetime.now().timestamp() * 1000),
            metadata='{"source": "frontend"}',
            collection="Frontend Collection"
        )
    
    async def create_fraud_flag(
        self,
        nft_id: str,
        flag_type: int,
        confidence_score: int,
        reason: str,
        evidence_url: str = ""
    ) -> Optional[str]:
        """Mock fraud flag creation - frontend handles actual blockchain operations"""
        mock_flag_id = f"flag_{nft_id}_{int(datetime.now().timestamp())}"
        logger.info(f"Mock fraud flag created: {mock_flag_id} (Frontend handles actual creation)")
        return mock_flag_id
    
    async def get_fraud_flags_for_nft(self, nft_id: str) -> List[FraudFlagData]:
        """Get fraud flags - returns mock data"""
        logger.info(f"Mock fraud flags request for {nft_id}")
        return [
            FraudFlagData(
                flag_id=f"flag_{nft_id}_1",
                nft_id=nft_id,
                flag_type=1,
                confidence_score=85,
                reason="Potential plagiarism detected",
                flagged_by=self.agent_address or "0x123",
                flagged_at=int(datetime.now().timestamp() * 1000),
                is_active=True
            )
        ]
    
    async def listen_for_nft_events(self, callback):
        """Mock event listener - frontend notifies backend of new NFTs"""
        logger.info("Mock event listener started - Frontend will notify backend of new NFTs")
        # Just wait indefinitely - frontend will call backend APIs directly
        while True:
            await asyncio.sleep(3600)  # Sleep for 1 hour
    
    async def get_wallet_activity(self, wallet_address: str, hours: int = 24) -> Dict[str, Any]:
        """Get wallet activity - returns mock data since frontend provides real data"""
        logger.info(f"Mock wallet activity request for {wallet_address}")
        return {
            "nfts_minted": 3,
            "nfts_traded": 1,
            "total_volume": 1000000000,  # 1 SUI in MIST
            "unique_collections": 2,
            "time_period_hours": hours,
            "source": "frontend_provides_real_data"
        }
    
    async def close(self):
        """Close mock client"""
        logger.info("Mock Sui client closed")


# Global client instance
sui_client = FraudGuardSuiClient()


async def initialize_sui_client() -> bool:
    """Initialize the global Sui client"""
    return await sui_client.initialize()


async def get_sui_client() -> FraudGuardSuiClient:
    """Get the global Sui client instance"""
    return sui_client
