"""
Unified Fraud Detection Engine for FraudGuard
LLM-powered fraud analysis using Google Gemini with LangGraph workflow
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

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
            logger.info("Initializing unified fraud detector...")
            
            # Initialize Google Gemini LLM
            if ChatGoogleGenerativeAI and settings.google_api_key:
                try:
                    self.llm = ChatGoogleGenerativeAI(
                        model=settings.google_model,
                        temperature=0.1,
                        google_api_key=settings.google_api_key
                    )
                    logger.info("Google Gemini LLM initialized successfully")
                except Exception as llm_error:
                    logger.warning(f"Failed to initialize Gemini LLM: {llm_error}")
                    self.llm = None
            
            # Initialize other components with better error handling
            try:
                self.gemini_analyzer = await get_gemini_analyzer()
                if self.gemini_analyzer:
                    await self.gemini_analyzer.initialize()
                    logger.info("Gemini analyzer initialized successfully")
                else:
                    logger.warning("Gemini analyzer not available")
            except Exception as analyzer_error:
                logger.warning(f"Failed to initialize Gemini analyzer: {analyzer_error}")
                self.gemini_analyzer = None
            
            try:
                self.supabase_client = await get_supabase_client()
                if self.supabase_client:
                    await self.supabase_client.initialize()
                    logger.info("Supabase client initialized successfully")
                else:
                    logger.warning("Supabase client not available")
            except Exception as supabase_error:
                logger.warning(f"Failed to initialize Supabase client: {supabase_error}")
                self.supabase_client = None
            
            try:
                self.sui_client = await get_sui_client()
                logger.info("Sui client initialized successfully")
            except Exception as sui_error:
                logger.warning(f"Failed to initialize Sui client: {sui_error}")
                self.sui_client = None
            
            # Mark as initialized even if some components failed
            self.initialized = True
            logger.info("Unified fraud detector initialization completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize fraud detector: {e}")
            # Still mark as initialized to allow fallback analysis
            self.initialized = True
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
            logger.info(f"Image analysis keys: {list(image_analysis.keys())}")
            logger.info(f"Embedding in image analysis: {image_analysis.get('embedding') is not None}")
            if image_analysis.get('embedding'):
                logger.info(f"Embedding dimension: {len(image_analysis['embedding'])}")
            
            # Step 2: Description Embedding and Similarity Search
            similarity_results = await self._check_similarity(nft_data, image_analysis)
            
            # Step 3: Metadata Analysis
            metadata_analysis = await self._analyze_metadata(nft_data)
            
            # Step 4: LLM-based Final Fraud Decision
            fraud_decision = await self._make_llm_fraud_decision(
                nft_data, image_analysis, similarity_results, metadata_analysis
            )
            
            # Prepare comprehensive result with detailed image analysis
            result = {
                "is_fraud": fraud_decision.get("is_fraud", False),
                "confidence_score": fraud_decision.get("confidence_score", 0.0),
                "flag_type": fraud_decision.get("flag_type"),
                "reason": fraud_decision.get("reason", "Analysis completed"),
                "analysis_details": {
                    "image_analysis": {
                        "description": image_analysis.get("description", ""),
                        "artistic_style": image_analysis.get("artistic_style", ""),
                        "quality_assessment": image_analysis.get("quality_assessment", ""),
                        "fraud_indicators": image_analysis.get("fraud_indicators", {}),
                        "overall_fraud_score": image_analysis.get("overall_fraud_score", 0.0),
                        "risk_level": image_analysis.get("risk_level", "unknown"),
                        "key_visual_elements": image_analysis.get("key_visual_elements", []),
                        "color_palette": image_analysis.get("color_palette", []),
                        "composition_analysis": image_analysis.get("composition_analysis", ""),
                        "uniqueness_score": image_analysis.get("uniqueness_score", 0.0),
                        "artistic_merit": image_analysis.get("artistic_merit", ""),
                        "technical_quality": image_analysis.get("technical_quality", ""),
                        "market_value_assessment": image_analysis.get("market_value_assessment", ""),
                        "recommendation": image_analysis.get("recommendation", ""),
                        "confidence_in_analysis": image_analysis.get("confidence_in_analysis", 0.0),
                        "additional_notes": image_analysis.get("additional_notes", ""),
                        "embedding": image_analysis.get("embedding", []),
                        "embedding_dimension": image_analysis.get("embedding_dimension", 0)
                    },
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
                "analysis_details": {
                    "image_analysis": {
                        "description": f"Error analyzing image: {str(e)}",
                        "artistic_style": "unknown",
                        "quality_assessment": "Analysis failed",
                        "fraud_indicators": {},
                        "overall_fraud_score": 0.0,
                        "risk_level": "unknown",
                        "key_visual_elements": [],
                        "color_palette": [],
                        "composition_analysis": "Analysis failed",
                        "uniqueness_score": 0.0,
                        "artistic_merit": "Analysis failed",
                        "technical_quality": "Analysis failed",
                        "market_value_assessment": "Analysis failed",
                        "recommendation": "Manual review required",
                        "confidence_in_analysis": 0.0,
                        "additional_notes": f"Error: {str(e)}",
                        "embedding": [],
                        "embedding_dimension": 0
                    },
                    "similarity_results": {"error": str(e)},
                    "metadata_analysis": {"error": str(e)},
                    "llm_decision": {"error": str(e)},
                    "analysis_timestamp": datetime.now().isoformat(),
                    "error": str(e)
                }
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
                "description": f"Image analysis for {nft_data.title} - Gemini analyzer not available",
                "artistic_style": "unknown",
                "quality_assessment": "Analysis not available",
                "fraud_indicators": {
                    "low_effort_generation": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis not available"
                    },
                    "stolen_artwork": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis not available"
                    },
                    "ai_generated": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis not available"
                    },
                    "template_usage": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis not available"
                    },
                    "metadata_mismatch": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis not available"
                    }
                },
                "overall_fraud_score": 0.0,
                "risk_level": "unknown",
                "key_visual_elements": [],
                "color_palette": [],
                "composition_analysis": "Analysis not available",
                "uniqueness_score": 0.0,
                "artistic_merit": "Analysis not available",
                "technical_quality": "Analysis not available",
                "market_value_assessment": "Analysis not available",
                "recommendation": "Manual review required - Gemini analyzer not available",
                "confidence_in_analysis": 0.0,
                "additional_notes": "Gemini analyzer not available for detailed image analysis"
            }
            
        except Exception as e:
            logger.error(f"Error in image analysis: {e}")
            return {
                "description": f"Error analyzing {nft_data.title}",
                "artistic_style": "unknown",
                "quality_assessment": "Analysis failed",
                "fraud_indicators": {
                    "low_effort_generation": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis failed"
                    },
                    "stolen_artwork": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis failed"
                    },
                    "ai_generated": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis failed"
                    },
                    "template_usage": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis failed"
                    },
                    "metadata_mismatch": {
                        "detected": False,
                        "confidence": 0.0,
                        "evidence": "Analysis failed"
                    }
                },
                "overall_fraud_score": 0.0,
                "risk_level": "unknown",
                "key_visual_elements": [],
                "color_palette": [],
                "composition_analysis": "Analysis failed",
                "uniqueness_score": 0.0,
                "artistic_merit": "Analysis failed",
                "technical_quality": "Analysis failed",
                "market_value_assessment": "Analysis failed",
                "recommendation": "Manual review required - Analysis error",
                "confidence_in_analysis": 0.0,
                "additional_notes": f"Error: {str(e)}"
            }
    
    async def _check_similarity(self, nft_data: NFTData, image_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Step 2: Check for similar NFTs using embeddings and store evidence URLs"""
        try:
            # Get embedding from image analysis
            embedding = image_analysis.get("embedding")
            if not embedding:
                logger.warning("No embedding available for similarity search")
                return {
                    "similar_nfts": [],
                    "max_similarity": 0.0,
                    "is_duplicate": False,
                    "similarity_count": 0,
                    "evidence_urls": []
                }
            
            # Import database session for similarity search
            try:
                from database.connection import get_db
                from sqlalchemy.orm import Session
                from sqlalchemy import text
                import numpy as np
            except ImportError:
                logger.warning("Database dependencies not available for similarity search")
                return {
                    "similar_nfts": [],
                    "max_similarity": 0.0,
                    "is_duplicate": False,
                    "similarity_count": 0,
                    "evidence_urls": []
                }
            
            # Get database session
            try:
                from database.connection import get_db
            except ImportError:
                from backend.database.connection import get_db
            db_gen = get_db()
            db = next(db_gen)
            
            try:
                # Search for similar NFTs using vector similarity
                # Use PostgreSQL's vector similarity search on the embedding_vector column
                # For new NFTs, we don't have a valid UUID yet, so we exclude the current_nft_id check
                query = text("""
                    SELECT 
                        id,
                        title,
                        image_url,
                        creator_wallet_address,
                        embedding_vector <=> :embedding as distance
                    FROM nfts 
                    WHERE embedding_vector IS NOT NULL 
                    ORDER BY embedding_vector <=> :embedding
                    LIMIT 10
                """)
                
                # Convert embedding to PostgreSQL vector format
                embedding_str = f"[{','.join(map(str, embedding))}]"
                
                result = db.execute(query, {
                    "embedding": embedding_str
                })
                
                similar_nfts = []
                evidence_urls = []
                max_similarity = 0.0
                
                for row in result:
                    # Convert distance to similarity (1 - distance)
                    distance = float(row.distance)
                    similarity = 1.0 - distance
                    
                    if similarity >= 0.7:  # Threshold for similar NFTs
                        similar_nft = {
                            "nft_id": str(row.id),
                            "metadata": {
                                "name": row.title,
                                "creator": row.creator_wallet_address,
                                "image_url": row.image_url
                            },
                            "similarity": similarity
                        }
                        similar_nfts.append(similar_nft)
                        evidence_urls.append(row.image_url)
                        max_similarity = max(max_similarity, similarity)
                
                # Determine if this is a duplicate based on high similarity
                is_duplicate = max_similarity > 0.95
                
                logger.info(f"Found {len(similar_nfts)} similar NFTs, max similarity: {max_similarity:.3f}")
                
                return {
                    "similar_nfts": similar_nfts,
                    "max_similarity": max_similarity,
                    "is_duplicate": is_duplicate,
                    "similarity_count": len(similar_nfts),
                    "evidence_urls": evidence_urls
                }
                
            except Exception as db_error:
                logger.error(f"Database similarity search error: {db_error}")
                # Return empty results when database search fails
                return {
                    "similar_nfts": [],
                    "max_similarity": 0.0,
                    "is_duplicate": False,
                    "similarity_count": 0,
                    "evidence_urls": [],
                    "error": f"Database search failed: {str(db_error)}"
                }
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Error in similarity check: {e}")
            return {
                "similar_nfts": [],
                "max_similarity": 0.0,
                "is_duplicate": False,
                "similarity_count": 0,
                "evidence_urls": [],
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
            5. Reduce strictness for new or unverified creators
            6. Reduce strictness when indicating fraud
            
            Respond in JSON format:
            {{
                "quality_score": 0.0-1.0,
                "suspicious_indicators": ["list of concerns"],
                "metadata_risk": 0.0-1.0,
                "analysis": "brief explanation"
            }}
            """
            
            response = await self.llm.ainvoke(metadata_prompt)
            logger.info("=" * 80)
            logger.info("LLM METADATA ANALYSIS RESPONSE:")
            logger.info("=" * 80)
            logger.info(response.content)
            logger.info("=" * 80)
            
            try:
                import json
                
                # Clean and extract JSON from response
                response_text = response.content.strip()
                
                # If response is empty or contains only whitespace
                if not response_text:
                    logger.warning("LLM returned empty response for metadata analysis")
                    return {
                        "quality_score": 0.5,
                        "suspicious_indicators": ["Empty LLM response"],
                        "metadata_risk": 0.2,
                        "analysis": "Fallback analysis used due to empty response"
                    }
                
                # Try to extract JSON from markdown code blocks if present
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    if json_end != -1:
                        response_text = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    if json_end != -1:
                        response_text = response_text[json_start:json_end].strip()
                
                metadata_analysis = json.loads(response_text)
                
                # Validate the response
                if not isinstance(metadata_analysis.get("quality_score"), (int, float)):
                    metadata_analysis["quality_score"] = 0.5
                if not isinstance(metadata_analysis.get("metadata_risk"), (int, float)):
                    metadata_analysis["metadata_risk"] = 0.1
                if not isinstance(metadata_analysis.get("suspicious_indicators"), list):
                    metadata_analysis["suspicious_indicators"] = []
                
                return metadata_analysis
                
            except Exception as parse_error:
                logger.warning(f"Failed to parse LLM metadata response: {parse_error}")
                logger.warning(f"Raw metadata response: {response.content[:200] if hasattr(response, 'content') else 'No content'}")
                # Fallback if JSON parsing fails
                return {
                    "quality_score": 0.5,
                    "suspicious_indicators": ["LLM response parsing failed"],
                    "metadata_risk": 0.2,
                    "analysis": "Fallback analysis used due to parsing error"
                }
            
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
            Consider the following guidelines:
            1. Be lenient with image-based fraud indicators unless there's strong evidence
            2. AI-generated art should not automatically be considered fraudulent
            3. Consider artistic interpretation and stylistic choices
            4. Focus more on exact duplicates rather than similar styles
            5. Give benefit of doubt to new creators
            
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
            
            Make a balanced fraud determination, being especially careful not to over-flag based on image analysis alone.
            Only flag as fraud if there is clear and convincing evidence, particularly for image-based concerns.
            
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
            logger.info("=" * 80)
            logger.info("LLM FRAUD DECISION RESPONSE:")
            logger.info("=" * 80)
            logger.info(response.content)
            logger.info("=" * 80)
            try:
                import json
                
                # Clean and extract JSON from response
                response_text = response.content.strip()
                logger.info(f"LLM raw response: {response_text[:500]}...")  # Log first 500 chars
                
                # If response is empty or contains only whitespace
                if not response_text:
                    logger.warning("LLM returned empty response")
                    return self._get_safe_fallback_decision(nft_data, image_analysis, similarity_results, metadata_analysis)
                
                # Try to extract JSON from markdown code blocks if present
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    if json_end != -1:
                        response_text = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    if json_end != -1:
                        response_text = response_text[json_start:json_end].strip()
                
                fraud_decision = json.loads(response_text)
                
                # Validate the response and ensure logical consistency
                if not isinstance(fraud_decision.get("is_fraud"), bool):
                    fraud_decision["is_fraud"] = False
                if not isinstance(fraud_decision.get("confidence_score"), (int, float)):
                    fraud_decision["confidence_score"] = 0.0
                
                # Fix logical inconsistency: if confidence is high and recommendation is FLAG, is_fraud should be true
                confidence_score = fraud_decision.get("confidence_score", 0.0)
                recommendation = fraud_decision.get("recommendation", "").upper()
                
                if confidence_score >= 0.7 and recommendation in ["FLAG", "BLOCK"]:
                    fraud_decision["is_fraud"] = True
                    logger.info(f"Fixed logical inconsistency: confidence={confidence_score}, recommendation={recommendation} -> is_fraud=True")
                elif confidence_score < 0.3 and recommendation == "ALLOW":
                    fraud_decision["is_fraud"] = False
                    logger.info(f"Fixed logical inconsistency: confidence={confidence_score}, recommendation={recommendation} -> is_fraud=False")
                
                return fraud_decision
                
            except Exception as parse_error:
                logger.warning(f"Failed to parse LLM decision: {parse_error}")
                logger.warning(f"Raw response: {response.content[:200] if hasattr(response, 'content') else 'No content'}")
                # Use intelligent fallback decision
                return self._get_safe_fallback_decision(nft_data, image_analysis, similarity_results, metadata_analysis)
            
        except Exception as e:
            logger.error(f"Error in LLM fraud decision: {e}")
            return {
                "is_fraud": False,
                "confidence_score": 0.0,
                "flag_type": None,
                "reason": f"Decision analysis error: {str(e)}",
                "error": str(e)
            }

    def _get_safe_fallback_decision(self, nft_data: NFTData, image_analysis: Dict, similarity_results: Dict, metadata_analysis: Dict) -> Dict[str, Any]:
        """Generate a safe fallback decision when LLM parsing fails"""
        # Use combined heuristic approach
        image_risk = image_analysis.get("overall_fraud_score", 0.0) if image_analysis else 0.0
        similarity_risk = similarity_results.get("max_similarity", 0.0) if similarity_results else 0.0
        metadata_risk = metadata_analysis.get("metadata_risk", 0.0) if metadata_analysis else 0.0
        
        # Weight the different factors
        combined_risk = (image_risk * 0.5) + (similarity_risk * 0.3) + (metadata_risk * 0.2)
        
        # Conservative approach - only flag if multiple indicators
        is_fraud = combined_risk > 0.7
        confidence_score = min(combined_risk, 0.8)  # Cap confidence since we're using fallback
        
        flag_type = None
        if combined_risk > 0.8:
            flag_type = 1  # High risk
        elif combined_risk > 0.6:
            flag_type = 2  # Medium risk
        
        reason = f"Fallback analysis (LLM unavailable) - Combined risk: {combined_risk:.2f}"
        if similarity_results.get("is_duplicate"):
            reason += " - Potential duplicate detected"
        
        return {
            "is_fraud": is_fraud,
            "confidence_score": confidence_score,
            "flag_type": flag_type,
            "reason": reason,
            "recommendation": "MANUAL_REVIEW" if combined_risk > 0.5 else "ALLOW",
            "fallback_used": True
        }


# Global fraud detector instance
unified_fraud_detector = UnifiedFraudDetector()


async def initialize_fraud_detector() -> bool:
    """Initialize the unified fraud detector"""
    return await unified_fraud_detector.initialize()


async def analyze_nft_for_fraud(nft_data: NFTData, nft_id: str = None, db_session = None) -> Dict[str, Any]:
    """
    Unified NFT fraud analysis using Google Gemini LLM
    
    This function integrates all fraud detection components:
    1. Image analysis with Gemini Vision
    2. Description embedding and similarity search  
    3. Metadata quality analysis
    4. LLM-based final fraud decision
    
    Args:
        nft_data: NFT data to analyze
        nft_id: Optional NFT ID for database updates
        db_session: Optional database session for updates
    
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
        
        # Update database if NFT ID and session are provided
        if nft_id and db_session:
            try:
                from models.database import NFT
                nft = db_session.query(NFT).filter(NFT.id == nft_id).first()
                if nft:
                    # Update NFT with analysis results
                    nft.analysis_details = result.get("analysis_details", {})
                    nft.analysis_details.update({
                        "status": "completed",
                        "analyzed_at": datetime.now().isoformat(),
                        "is_fraud": result.get("is_fraud", False),
                        "confidence_score": result.get("confidence_score", 0.0),
                        "flag_type": result.get("flag_type"),
                        "reason": result.get("reason", "Analysis completed")
                    })
                    
                    # Update embedding vector if available
                    logger.info(f"Checking for embedding in result structure...")
                    logger.info(f"Result keys: {list(result.keys())}")
                    if "analysis_details" in result:
                        logger.info(f"Analysis details keys: {list(result['analysis_details'].keys())}")
                        if "image_analysis" in result["analysis_details"]:
                            logger.info(f"Image analysis keys: {list(result['analysis_details']['image_analysis'].keys())}")
                    
                    if "image_analysis" in result.get("analysis_details", {}) and "embedding" in result["analysis_details"]["image_analysis"]:
                        embedding = result["analysis_details"]["image_analysis"]["embedding"]
                        logger.info(f"Found embedding for NFT {nft_id}, dimension: {len(embedding) if embedding else 0}")
                        nft.embedding_vector = embedding
                    else:
                        logger.warning(f"No embedding found in analysis results for NFT {nft_id}")
                        logger.warning(f"Available keys in image_analysis: {list(result.get('analysis_details', {}).get('image_analysis', {}).keys())}")
                    
                    db_session.commit()
                    logger.info(f"Updated NFT {nft_id} with analysis results")
                else:
                    logger.warning(f"NFT {nft_id} not found for database update")
            except Exception as db_error:
                logger.error(f"Error updating NFT {nft_id} in database: {db_error}")
                if db_session:
                    db_session.rollback()
        
        logger.info(f"Unified fraud analysis complete: is_fraud={result['is_fraud']}, confidence={result['confidence_score']:.2f}")
        return result

    except Exception as e:
        logger.error(f"Error in unified fraud analysis: {e}")
        # Return safe default values on error with proper image analysis structure
        return {
            "is_fraud": False,
            "confidence_score": 0.0,
            "flag_type": None,
            "reason": f"Analysis error: {str(e)}",
            "analysis_details": {
                "image_analysis": {
                    "description": f"Error in unified analysis: {str(e)}",
                    "artistic_style": "unknown",
                    "quality_assessment": "Analysis failed",
                    "fraud_indicators": {
                        "low_effort_generation": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        },
                        "stolen_artwork": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        },
                        "ai_generated": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        },
                        "template_usage": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        },
                        "metadata_mismatch": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        },
                        "copyright_violation": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        },
                        "inappropriate_content": {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Analysis failed"
                        }
                    },
                    "overall_fraud_score": 0.0,
                    "risk_level": "unknown",
                    "key_visual_elements": [],
                    "color_palette": [],
                    "composition_analysis": "Analysis failed",
                    "uniqueness_score": 0.0,
                    "artistic_merit": "Analysis failed",
                    "technical_quality": "Analysis failed",
                    "market_value_assessment": "Analysis failed",
                    "recommendation": "Manual review required",
                    "confidence_in_analysis": 0.0,
                    "additional_notes": f"Unified analysis error: {str(e)}",
                    "embedding": [],
                    "embedding_dimension": 0
                },
                "similarity_results": {"error": str(e)},
                "metadata_analysis": {"error": str(e)},
                "llm_decision": {"error": str(e)},
                "analysis_timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        }