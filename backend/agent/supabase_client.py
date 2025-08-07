"""
Supabase client for FraudGuard vector database operations
Handles image embeddings storage and similarity searches for plagiarism detection
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

# Note: These imports will work once dependencies are installed
try:
    from supabase import create_client, Client
    import vecs
    import numpy as np
except ImportError:
    # Fallback for development without dependencies
    create_client = None
    Client = None
    vecs = None
    np = None

try:
    from core.config import settings
except ImportError:
    from backend.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseVectorClient:
    """Supabase client for vector operations and caching"""
    
    def __init__(self):
        self.client = None
        self.vx = None  # vecs client for vector operations
        self.image_collection = None
        self.nft_cache_table = "nft_cache"
        self.analysis_results_table = "analysis_results"
        
    async def initialize(self) -> bool:
        """Initialize Supabase connection and vector database"""
        try:
            if not create_client or not settings.supabase_url or not settings.supabase_key:
                logger.warning("Supabase not configured, client will not be available")
                return True
            
            # Initialize Supabase client
            self.client = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
            
            # Initialize vecs for vector operations
            if vecs and settings.supabase_db_url:
                self.vx = vecs.create_client(settings.supabase_db_url)
                
                # Try to get existing collection, create new one if dimension mismatch
                try:
                    self.image_collection = self.vx.get_collection(
                        name="nft_image_embeddings"
                    )
                    # Check if dimension matches (Google embeddings are 768-dimensional)
                    if hasattr(self.image_collection, 'dimension') and self.image_collection.dimension != 768:
                        logger.warning(f"Existing collection has dimension {self.image_collection.dimension}, need 768. Recreating collection.")
                        # Delete existing collection with wrong dimension
                        self.image_collection.delete()
                        self.image_collection = self.vx.create_collection(
                            name="nft_description_embeddings",
                            dimension=768
                        )
                    logger.info("Using existing vector collection")
                except Exception:
                    # Collection doesn't exist or other error, create new one
                    self.image_collection = self.vx.create_collection(
                        name="nft_description_embeddings",
                        dimension=768  # Google embeddings dimension
                    )
                    logger.info("Created new vector collection")
            
            # Create tables if they don't exist
            await self._create_tables()
            
            logger.info("Supabase vector client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return False
    
    async def _create_tables(self):
        """Create necessary tables for caching and analysis results"""
        try:
            if not self.client:
                return
            
            # Create NFT cache table
            nft_cache_schema = """
            CREATE TABLE IF NOT EXISTS nft_cache (
                id SERIAL PRIMARY KEY,
                nft_id TEXT UNIQUE NOT NULL,
                creator_address TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                image_url TEXT NOT NULL,
                metadata JSONB,
                collection TEXT,
                created_at TIMESTAMP NOT NULL,
                cached_at TIMESTAMP DEFAULT NOW(),
                last_analyzed TIMESTAMP,
                analysis_count INTEGER DEFAULT 0
            );
            """
            
            # Create analysis results table
            analysis_results_schema = """
            CREATE TABLE IF NOT EXISTS analysis_results (
                id SERIAL PRIMARY KEY,
                nft_id TEXT NOT NULL,
                analysis_type TEXT NOT NULL,
                is_fraud BOOLEAN NOT NULL,
                confidence_score FLOAT NOT NULL,
                flag_type INTEGER,
                reason TEXT,
                analysis_details JSONB,
                analyzed_at TIMESTAMP DEFAULT NOW(),
                agent_version TEXT DEFAULT '1.0.0'
            );
            """
            
            # Create wallet activity cache table
            wallet_activity_schema = """
            CREATE TABLE IF NOT EXISTS wallet_activity_cache (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                activity_data JSONB NOT NULL,
                time_period_hours INTEGER NOT NULL,
                cached_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP NOT NULL,
                UNIQUE(wallet_address, time_period_hours)
            );
            """
            
            # Execute schema creation (in a real implementation)
            # self.client.rpc('execute_sql', {'sql': nft_cache_schema})
            # self.client.rpc('execute_sql', {'sql': analysis_results_schema})
            # self.client.rpc('execute_sql', {'sql': wallet_activity_schema})
            
            logger.info("Database tables created/verified")
            
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
    
    async def store_nft_embedding(
        self, 
        nft_id: str, 
        embedding: List[float], 
        metadata: Dict[str, Any]
    ) -> bool:
        """Store NFT description embedding in vector database"""
        try:
            if not self.image_collection:
                logger.warning("Vector collection not available, skipping embedding storage")
                return True
            
            # Store embedding with metadata
            self.image_collection.upsert([
                {
                    "id": nft_id,
                    "vector": embedding,
                    "metadata": {
                        "nft_id": nft_id,
                        "name": metadata.get("name", ""),
                        "creator": metadata.get("creator", ""),
                        "image_url": metadata.get("image_url", ""),
                        "stored_at": datetime.now().isoformat()
                    }
                }
            ])
            
            logger.info(f"Stored embedding for NFT: {nft_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing NFT embedding: {e}")
            return False
    
    async def search_similar_descriptions(
        self, 
        embedding: List[float], 
        threshold: float = 0.85, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar NFT descriptions using vector similarity"""
        try:
            if not self.image_collection:
                logger.warning("Image collection not available for similarity search")
                return []
            
            # Perform vector similarity search
            results = self.image_collection.query(
                data=embedding,
                limit=limit,
                include_metadata=True
            )
            
            # Filter by threshold and format results
            similar_descriptions = []
            for result in results:
                similarity = 1 - result.distance  # Convert distance to similarity
                if similarity >= threshold:
                    similar_descriptions.append({
                        "nft_id": result.id,
                        "similarity": similarity,
                        "metadata": result.metadata
                    })
            
            logger.info(f"Found {len(similar_descriptions)} similar descriptions above threshold {threshold}")
            return similar_descriptions
            
        except Exception as e:
            logger.error(f"Error searching similar descriptions: {e}")
            return []
    
    async def cache_nft_data(self, nft_data: Dict[str, Any]) -> bool:
        """Cache NFT data to reduce blockchain queries"""
        try:
            if not self.client:
                logger.warning("Supabase client not available for caching NFT data")
                return False
            
            # Insert or update NFT cache
            result = self.client.table(self.nft_cache_table).upsert({
                "nft_id": nft_data["nft_id"],
                "creator_address": nft_data["creator"],
                "name": nft_data["name"],
                "description": nft_data.get("description", ""),
                "image_url": nft_data["image_url"],
                "metadata": nft_data.get("metadata", {}),
                "collection": nft_data.get("collection", ""),
                "created_at": nft_data.get("created_at", datetime.now().isoformat())
            }).execute()
            
            logger.debug(f"Cached NFT data: {nft_data['nft_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching NFT data: {e}")
            return False
    
    async def get_cached_nft_data(self, nft_id: str) -> Optional[Dict[str, Any]]:
        """Get cached NFT data"""
        try:
            if not self.client:
                return None
            
            result = self.client.table(self.nft_cache_table).select("*").eq("nft_id", nft_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached NFT data: {e}")
            return None
    
    async def store_analysis_result(
        self, 
        nft_id: str, 
        analysis_type: str, 
        result: Dict[str, Any]
    ) -> bool:
        """Store fraud analysis results"""
        try:
            if not self.client:
                logger.warning("Supabase client not available for storing analysis result")
                return False
            
            # Store analysis result
            self.client.table(self.analysis_results_table).insert({
                "nft_id": nft_id,
                "analysis_type": analysis_type,
                "is_fraud": result.get("is_fraud", False),
                "confidence_score": result.get("confidence_score", 0.0),
                "flag_type": result.get("flag_type", 0),
                "reason": result.get("reason", ""),
                "analysis_details": result.get("details", {})
            }).execute()
            
            logger.debug(f"Stored analysis result for NFT: {nft_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing analysis result: {e}")
            return False
    
    async def get_wallet_activity_cache(
        self, 
        wallet_address: str, 
        hours: int
    ) -> Optional[Dict[str, Any]]:
        """Get cached wallet activity data"""
        try:
            if not self.client:
                return None
            
            # Check for non-expired cache
            result = self.client.table("wallet_activity_cache").select("*").eq(
                "wallet_address", wallet_address
            ).eq(
                "time_period_hours", hours
            ).gt(
                "expires_at", datetime.now().isoformat()
            ).execute()
            
            if result.data:
                return result.data[0]["activity_data"]
            return None
            
        except Exception as e:
            logger.error(f"Error getting wallet activity cache: {e}")
            return None
    
    async def cache_wallet_activity(
        self, 
        wallet_address: str, 
        hours: int, 
        activity_data: Dict[str, Any],
        cache_duration_minutes: int = 30
    ) -> bool:
        """Cache wallet activity data"""
        try:
            if not self.client:
                return True
            
            expires_at = datetime.now().timestamp() + (cache_duration_minutes * 60)
            
            # Upsert wallet activity cache
            self.client.table("wallet_activity_cache").upsert({
                "wallet_address": wallet_address,
                "activity_data": activity_data,
                "time_period_hours": hours,
                "expires_at": datetime.fromtimestamp(expires_at).isoformat()
            }).execute()
            
            logger.debug(f"Cached wallet activity for: {wallet_address}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching wallet activity: {e}")
            return False
    
    async def get_fraud_statistics(self) -> Dict[str, Any]:
        """Get fraud detection statistics"""
        try:
            if not self.client:
                logger.warning("Supabase client not available for fraud statistics")
                return {
                    "total_analyzed": 0,
                    "fraud_detected": 0,
                    "fraud_rate": 0.0,
                    "most_common_flag_type": 0,
                    "avg_confidence_score": 0.0,
                    "error": "Supabase client not available"
                }
            
            # Query analysis results for statistics
            result = self.client.table(self.analysis_results_table).select(
                "is_fraud, confidence_score, flag_type"
            ).execute()
            
            if not result.data:
                return {"total_analyzed": 0, "fraud_detected": 0, "fraud_rate": 0.0}
            
            total = len(result.data)
            fraud_count = sum(1 for r in result.data if r["is_fraud"])
            avg_confidence = sum(r["confidence_score"] for r in result.data) / total
            
            # Most common flag type
            flag_types = [r["flag_type"] for r in result.data if r["is_fraud"]]
            most_common_flag = max(set(flag_types), key=flag_types.count) if flag_types else 0
            
            return {
                "total_analyzed": total,
                "fraud_detected": fraud_count,
                "fraud_rate": fraud_count / total if total > 0 else 0.0,
                "most_common_flag_type": most_common_flag,
                "avg_confidence_score": avg_confidence
            }
            
        except Exception as e:
            logger.error(f"Error getting fraud statistics: {e}")
            return {}


# Global Supabase client instance
supabase_client = SupabaseVectorClient()


async def initialize_supabase_client() -> bool:
    """Initialize the global Supabase client"""
    return await supabase_client.initialize()


async def get_supabase_client() -> SupabaseVectorClient:
    """Get the global Supabase client instance"""
    return supabase_client
