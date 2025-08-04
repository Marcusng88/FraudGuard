"""
Unified Fraud Detection Engine for FraudGuard
LLM-powered fraud analysis using Google Gemini with LangGraph workflow
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

try:
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
except ImportError:
    ChatGoogleGenerativeAI = None
    GoogleGenerativeAIEmbeddings = None
    ChatPromptTemplate = None
    JsonOutputParser = None

try:
    from core.config import settings
    from agent.gemini_image_analyzer import get_gemini_analyzer
    from agent.supabase_client import get_supabase_client
    from agent.sui_client import get_sui_client
except ImportError:
    from backend.core.config import settings
    from backend.agent.gemini_image_analyzer import get_gemini_analyzer
    from backend.agent.supabase_client import get_supabase_client
    from backend.agent.sui_client import get_sui_client

logger = logging.getLogger(__name__)


@dataclass
class NFTData:
    """NFT data structure for analysis"""
    title: str
    description: str
    image_url: str
    category: str
    price: float


@dataclass
class FraudAnalysisResult:
    """Result of fraud analysis"""
    is_fraud: bool
    confidence_score: float  # 0.0 to 1.0
    flag_type: int
    reason: str
    evidence_url: str
    details: Dict[str, Any]


class UnifiedFraudDetector:
    """Unified fraud detection system using Google Gemini and LangGraph workflow"""
    
    def __init__(self):
        self.llm = None
        self.gemini_analyzer = None
        self.supabase_client = None
        self.sui_client = None
        self.initialized = False
    
    async def initialize(self) -> bool:
        """Initialize all fraud detection components"""
        try:
            # Initialize Google Gemini LLM
            if ChatGoogleGenerativeAI and settings.google_api_key:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-pro",
                    temperature=0.1,
                    google_api_key=settings.google_api_key
                )
                logger.info("Google Gemini LLM initialized")
            
            # Initialize other components
            self.gemini_analyzer = await get_gemini_analyzer()
            self.supabase_client = await get_supabase_client()
            self.sui_client = await get_sui_client()
            
            # Initialize components
            if self.gemini_analyzer:
                await self.gemini_analyzer.initialize()
            
            if self.supabase_client:
                await self.supabase_client.initialize()
            
            self.initialized = True
            logger.info("Unified fraud detector initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize fraud detector: {e}")
            return False
    
    async def analyze_nft_for_fraud(self, nft_data: NFTData) -> Dict[str, Any]:
        """
        Comprehensive NFT fraud analysis using LLM
        
        Args:
            nft_data: NFT data to analyze
            
        Returns:
            Dict with fraud analysis results
        """
        try:
            if not self.initialized:
                await self.initialize()
            
            logger.info(f"Starting comprehensive fraud analysis for NFT: {nft_data.title}")
            
            # Step 1: Image Analysis with Gemini
            image_analysis = await self._analyze_image_with_gemini(nft_data)
            
            # Step 2: Description Embedding and Similarity Search
            similarity_results = await self._check_similarity(nft_data, image_analysis)
            
            # Step 3: Metadata Analysis
            metadata_analysis = await self._analyze_metadata(nft_data)
            
            # Step 4: LLM-based Final Fraud Decision
            fraud_decision = await self._make_llm_fraud_decision(
                nft_data, image_analysis, similarity_results, metadata_analysis
            )
            
            # Prepare comprehensive result
            result = {
                "is_fraud": fraud_decision.get("is_fraud", False),
                "confidence_score": fraud_decision.get("confidence_score", 0.0),
                "flag_type": fraud_decision.get("flag_type"),
                "reason": fraud_decision.get("reason", "Analysis completed"),
                "analysis_details": {
                    "image_analysis": image_analysis,
                    "similarity_results": similarity_results,
                    "metadata_analysis": metadata_analysis,
                    "llm_decision": fraud_decision,
                    "analysis_timestamp": datetime.now().isoformat()
                }
            }
            
            logger.info(f"Fraud analysis complete: is_fraud={result['is_fraud']}, confidence={result['confidence_score']:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Error in fraud analysis: {e}")
            return {
                "is_fraud": False,
                "confidence_score": 0.0,
                "flag_type": None,
                "reason": f"Analysis error: {str(e)}",
                "analysis_details": {"error": str(e)}
            }
    
    async def _analyze_image_with_gemini(self, nft_data: NFTData) -> Dict[str, Any]:
        """Step 1: Analyze image using Gemini Vision"""
        try:
            if self.gemini_analyzer:
                # Use the gemini analyzer for image analysis
                nft_metadata = {
                    "name": nft_data.title,
                    "description": nft_data.description,
                    "creator": getattr(nft_data, 'creator', 'unknown'),
                    "category": nft_data.category
                }
                
                analysis = await self.gemini_analyzer.analyze_nft_image(
                    nft_data.image_url, 
                    nft_metadata
                )
                return analysis
            
            # Fallback if gemini analyzer not available
            return {
                "description": f"NFT image analysis for {nft_data.title}",
                "overall_fraud_score": 0.1,
                "risk_level": "low",
                "fraud_indicators": {},
                "recommendation": "Gemini analyzer not available"
            }
            
        except Exception as e:
            logger.error(f"Error in image analysis: {e}")
            return {
                "description": f"Error analyzing {nft_data.title}",
                "overall_fraud_score": 0.0,
                "risk_level": "unknown",
                "error": str(e)
            }
    
    async def _check_similarity(self, nft_data: NFTData, image_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Step 2: Check for similar NFTs using embeddings"""
        try:
            if not self.supabase_client or not image_analysis.get("embedding"):
                return {
                    "similar_nfts": [],
                    "max_similarity": 0.0,
                    "is_duplicate": False
                }
            
            # Search for similar descriptions
            similar_nfts = await self.supabase_client.search_similar_descriptions(
                image_analysis["embedding"],
                threshold=0.85,
                limit=10
            )
            
            max_similarity = max([nft["similarity"] for nft in similar_nfts]) if similar_nfts else 0.0
            
            return {
                "similar_nfts": similar_nfts,
                "max_similarity": max_similarity,
                "is_duplicate": max_similarity > 0.95,
                "similarity_count": len(similar_nfts)
            }
            
        except Exception as e:
            logger.error(f"Error in similarity check: {e}")
            return {
                "similar_nfts": [],
                "max_similarity": 0.0,
                "is_duplicate": False,
                "error": str(e)
            }
    
    async def _analyze_metadata(self, nft_data: NFTData) -> Dict[str, Any]:
        """Step 3: Analyze NFT metadata for fraud indicators"""
        try:
            if not self.llm:
                # Fallback metadata analysis
                return {
                    "quality_score": 0.7,
                    "suspicious_indicators": [],
                    "metadata_risk": 0.1
                }
            
            # Use LLM to analyze metadata
            metadata_prompt = f"""
            Analyze this NFT metadata for fraud indicators:
            
            Name: {nft_data.title}
            Description: {nft_data.description}
            Category: {nft_data.category}
            Price: {nft_data.price}
            
            Look for:
            1. Low-quality or generic descriptions
            2. Suspicious keywords indicating fraud
            3. Price anomalies
            4. Inconsistencies in naming and description
            
            Respond in JSON format:
            {{
                "quality_score": 0.0-1.0,
                "suspicious_indicators": ["list of concerns"],
                "metadata_risk": 0.0-1.0,
                "analysis": "brief explanation"
            }}
            """
            
            response = await self.llm.ainvoke(metadata_prompt)
            
            try:
                import json
                metadata_analysis = json.loads(response.content)
            except:
                # Fallback if JSON parsing fails
                metadata_analysis = {
                    "quality_score": 0.5,
                    "suspicious_indicators": ["LLM response parsing failed"],
                    "metadata_risk": 0.2,
                    "analysis": "Fallback analysis used"
                }
            
            return metadata_analysis
            
        except Exception as e:
            logger.error(f"Error in metadata analysis: {e}")
            return {
                "quality_score": 0.5,
                "suspicious_indicators": [f"Analysis error: {str(e)}"],
                "metadata_risk": 0.1,
                "error": str(e)
            }
    
    async def _make_llm_fraud_decision(
        self, 
        nft_data: NFTData,
        image_analysis: Dict[str, Any], 
        similarity_results: Dict[str, Any], 
        metadata_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Step 4: LLM-based final fraud decision"""
        try:
            if not self.llm:
                # Fallback decision logic
                image_risk = image_analysis.get("overall_fraud_score", 0.0)
                similarity_risk = similarity_results.get("max_similarity", 0.0)
                metadata_risk = metadata_analysis.get("metadata_risk", 0.0)
                
                combined_risk = (image_risk * 0.5) + (similarity_risk * 0.3) + (metadata_risk * 0.2)
                
                return {
                    "is_fraud": combined_risk > 0.6,
                    "confidence_score": combined_risk,
                    "flag_type": 1 if combined_risk > 0.8 else 2 if combined_risk > 0.6 else None,
                    "reason": f"Fallback analysis - Combined risk: {combined_risk:.2f}",
                    "risk_breakdown": {
                        "image": image_risk,
                        "similarity": similarity_risk,
                        "metadata": metadata_risk
                    }
                }
            
            # Use LLM for final decision
            decision_prompt = f"""
            You are an expert NFT fraud detection AI. Based on comprehensive analysis, determine if this NFT is fraudulent.
            
            NFT Information:
            Name: {nft_data.title}
            Description: {nft_data.description}
            Category: {nft_data.category}
            Price: {nft_data.price}
            
            Analysis Results:
            
            Image Analysis:
            - Fraud Score: {image_analysis.get('overall_fraud_score', 0.0)}
            - Risk Level: {image_analysis.get('risk_level', 'unknown')}
            - Fraud Indicators: {image_analysis.get('fraud_indicators', {})}
            
            Similarity Analysis:
            - Max Similarity: {similarity_results.get('max_similarity', 0.0)}
            - Similar NFTs Found: {len(similarity_results.get('similar_nfts', []))}
            - Is Duplicate: {similarity_results.get('is_duplicate', False)}
            
            Metadata Analysis:
            - Quality Score: {metadata_analysis.get('quality_score', 0.0)}
            - Suspicious Indicators: {metadata_analysis.get('suspicious_indicators', [])}
            - Metadata Risk: {metadata_analysis.get('metadata_risk', 0.0)}
            
            Based on this comprehensive analysis, make a final fraud determination.
            
            Respond in JSON format:
            {{
                "is_fraud": true/false,
                "confidence_score": 0.0-1.0,
                "flag_type": 1-4 (1=plagiarism, 2=suspicious_activity, 3=fake_metadata, 4=ai_generated) or null,
                "reason": "clear explanation of decision",
                "primary_concerns": ["list of main issues"],
                "recommendation": "ALLOW/FLAG/BLOCK"
            }}
            """
            
            response = await self.llm.ainvoke(decision_prompt)
            
            try:
                import json
                fraud_decision = json.loads(response.content)
                
                # Validate the response
                if not isinstance(fraud_decision.get("is_fraud"), bool):
                    fraud_decision["is_fraud"] = False
                if not isinstance(fraud_decision.get("confidence_score"), (int, float)):
                    fraud_decision["confidence_score"] = 0.0
                
                return fraud_decision
                
            except Exception as parse_error:
                logger.warning(f"Failed to parse LLM decision: {parse_error}")
                # Fallback decision
                return {
                    "is_fraud": False,
                    "confidence_score": 0.1,
                    "flag_type": None,
                    "reason": f"LLM decision parsing failed: {parse_error}",
                    "recommendation": "MANUAL_REVIEW"
                }
            
        except Exception as e:
            logger.error(f"Error in LLM fraud decision: {e}")
            return {
                "is_fraud": False,
                "confidence_score": 0.0,
                "flag_type": None,
                "reason": f"Decision analysis error: {str(e)}",
                "error": str(e)
            }


# Global fraud detector instance
unified_fraud_detector = UnifiedFraudDetector()


async def initialize_fraud_detector() -> bool:
    """Initialize the unified fraud detector"""
    return await unified_fraud_detector.initialize()


async def analyze_nft_for_fraud(nft_data: NFTData) -> Dict[str, Any]:
    """
    Unified NFT fraud analysis using Google Gemini LLM
    
    This function integrates all fraud detection components:
    1. Image analysis with Gemini Vision
    2. Description embedding and similarity search  
    3. Metadata quality analysis
    4. LLM-based final fraud decision
    
    Returns:
    {
        "is_fraud": false,
        "confidence_score": 0.15,
        "flag_type": null,
        "reason": "explanation",
        "analysis_details": {...}
    }
    """
    try:
        logger.info(f"Starting unified LLM fraud analysis for NFT: {nft_data.title}")

        # Initialize components if needed
        if not unified_fraud_detector.initialized:
            await unified_fraud_detector.initialize()

        # Use the unified fraud detector
        result = await unified_fraud_detector.analyze_nft_for_fraud(nft_data)
        
        logger.info(f"Unified fraud analysis complete: is_fraud={result['is_fraud']}, confidence={result['confidence_score']:.2f}")
        return result

    except Exception as e:
        logger.error(f"Error in unified fraud analysis: {e}")
        # Return safe default values on error
        return {
            "is_fraud": False,
            "confidence_score": 0.0,
            "flag_type": None,
            "reason": f"Analysis error: {str(e)}",
            "analysis_details": {"error": str(e)}
        }


def _fallback_fraud_analysis(nft_data: NFTData) -> Dict[str, Any]:
    """
    Fallback analysis when AI agent is not available
    Basic rule-based detection for development/testing
    """
    logger.warning("Using fallback fraud analysis - AI agent not available")
    
    is_fraud = False
    confidence_score = 0.1
    flag_type = None
    reason = "Basic analysis completed - AI agent recommended for production"
    
    # Very basic checks
    fraud_keywords = ['fake', 'copy', 'stolen', 'counterfeit']
    title_desc = (nft_data.title + " " + nft_data.description).lower()
    
    for keyword in fraud_keywords:
        if keyword in title_desc:
            is_fraud = True
            confidence_score = 0.6
            flag_type = 1
            reason = f"Suspicious keyword detected: '{keyword}'"
            break
    
    # Price anomaly check
    if nft_data.price < 0.001:
        confidence_score = max(confidence_score, 0.4)
        reason = "Suspiciously low price detected"
    
    return {
        "is_fraud": is_fraud,
        "confidence_score": confidence_score,
        "flag_type": flag_type,
        "reason": reason,
        "analysis_details": {
            "fallback_analysis": True,
            "keywords_checked": fraud_keywords,
            "price": nft_data.price
        }
    }
