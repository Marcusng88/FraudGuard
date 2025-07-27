"""
Sui blockchain client for FraudGuard
Handles interactions with Sui network including reading NFT data and writing fraud flags
"""
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# Note: These imports will work once dependencies are installed
try:
    from pysui import SuiClient, SuiConfig
    from pysui.sui.sui_txn import SuiTransaction
    from pysui.sui.sui_types import ObjectID, SuiAddress
except ImportError:
    # Fallback for development without dependencies
    SuiClient = None
    SuiConfig = None

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
    """Enhanced Sui client for FraudGuard operations"""
    
    def __init__(self):
        self.client = None
        self.config = None
        self.contracts = get_contract_addresses()
        self.agent_address = settings.ai_agent_address
        self.agent_private_key = settings.ai_agent_private_key
        
    async def initialize(self) -> bool:
        """Initialize Sui client connection"""
        try:
            if SuiClient is None:
                logger.warning("PySui not installed, using mock client")
                return True
                
            # Initialize Sui configuration
            self.config = SuiConfig.user_config(
                rpc_url=settings.sui_rpc_url,
                ws_url=settings.sui_websocket_url
            )
            
            # Create client
            self.client = SuiClient(self.config)
            
            # Test connection
            await self.client.get_chain_identifier()
            logger.info(f"Connected to Sui {settings.sui_network}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Sui client: {e}")
            return False
    
    async def get_nft_data(self, object_id: str) -> Optional[NFTData]:
        """Get NFT data from blockchain"""
        try:
            if not self.client:
                # Mock data for development
                return NFTData(
                    object_id=object_id,
                    name="Mock NFT",
                    description="Mock NFT for testing",
                    image_url="https://example.com/mock.png",
                    creator="0x123",
                    created_at=int(datetime.now().timestamp() * 1000),
                    metadata='{"trait": "mock"}',
                    collection="Mock Collection"
                )
            
            # Get object data from Sui
            result = await self.client.get_object(
                object_id=ObjectID(object_id),
                options={"showContent": True, "showType": True}
            )
            
            if not result.result_data:
                return None
                
            obj_data = result.result_data
            content = obj_data.content
            
            # Extract NFT fields
            fields = content.fields
            return NFTData(
                object_id=object_id,
                name=fields.get("name", ""),
                description=fields.get("description", ""),
                image_url=fields.get("image_url", ""),
                creator=fields.get("creator", ""),
                created_at=fields.get("created_at", 0),
                metadata=fields.get("metadata", "{}"),
                collection=fields.get("collection", "")
            )
            
        except Exception as e:
            logger.error(f"Error getting NFT data for {object_id}: {e}")
            return None
    
    async def create_fraud_flag(
        self,
        nft_id: str,
        flag_type: int,
        confidence_score: int,
        reason: str,
        evidence_url: str = ""
    ) -> Optional[str]:
        """Create a fraud flag on-chain"""
        try:
            if not self.client:
                # Mock transaction for development
                mock_flag_id = f"flag_{nft_id}_{int(datetime.now().timestamp())}"
                logger.info(f"Mock fraud flag created: {mock_flag_id}")
                return mock_flag_id
            
            # Create transaction
            txn = SuiTransaction(client=self.client)
            
            # Call create_fraud_flag function
            txn.move_call(
                target=f"{self.contracts['fraud_flag']}::create_fraud_flag",
                arguments=[
                    # Registry object (would need to be fetched)
                    "0x...",  # registry_id
                    # Agent capability (would need to be fetched)
                    "0x...",  # agent_cap_id
                    nft_id,
                    flag_type,
                    confidence_score,
                    reason.encode('utf-8'),
                    evidence_url.encode('utf-8')
                ]
            )
            
            # Sign and execute transaction
            result = await txn.execute(
                signer=self.agent_private_key,
                gas_budget=10000000
            )
            
            if result.is_success():
                # Extract flag ID from transaction result
                flag_id = self._extract_flag_id_from_result(result)
                logger.info(f"Fraud flag created successfully: {flag_id}")
                return flag_id
            else:
                logger.error(f"Failed to create fraud flag: {result.error}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating fraud flag: {e}")
            return None
    
    async def get_fraud_flags_for_nft(self, nft_id: str) -> List[FraudFlagData]:
        """Get all fraud flags for an NFT"""
        try:
            if not self.client:
                # Mock data for development
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
            
            # Query fraud flags from registry
            # This would involve calling view functions on the fraud_flag module
            # Implementation depends on specific Sui query patterns
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting fraud flags for NFT {nft_id}: {e}")
            return []
    
    async def listen_for_nft_events(self, callback):
        """Listen for NFT minting events"""
        try:
            if not self.client:
                logger.info("Mock event listener started")
                # Mock event for development
                await asyncio.sleep(5)
                mock_event = {
                    "type": "NFTMinted",
                    "nft_id": "0x123abc",
                    "creator": "0x456def",
                    "name": "Test NFT",
                    "image_url": "https://example.com/test.png"
                }
                await callback(mock_event)
                return
            
            # Subscribe to events
            subscription = await self.client.subscribe_event(
                event_filter={
                    "Package": self.contracts["marketplace"]
                }
            )
            
            async for event in subscription:
                if "NFTMinted" in event.type:
                    await callback(event.parsed_json)
                    
        except Exception as e:
            logger.error(f"Error in event listener: {e}")
    
    def _extract_flag_id_from_result(self, result) -> str:
        """Extract fraud flag ID from transaction result"""
        try:
            # Parse transaction result to find created object ID
            # This is a simplified implementation
            for change in result.object_changes:
                if change.type == "created" and "FraudFlag" in change.object_type:
                    return change.object_id
            return "unknown"
        except Exception:
            return "unknown"
    
    async def get_wallet_activity(self, wallet_address: str, hours: int = 24) -> Dict[str, Any]:
        """Get wallet activity for suspicious behavior detection"""
        try:
            if not self.client:
                # Mock data for development
                return {
                    "nfts_minted": 3,
                    "nfts_traded": 1,
                    "total_volume": 1000000000,  # 1 SUI in MIST
                    "unique_collections": 2,
                    "time_period_hours": hours
                }
            
            # Query wallet transactions and activities
            # This would involve analyzing transaction history
            
            return {
                "nfts_minted": 0,
                "nfts_traded": 0,
                "total_volume": 0,
                "unique_collections": 0,
                "time_period_hours": hours
            }
            
        except Exception as e:
            logger.error(f"Error getting wallet activity for {wallet_address}: {e}")
            return {}
    
    async def close(self):
        """Close client connections"""
        if self.client:
            await self.client.close()
            logger.info("Sui client connection closed")


# Global client instance
sui_client = FraudGuardSuiClient()


async def initialize_sui_client() -> bool:
    """Initialize the global Sui client"""
    return await sui_client.initialize()


async def get_sui_client() -> FraudGuardSuiClient:
    """Get the global Sui client instance"""
    return sui_client
