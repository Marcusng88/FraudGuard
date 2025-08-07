"""
Sui blockchain event listener for FraudGuard
Listens for NFT minting events and triggers fraud detection analysis
"""
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

try:
    from core.config import settings
    from agent.sui_client import sui_client, NFTData
    from agent.fraud_detector import analyze_nft_for_fraud, NFTData as FraudDetectorNFTData
    from agent.supabase_client import supabase_client
except ImportError:
    from backend.core.config import settings
    from backend.agent.sui_client import sui_client, NFTData
    from backend.agent.fraud_detector import analyze_nft_for_fraud, NFTData as FraudDetectorNFTData
    from backend.agent.supabase_client import supabase_client

logger = logging.getLogger(__name__)


class SuiEventListener:
    """Listens for Sui blockchain events and processes them"""

    def __init__(self):
        self.is_running = False
        self.processed_events = set()  # Track processed events to avoid duplicates

    async def start_listening(self):
        """Start listening for blockchain events"""
        logger.info("Starting Sui event listener...")
        self.is_running = True

        try:
            # Initialize Sui client
            if not await sui_client.initialize():
                logger.error("Failed to initialize Sui client")
                return

            # Initialize Supabase client
            if not await supabase_client.initialize():
                logger.warning("Failed to initialize Supabase client - continuing without vector DB")

            # Start listening for NFT events
            await sui_client.listen_for_nft_events(self.process_nft_event)

        except Exception as e:
            logger.error(f"Error in event listener: {e}")
        finally:
            self.is_running = False
            logger.info("Event listener stopped")

    async def process_nft_event(self, event_data: Dict[str, Any]):
        """Process an NFT minting event"""
        try:
            event_id = f"{event_data.get('nft_id', '')}_{event_data.get('creator', '')}"

            # Skip if already processed
            if event_id in self.processed_events:
                return

            self.processed_events.add(event_id)

            logger.info(f"Processing NFT event: {event_data}")

            # Extract NFT information from event
            nft_id = event_data.get("nft_id")
            if not nft_id:
                logger.warning("No NFT ID in event data")
                return

            # Get full NFT data from blockchain
            nft_data = await sui_client.get_nft_data(nft_id)
            if not nft_data:
                logger.warning(f"Could not retrieve NFT data for {nft_id}")
                return

            # Convert NFTData from sui_client format to fraud_detector format
            fraud_detector_nft_data = FraudDetectorNFTData(
                title=nft_data.name,
                description=nft_data.description,
                image_url=nft_data.image_url,
                category=nft_data.collection,
                price=0.0  # Default price since it's not in the sui_client NFTData
            )

            # Perform fraud analysis
            logger.info(f"Starting fraud analysis for NFT {nft_id}")
            fraud_result = await analyze_nft_for_fraud(fraud_detector_nft_data)

            # If fraud detected, create flag on blockchain
            if fraud_result.get("is_fraud", False):
                logger.warning(f"Fraud detected for NFT {nft_id}: {fraud_result.get('reason', 'Unknown reason')}")

                flag_id = await sui_client.create_fraud_flag(
                    nft_id=nft_id,
                    flag_type=fraud_result.get("flag_type"),
                    confidence_score=int(fraud_result.get("confidence_score", 0.0) * 100),
                    reason=fraud_result.get("reason", "Fraud detected"),
                    evidence_url=fraud_result.get("evidence_url", "")
                )

                if flag_id:
                    logger.info(f"Fraud flag created successfully: {flag_id}")
                else:
                    logger.error(f"Failed to create fraud flag for NFT {nft_id}")
            else:
                logger.info(f"No fraud detected for NFT {nft_id}")

            # Store analysis results in Supabase
            await self.store_analysis_result(nft_data, fraud_result)

            # Update database with analysis results
            await self.update_database_with_analysis(nft_data, fraud_result)

            # Cache NFT data for future reference
            await supabase_client.cache_nft_data({
                "nft_id": nft_data.object_id,
                "creator": nft_data.creator,
                "name": nft_data.name,
                "description": nft_data.description,
                "image_url": nft_data.image_url,
                "metadata": nft_data.metadata,
                "collection": nft_data.collection,
                "created_at": nft_data.created_at
            })

        except Exception as e:
            logger.error(f"Error processing NFT event: {e}")

    async def store_analysis_result(self, nft_data: NFTData, fraud_result: Dict[str, Any]):
        """Store analysis results in Supabase"""
        try:
            analysis_record = {
                "is_fraud": fraud_result.get("is_fraud", False),
                "confidence_score": fraud_result.get("confidence_score", 0.0),
                "flag_type": fraud_result.get("flag_type"),
                "reason": fraud_result.get("reason", "Analysis completed"),
                "details": fraud_result.get("analysis_details", {})
            }

            # Store in Supabase
            await supabase_client.store_analysis_result(
                nft_id=nft_data.object_id,
                analysis_type="langgraph_workflow",
                result=analysis_record
            )

            logger.debug(f"Analysis result stored for NFT: {nft_data.object_id}")

        except Exception as e:
            logger.error(f"Error storing analysis result: {e}")

    async def update_database_with_analysis(self, nft_data: NFTData, fraud_result: Dict[str, Any]):
        """Update database with analysis results"""
        try:
            # Import database dependencies
            try:
                from database.connection import get_db
                from models.database import NFT, User
            except ImportError:
                from backend.database.connection import get_db
                from backend.models.database import NFT, User
            
            db_gen = get_db()
            db = next(db_gen)
            
            try:
                # Find NFT by Sui object ID
                nft = db.query(NFT).filter(NFT.sui_object_id == nft_data.object_id).first()
                
                if nft:
                    # Update NFT with analysis results
                    nft.analysis_details = fraud_result.get("analysis_details", {})
                    nft.analysis_details.update({
                        "status": "completed",
                        "analyzed_at": datetime.now().isoformat(),
                        "is_fraud": fraud_result.get("is_fraud", False),
                        "confidence_score": fraud_result.get("confidence_score", 0.0),
                        "flag_type": fraud_result.get("flag_type"),
                        "reason": fraud_result.get("reason", "Analysis completed")
                    })
                    
                    # Update embedding vector if available
                    if "image_analysis" in fraud_result.get("analysis_details", {}) and "embedding" in fraud_result["analysis_details"]["image_analysis"]:
                        nft.embedding_vector = fraud_result["analysis_details"]["image_analysis"]["embedding"]
                    
                    db.commit()
                    logger.info(f"Updated NFT {nft.id} with analysis results from listener")
                else:
                    logger.warning(f"NFT with Sui object ID {nft_data.object_id} not found in database")
                    
            except Exception as db_error:
                logger.error(f"Error updating database with analysis results: {db_error}")
                db.rollback()
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error in database update: {e}")

    async def stop_listening(self):
        """Stop the event listener"""
        logger.info("Stopping event listener...")
        self.is_running = False
        await sui_client.close()


# Global event listener instance
event_listener = SuiEventListener()


async def start_fraud_detection_service():
    """Start the fraud detection service"""
    logger.info("Starting FraudGuard detection service...")
    await event_listener.start_listening()


async def stop_fraud_detection_service():
    """Stop the fraud detection service"""
    logger.info("Stopping FraudGuard detection service...")
    await event_listener.stop_listening()


if __name__ == "__main__":
    # For testing the listener directly
    import sys
    import signal

    def signal_handler(sig, frame):
        logger.info("Received interrupt signal")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Run the listener
    asyncio.run(start_fraud_detection_service())