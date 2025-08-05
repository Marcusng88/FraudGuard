"""
Description-based Embedding Service for FraudGuard
Uses Gemini to analyze images and generate descriptions, then creates embeddings from those descriptions
"""

import logging
from typing import List, Optional, Dict, Any
import asyncio

try:
    from agent.gemini_image_analyzer import get_gemini_analyzer
    from agent.supabase_client import supabase_client
except ImportError:
    try:
        from backend.agent.gemini_image_analyzer import get_gemini_analyzer
        from backend.agent.supabase_client import supabase_client
    except ImportError:
        get_gemini_analyzer = None
        supabase_client = None

logger = logging.getLogger(__name__)


class DescriptionEmbeddingService:
    """
    Service that uses Gemini to analyze images, extract descriptions,
    and generate embeddings from those descriptions for similarity search
    """
    
    def __init__(self):
        self.gemini_analyzer = None
        self.initialized = False
    
    async def initialize(self) -> bool:
        """Initialize the embedding service"""
        try:
            if get_gemini_analyzer:
                self.gemini_analyzer = await get_gemini_analyzer()
                if self.gemini_analyzer:
                    await self.gemini_analyzer.initialize()
                    self.initialized = True
                    logger.info("Description embedding service initialized successfully")
                    return True
            
            logger.warning("Gemini analyzer not available, service will not be available")
            self.initialized = True
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize description embedding service: {e}")
            return False
    
    async def get_image_embedding(self, image_url: str) -> Optional[List[float]]:
        """
        Analyze image with Gemini to get description, then generate embedding from description
        
        Args:
            image_url: URL of the image to analyze
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            if not self.initialized:
                await self.initialize()
            
            if not self.gemini_analyzer:
                raise Exception("Gemini analyzer not available")
            
            description = await self.gemini_analyzer.extract_image_description(image_url)
            
            if not description:
                raise Exception(f"Could not extract description from image: {image_url}")
            
            embedding = await self.gemini_analyzer.embed_text(description)
            
            if embedding:
                logger.info(f"Successfully generated embedding with dimension: {len(embedding)}")
                return embedding
            else:
                raise Exception("Failed to generate embedding from description")
                
        except Exception as e:
            logger.error(f"Error generating image embedding: {e}")
            raise e
    
    async def get_image_embedding_and_store(self, image_url: str, nft_id: str, metadata: Dict[str, Any]) -> bool:
        """
        Generate embedding and store it in Supabase for vector search
        Note: This is handled by the main NFT creation process, not separately
        
        Args:
            image_url: URL of the image to analyze
            nft_id: Unique identifier for the NFT
            metadata: Additional metadata to store with the embedding
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.initialized:
                await self.initialize()
            
            # Since embeddings are stored directly in the nfts table,
            # this function mainly serves to ensure the embedding is generated
            embedding = await self.get_image_embedding(image_url)
            if embedding:
                logger.info(f"Generated embedding for NFT {nft_id}, stored in main NFT record")
                return True
            else:
                logger.error(f"Could not generate embedding for NFT {nft_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error in embedding generation: {e}")
            return False
    
    async def find_similar_images(self, embedding: List[float], threshold: float = 0.8, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Find similar images based on embedding similarity using the nfts table
        
        Args:
            embedding: The embedding vector to search for
            threshold: Similarity threshold (0-1)
            limit: Maximum number of results to return
            
        Returns:
            List of similar NFTs with their metadata
        """
        try:
            if not supabase_client:
                logger.warning("Supabase client not available, returning empty results")
                return []
            
            # Use Supabase's vector similarity search on the nfts table
            # This requires a custom RPC function to search embeddings
            result = supabase_client.rpc(
                "search_similar_nft_embeddings",
                {
                    "query_embedding": embedding,
                    "similarity_threshold": threshold,
                    "match_count": limit
                }
            ).execute()
            
            if result.data:
                logger.info(f"Found {len(result.data)} similar images")
                return result.data
            else:
                logger.info("No similar images found")
                return []
                
        except Exception as e:
            logger.error(f"Error searching for similar images: {e}")
            # Fallback: return empty list instead of failing
            return []
    
    async def batch_analyze_and_embed(self, image_urls: List[str], nft_ids: List[str], metadata_list: List[Dict[str, Any]]) -> List[bool]:
        """
        Batch process multiple images for embedding generation and storage
        
        Args:
            image_urls: List of image URLs to process
            nft_ids: List of corresponding NFT IDs
            metadata_list: List of metadata dictionaries
            
        Returns:
            List of boolean success indicators
        """
        try:
            if len(image_urls) != len(nft_ids) or len(image_urls) != len(metadata_list):
                raise ValueError("All input lists must have the same length")
            
            # Process in parallel for better performance
            tasks = [
                self.get_image_embedding_and_store(url, nft_id, metadata)
                for url, nft_id, metadata in zip(image_urls, nft_ids, metadata_list)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Convert exceptions to False
            success_results = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Batch processing error: {result}")
                    success_results.append(False)
                else:
                    success_results.append(result)
            
            logger.info(f"Batch processing completed: {sum(success_results)}/{len(success_results)} successful")
            return success_results
            
        except Exception as e:
            logger.error(f"Error in batch processing: {e}")
            return [False] * len(image_urls)


# Global service instance
_embedding_service = None


def get_embedding_service() -> DescriptionEmbeddingService:
    """
    Get the global embedding service instance
    Creates it if it doesn't exist
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = DescriptionEmbeddingService()
    return _embedding_service


async def initialize_embedding_service() -> bool:
    """Initialize the global embedding service"""
    service = get_embedding_service()
    return await service.initialize()
