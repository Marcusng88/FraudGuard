"""
FraudGuard Agent Workflow using LangGraph
Orchestrates the complete fraud detection pipeline using Google Gemini and embeddings
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, TypedDict
from datetime import datetime
import json

try:
    from langgraph import StateGraph, END
    from langgraph.graph import Graph
    from langgraph.prebuilt import ToolExecutor
    from langchain.schema import BaseMessage, HumanMessage
except ImportError as e:
    logging.warning(f"LangGraph dependencies not available: {e}")
    StateGraph = None
    END = None

try:
    from gemini_image_analyzer import get_gemini_analyzer
    from supabase_client import get_supabase_client
    from sui_client import get_sui_client
except ImportError:
    # Local imports
    from .gemini_image_analyzer import get_gemini_analyzer
    from .supabase_client import get_supabase_client
    from .sui_client import get_sui_client

logger = logging.getLogger(__name__)


class FraudAnalysisState(TypedDict):
    """State for fraud analysis workflow"""
    nft_id: str
    nft_data: Dict[str, Any]
    image_analysis: Dict[str, Any]
    description: str
    embedding: List[float]
    similar_nfts: List[Dict[str, Any]]
    wallet_analysis: Dict[str, Any]
    fraud_flags: List[Dict[str, Any]]
    final_assessment: Dict[str, Any]
    confidence_score: float
    risk_level: str
    errors: List[str]
    processing_steps: List[str]


class FraudGuardAgent:
    """Main fraud detection agent using LangGraph workflow"""
    
    def __init__(self):
        self.graph = None
        self.gemini_analyzer = None
        self.supabase_client = None
        self.sui_client = None
        self.initialized = False
        
    async def initialize(self) -> bool:
        """Initialize all components and build workflow graph"""
        try:
            # Initialize components
            self.gemini_analyzer = await get_gemini_analyzer()
            self.supabase_client = await get_supabase_client()
            self.sui_client = await get_sui_client()
            
            if not await self.gemini_analyzer.initialize():
                logger.error("Failed to initialize Gemini analyzer")
                return False
                
            if not await self.supabase_client.initialize():
                logger.error("Failed to initialize Supabase client")
                return False
            
            # Build workflow graph
            self._build_workflow_graph()
            
            self.initialized = True
            logger.info("FraudGuard agent initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize FraudGuard agent: {e}")
            return False
    
    def _build_workflow_graph(self):
        """Build the LangGraph workflow for fraud detection"""
        if not StateGraph:
            logger.warning("LangGraph not available, using sequential processing")
            return
        
        # Create workflow graph
        workflow = StateGraph(FraudAnalysisState)
        
        # Add nodes for each step
        workflow.add_node("fetch_nft_data", self._fetch_nft_data)
        workflow.add_node("analyze_image", self._analyze_image)
        workflow.add_node("generate_embedding", self._generate_embedding)
        workflow.add_node("search_similar_nfts", self._search_similar_nfts)
        workflow.add_node("analyze_wallet", self._analyze_wallet)
        workflow.add_node("detect_fraud_patterns", self._detect_fraud_patterns)
        workflow.add_node("final_assessment", self._final_assessment)
        
        # Define workflow edges
        workflow.add_edge("fetch_nft_data", "analyze_image")
        workflow.add_edge("analyze_image", "generate_embedding")
        workflow.add_edge("generate_embedding", "search_similar_nfts")
        workflow.add_edge("search_similar_nfts", "analyze_wallet")
        workflow.add_edge("analyze_wallet", "detect_fraud_patterns")
        workflow.add_edge("detect_fraud_patterns", "final_assessment")
        workflow.add_edge("final_assessment", END)
        
        # Set entry point
        workflow.set_entry_point("fetch_nft_data")
        
        # Compile the graph
        self.graph = workflow.compile()
        logger.info("Workflow graph built successfully")
    
    async def analyze_nft(self, nft_id: str) -> Dict[str, Any]:
        """
        Main entry point for NFT fraud analysis
        Returns comprehensive fraud analysis results
        """
        try:
            if not self.initialized:
                await self.initialize()
            
            # Initialize state
            initial_state = FraudAnalysisState(
                nft_id=nft_id,
                nft_data={},
                image_analysis={},
                description="",
                embedding=[],
                similar_nfts=[],
                wallet_analysis={},
                fraud_flags=[],
                final_assessment={},
                confidence_score=0.0,
                risk_level="unknown",
                errors=[],
                processing_steps=[]
            )
            
            if self.graph:
                # Use LangGraph workflow
                result = await self.graph.ainvoke(initial_state)
                return self._format_analysis_result(result)
            else:
                # Fallback to sequential processing
                return await self._sequential_analysis(initial_state)
                
        except Exception as e:
            logger.error(f"Error in NFT analysis: {e}")
            return {
                "nft_id": nft_id,
                "is_fraud": False,
                "confidence_score": 0.0,
                "risk_level": "unknown",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _sequential_analysis(self, state: FraudAnalysisState) -> Dict[str, Any]:
        """Fallback sequential analysis when LangGraph is not available"""
        try:
            # Step 1: Fetch NFT data
            state = await self._fetch_nft_data(state)
            
            # Step 2: Analyze image
            state = await self._analyze_image(state)
            
            # Step 3: Generate embedding
            state = await self._generate_embedding(state)
            
            # Step 4: Search similar NFTs
            state = await self._search_similar_nfts(state)
            
            # Step 5: Analyze wallet
            state = await self._analyze_wallet(state)
            
            # Step 6: Detect fraud patterns
            state = await self._detect_fraud_patterns(state)
            
            # Step 7: Final assessment
            state = await self._final_assessment(state)
            
            return self._format_analysis_result(state)
            
        except Exception as e:
            logger.error(f"Error in sequential analysis: {e}")
            state["errors"].append(str(e))
            return self._format_analysis_result(state)
    
    async def _fetch_nft_data(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 1: Fetch NFT data from blockchain"""
        try:
            state["processing_steps"].append("Fetching NFT data")
            
            # Check cache first
            cached_data = await self.supabase_client.get_cached_nft_data(state["nft_id"])
            if cached_data:
                state["nft_data"] = cached_data
                logger.info(f"Using cached NFT data for {state['nft_id']}")
                return state
            
            # Fetch from Sui blockchain
            if self.sui_client:
                nft_data = await self.sui_client.get_nft_metadata(state["nft_id"])
                if nft_data:
                    state["nft_data"] = nft_data
                    # Cache the data
                    await self.supabase_client.cache_nft_data(nft_data)
                else:
                    state["errors"].append("Could not fetch NFT data from blockchain")
                    # Use mock data for development
                    state["nft_data"] = self._mock_nft_data(state["nft_id"])
            else:
                # Use mock data
                state["nft_data"] = self._mock_nft_data(state["nft_id"])
            
            logger.info(f"Fetched NFT data for {state['nft_id']}")
            return state
            
        except Exception as e:
            error_msg = f"Error fetching NFT data: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            state["nft_data"] = self._mock_nft_data(state["nft_id"])
            return state
    
    async def _analyze_image(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 2: Analyze NFT image using Gemini"""
        try:
            state["processing_steps"].append("Analyzing image with Gemini")
            
            image_url = state["nft_data"].get("image_url")
            if not image_url:
                state["errors"].append("No image URL found in NFT data")
                return state
            
            # Analyze image with Gemini
            analysis = await self.gemini_analyzer.analyze_nft_image(
                image_url, 
                state["nft_data"]
            )
            
            state["image_analysis"] = analysis
            state["description"] = analysis.get("description", "")
            
            logger.info(f"Completed image analysis for {state['nft_id']}")
            return state
            
        except Exception as e:
            error_msg = f"Error analyzing image: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
    
    async def _generate_embedding(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 3: Generate embedding for description"""
        try:
            state["processing_steps"].append("Generating description embedding")
            
            if not state["description"]:
                state["errors"].append("No description available for embedding")
                return state
            
            # Generate embedding using Gemini analyzer
            embedding = await self.gemini_analyzer.embed_text(state["description"])
            state["embedding"] = embedding
            
            # Store embedding in vector database
            await self.supabase_client.store_nft_embedding(
                state["nft_id"],
                embedding,
                {
                    "name": state["nft_data"].get("name", ""),
                    "creator": state["nft_data"].get("creator", ""),
                    "image_url": state["nft_data"].get("image_url", "")
                }
            )
            
            logger.info(f"Generated embedding for {state['nft_id']}")
            return state
            
        except Exception as e:
            error_msg = f"Error generating embedding: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
    
    async def _search_similar_nfts(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 4: Search for similar NFTs"""
        try:
            state["processing_steps"].append("Searching for similar NFTs")
            
            if not state["embedding"]:
                state["errors"].append("No embedding available for similarity search")
                return state
            
            # Search for similar descriptions
            similar_nfts = await self.supabase_client.search_similar_descriptions(
                state["embedding"],
                threshold=0.85,
                limit=10
            )
            
            state["similar_nfts"] = similar_nfts
            
            logger.info(f"Found {len(similar_nfts)} similar NFTs for {state['nft_id']}")
            return state
            
        except Exception as e:
            error_msg = f"Error searching similar NFTs: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
    
    async def _analyze_wallet(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 5: Analyze creator wallet behavior"""
        try:
            state["processing_steps"].append("Analyzing wallet behavior")
            
            creator_address = state["nft_data"].get("creator")
            if not creator_address:
                state["errors"].append("No creator address found")
                return state
            
            # Get wallet activity analysis
            if self.sui_client:
                wallet_analysis = await self.sui_client.analyze_wallet_behavior(
                    creator_address, 
                    hours=24
                )
                state["wallet_analysis"] = wallet_analysis
            else:
                # Mock wallet analysis
                state["wallet_analysis"] = {
                    "total_nfts_created": 15,
                    "creation_frequency": 2.5,
                    "average_time_between_creation": 3600,
                    "suspicious_patterns": False,
                    "mass_creation_detected": False,
                    "reputation_score": 0.7
                }
            
            logger.info(f"Completed wallet analysis for {creator_address}")
            return state
            
        except Exception as e:
            error_msg = f"Error analyzing wallet: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
    
    async def _detect_fraud_patterns(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 6: Detect fraud patterns and generate flags"""
        try:
            state["processing_steps"].append("Detecting fraud patterns")
            
            fraud_flags = []
            
            # Analyze image analysis results
            image_analysis = state["image_analysis"]
            if image_analysis:
                fraud_indicators = image_analysis.get("fraud_indicators", {})
                
                for indicator_type, details in fraud_indicators.items():
                    if isinstance(details, dict) and details.get("detected"):
                        fraud_flags.append({
                            "type": indicator_type,
                            "confidence": details.get("confidence", 0.0),
                            "evidence": details.get("evidence", ""),
                            "source": "image_analysis"
                        })
            
            # Analyze similarity results
            similar_nfts = state["similar_nfts"]
            if similar_nfts:
                high_similarity_count = len([nft for nft in similar_nfts if nft["similarity"] > 0.95])
                
                if high_similarity_count > 0:
                    fraud_flags.append({
                        "type": "high_similarity_detected",
                        "confidence": min(0.9, high_similarity_count * 0.3),
                        "evidence": f"Found {high_similarity_count} NFTs with >95% similarity",
                        "source": "similarity_analysis"
                    })
            
            # Analyze wallet behavior
            wallet_analysis = state["wallet_analysis"]
            if wallet_analysis:
                if wallet_analysis.get("mass_creation_detected"):
                    fraud_flags.append({
                        "type": "mass_creation",
                        "confidence": 0.8,
                        "evidence": "Wallet shows signs of mass NFT creation",
                        "source": "wallet_analysis"
                    })
                
                if wallet_analysis.get("reputation_score", 1.0) < 0.3:
                    fraud_flags.append({
                        "type": "low_reputation",
                        "confidence": 0.6,
                        "evidence": f"Low wallet reputation score: {wallet_analysis.get('reputation_score')}",
                        "source": "wallet_analysis"
                    })
            
            state["fraud_flags"] = fraud_flags
            
            logger.info(f"Detected {len(fraud_flags)} fraud flags for {state['nft_id']}")
            return state
            
        except Exception as e:
            error_msg = f"Error detecting fraud patterns: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
    
    async def _final_assessment(self, state: FraudAnalysisState) -> FraudAnalysisState:
        """Step 7: Generate final fraud assessment"""
        try:
            state["processing_steps"].append("Generating final assessment")
            
            fraud_flags = state["fraud_flags"]
            
            # Calculate overall confidence score
            if fraud_flags:
                # Weighted average of confidence scores
                total_confidence = sum(flag["confidence"] for flag in fraud_flags)
                max_confidence = max(flag["confidence"] for flag in fraud_flags)
                avg_confidence = total_confidence / len(fraud_flags)
                
                # Use weighted combination of max and average
                confidence_score = (max_confidence * 0.7) + (avg_confidence * 0.3)
            else:
                confidence_score = 0.0
            
            # Determine risk level
            if confidence_score >= 0.8:
                risk_level = "high"
            elif confidence_score >= 0.5:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Determine if fraud
            is_fraud = confidence_score >= 0.6
            
            # Generate recommendation
            if is_fraud:
                if confidence_score >= 0.8:
                    recommendation = "BLOCK - High fraud confidence"
                else:
                    recommendation = "FLAG - Moderate fraud risk, manual review recommended"
            else:
                recommendation = "ALLOW - Low fraud risk"
            
            final_assessment = {
                "is_fraud": is_fraud,
                "confidence_score": confidence_score,
                "risk_level": risk_level,
                "recommendation": recommendation,
                "flag_count": len(fraud_flags),
                "primary_concerns": [flag["type"] for flag in fraud_flags if flag["confidence"] > 0.7],
                "analysis_summary": self._generate_analysis_summary(state),
                "timestamp": datetime.now().isoformat()
            }
            
            state["final_assessment"] = final_assessment
            state["confidence_score"] = confidence_score
            state["risk_level"] = risk_level
            
            # Store analysis result
            await self.supabase_client.store_analysis_result(
                state["nft_id"],
                "comprehensive_fraud_analysis",
                final_assessment
            )
            
            logger.info(f"Completed final assessment for {state['nft_id']}: {recommendation}")
            return state
            
        except Exception as e:
            error_msg = f"Error in final assessment: {e}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            return state
    
    def _generate_analysis_summary(self, state: FraudAnalysisState) -> str:
        """Generate human-readable analysis summary"""
        try:
            nft_name = state["nft_data"].get("name", "Unknown NFT")
            fraud_flags = state["fraud_flags"]
            
            if not fraud_flags:
                return f"Analysis of '{nft_name}' found no significant fraud indicators."
            
            summary_parts = [f"Analysis of '{nft_name}' identified {len(fraud_flags)} potential fraud indicators:"]
            
            for flag in fraud_flags:
                confidence_pct = int(flag["confidence"] * 100)
                summary_parts.append(f"- {flag['type'].replace('_', ' ').title()}: {confidence_pct}% confidence")
            
            if state["similar_nfts"]:
                summary_parts.append(f"Found {len(state['similar_nfts'])} similar NFTs in database.")
            
            return " ".join(summary_parts)
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Analysis completed with errors."
    
    def _format_analysis_result(self, state: FraudAnalysisState) -> Dict[str, Any]:
        """Format final analysis result for API response"""
        return {
            "nft_id": state["nft_id"],
            "analysis_result": state["final_assessment"],
            "fraud_flags": state["fraud_flags"],
            "image_analysis": state["image_analysis"],
            "similar_nfts_count": len(state["similar_nfts"]),
            "wallet_analysis": state["wallet_analysis"],
            "processing_steps": state["processing_steps"],
            "errors": state["errors"],
            "analysis_metadata": {
                "gemini_used": bool(self.gemini_analyzer),
                "vector_search_used": bool(self.supabase_client),
                "blockchain_analysis_used": bool(self.sui_client),
                "processing_time": datetime.now().isoformat()
            }
        }
    
    def _mock_nft_data(self, nft_id: str) -> Dict[str, Any]:
        """Generate mock NFT data for development"""
        return {
            "nft_id": nft_id,
            "name": f"Mock NFT {nft_id[-6:]}",
            "description": "A beautiful digital artwork created by an artist",
            "image_url": "https://example.com/nft.jpg",
            "creator": "0x1234567890abcdef",
            "collection": "Test Collection",
            "created_at": datetime.now().isoformat(),
            "metadata": {
                "attributes": [
                    {"trait_type": "Style", "value": "Digital Art"},
                    {"trait_type": "Rarity", "value": "Common"}
                ]
            }
        }
    
    async def batch_analyze_nfts(self, nft_ids: List[str]) -> List[Dict[str, Any]]:
        """Analyze multiple NFTs concurrently"""
        try:
            tasks = [self.analyze_nft(nft_id) for nft_id in nft_ids]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions in results
            formatted_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    formatted_results.append({
                        "nft_id": nft_ids[i],
                        "error": str(result),
                        "is_fraud": False,
                        "confidence_score": 0.0
                    })
                else:
                    formatted_results.append(result)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error in batch analysis: {e}")
            return [{"error": str(e)} for _ in nft_ids]


# Global agent instance
fraud_guard_agent = FraudGuardAgent()


async def initialize_fraud_guard_agent() -> bool:
    """Initialize the global FraudGuard agent"""
    return await fraud_guard_agent.initialize()


async def get_fraud_guard_agent() -> FraudGuardAgent:
    """Get the global FraudGuard agent instance"""
    return fraud_guard_agent


async def analyze_nft_fraud(nft_id: str) -> Dict[str, Any]:
    """Convenience function for NFT fraud analysis"""
    agent = await get_fraud_guard_agent()
    return await agent.analyze_nft(nft_id)
