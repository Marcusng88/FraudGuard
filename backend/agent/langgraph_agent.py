"""
LangGraph-based fraud detection agent for FraudGuard
Implements a stateful, multi-step agent workflow: See Event -> Analyze -> Decide -> Act
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any, TypedDict
from dataclasses import dataclass
from datetime import datetime

# Note: These imports will work once dependencies are installed
try:
    from langgraph.graph import StateGraph, END
    from langchain_core.messages import HumanMessage, AIMessage
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
except ImportError:
    # Fallback for development without dependencies
    StateGraph = None
    END = None
    HumanMessage = None
    AIMessage = None
    ChatGoogleGenerativeAI = None
    GoogleGenerativeAIEmbeddings = None
    ChatPromptTemplate = None
    JsonOutputParser = None

try:
    from core.config import settings
    from agent.sui_client import NFTData, sui_client
    from agent.supabase_client import supabase_client
except ImportError:
    from backend.core.config import settings
    from backend.agent.sui_client import NFTData, sui_client
    from backend.agent.supabase_client import supabase_client

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """State for the fraud detection agent"""
    nft_data: Dict[str, Any]
    image_analysis: Dict[str, Any]
    similarity_results: Dict[str, Any]
    behavior_analysis: Dict[str, Any]
    metadata_analysis: Dict[str, Any]
    fraud_decision: Dict[str, Any]
    messages: List[Dict[str, Any]]
    current_step: str
    error: Optional[str]


@dataclass
class FraudDetectionResult:
    """Result of the fraud detection workflow"""
    is_fraud: bool
    confidence_score: float
    flag_type: int
    reason: str
    evidence_url: str
    analysis_details: Dict[str, Any]


class FraudDetectionAgent:
    """LangGraph-based fraud detection agent"""
    
    def __init__(self):
        self.llm = None
        self.embeddings = None
        self.graph = None
        self.initialize_components()
    
    def initialize_components(self):
        """Initialize LangChain components"""
        try:
            # Check if Google API key is available
            google_api_key = settings.google_api_key if hasattr(settings, 'google_api_key') else None

            if ChatGoogleGenerativeAI and google_api_key:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    temperature=0.1,
                    google_api_key=google_api_key
                )

                # Use synchronous embeddings to avoid event loop conflicts
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=google_api_key
                )

                self.graph = self.create_workflow_graph()
                logger.info("LangGraph agent initialized with Google Gemini successfully")
            else:
                logger.warning("Google API key not configured, using simple rule-based analysis")
                self.graph = self.create_workflow_graph()  # Still create graph for structure
        except Exception as e:
            logger.error(f"Failed to initialize LangGraph components: {e}")
            self.graph = self.create_workflow_graph()  # Fallback to simple graph
    
    def create_workflow_graph(self):
        """Create the LangGraph workflow for fraud detection"""
        if not StateGraph:
            return None
            
        # Create the state graph
        workflow = StateGraph(AgentState)
        
        # Add nodes for each step
        workflow.add_node("analyze_image", self.analyze_image_step)
        workflow.add_node("check_similarity", self.check_similarity_step)
        workflow.add_node("analyze_behavior", self.analyze_behavior_step)
        workflow.add_node("analyze_metadata", self.analyze_metadata_step)
        workflow.add_node("make_decision", self.make_decision_step)
        workflow.add_node("create_flag", self.create_flag_step)
        
        # Define the workflow edges
        workflow.set_entry_point("analyze_image")
        workflow.add_edge("analyze_image", "check_similarity")
        workflow.add_edge("check_similarity", "analyze_behavior")
        workflow.add_edge("analyze_behavior", "analyze_metadata")
        workflow.add_edge("analyze_metadata", "make_decision")
        
        # Conditional edge based on fraud decision
        workflow.add_conditional_edges(
            "make_decision",
            self.should_create_flag,
            {
                "create_flag": "create_flag",
                "end": END
            }
        )
        workflow.add_edge("create_flag", END)
        
        return workflow.compile()
    
    async def analyze_image_step(self, state: AgentState) -> AgentState:
        """Step 1: Analyze the NFT image using AI"""
        try:
            logger.info("Step 1: Analyzing image with AI")
            state["current_step"] = "analyze_image"
            
            nft_data = state["nft_data"]
            image_url = nft_data["image_url"]
            logger.info(f"Analyzing image at URL: {image_url}")
            
            if not self.llm:
                # Mock analysis for development
                state["image_analysis"] = {
                    "is_ai_generated": False,
                    "content_type": "digital_art",
                    "quality_score": 0.8,
                    "suspicious_elements": [],
                    "analysis_confidence": 0.7,
                    "image_retrieved": True,
                    "image_url": image_url
                }
                logger.info("Using mock image analysis (no LLM configured)")
                return state
            
            # Verify image accessibility
            image_accessible = True
            try:
                import requests
                response = requests.head(image_url, timeout=10)
                if response.status_code != 200:
                    logger.warning(f"Image URL not accessible: {image_url} (status: {response.status_code})")
                    image_accessible = False
            except Exception as img_error:
                logger.warning(f"Could not verify image accessibility: {img_error}")
                image_accessible = False
            
            # Create prompt for image analysis
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert NFT fraud detection AI. Analyze the provided NFT for potential fraud indicators.
                
                Look for:
                1. Signs of AI generation
                2. Low quality or suspicious elements
                3. Potential copyright violations
                4. Misleading content
                5. Common fraud patterns
                
                Respond in JSON format with:
                - is_ai_generated (boolean)
                - content_type (string)
                - quality_score (0-1)
                - suspicious_elements (list of strings)
                - analysis_confidence (0-1)
                """),
                ("human", "NFT Name: {name}\nDescription: {description}\nImage URL: {image_url}\nImage Accessible: {image_accessible}")
            ])
            
            # Format the prompt
            formatted_prompt = prompt.format_messages(
                name=nft_data["name"],
                description=nft_data["description"],
                image_url=image_url,
                image_accessible=image_accessible
            )
            
            # Get AI analysis
            response = await self.llm.ainvoke(formatted_prompt)
            
            # Parse JSON response
            parser = JsonOutputParser()
            try:
                analysis_result = parser.parse(response.content)
                analysis_result["image_retrieved"] = image_accessible
                analysis_result["image_url"] = image_url
            except Exception as parse_error:
                logger.warning(f"Failed to parse AI response as JSON: {parse_error}")
                # Fallback analysis
                analysis_result = {
                    "is_ai_generated": False,
                    "content_type": "digital_art",
                    "quality_score": 0.6,
                    "suspicious_elements": ["AI response parsing failed"],
                    "analysis_confidence": 0.5,
                    "image_retrieved": image_accessible,
                    "image_url": image_url,
                    "parse_error": str(parse_error)
                }
            
            state["image_analysis"] = analysis_result
            state["messages"].append({
                "step": "analyze_image",
                "result": analysis_result,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Image analysis completed. AI Generated: {analysis_result.get('is_ai_generated')}, Quality: {analysis_result.get('quality_score')}")
            return state
            
        except Exception as e:
            logger.error(f"Error in image analysis step: {e}")
            state["error"] = f"Image analysis failed: {str(e)}"
            # Provide fallback analysis
            state["image_analysis"] = {
                "is_ai_generated": False,
                "content_type": "unknown",
                "quality_score": 0.5,
                "suspicious_elements": ["Analysis failed"],
                "analysis_confidence": 0.1,
                "error": str(e)
            }
            return state
    
    async def check_similarity_step(self, state: AgentState) -> AgentState:
        """Step 2: Check for image similarity using vector database"""
        try:
            logger.info("Step 2: Checking image similarity")
            state["current_step"] = "check_similarity"
            
            nft_data = state["nft_data"]
            
            if not self.embeddings:
                # Mock similarity check
                state["similarity_results"] = {
                    "is_similar": False,
                    "max_similarity": 0.3,
                    "similar_nfts": [],
                    "similarity_threshold": 0.85
                }
                return state
            
            # Download and process image
            image_url = nft_data["image_url"]
            logger.info(f"Processing image URL: {image_url}")
            
            # Generate embedding for the image (simplified - would need image-to-text first)
            image_description = f"NFT image: {nft_data['name']} - {nft_data['description']}"
            
            # Fix async/event loop issue by using sync embedding with proper error handling
            try:
                # Use embed_query instead of aembed_query to avoid event loop conflicts
                image_embedding = self.embeddings.embed_query(image_description)
                logger.info(f"Generated embedding of length: {len(image_embedding)}")
            except Exception as embed_error:
                logger.error(f"Error generating embedding: {embed_error}")
                # Fall back to mock embedding
                image_embedding = [0.0] * 1536  # Standard embedding dimension
                logger.info("Using mock embedding due to embedding error")
            
            # Search for similar images in Supabase vector database
            similar_results = await supabase_client.search_similar_images(
                embedding=image_embedding,
                threshold=0.85,
                limit=5
            )
            
            state["similarity_results"] = {
                "is_similar": len(similar_results) > 0,
                "max_similarity": max([r["similarity"] for r in similar_results]) if similar_results else 0.0,
                "similar_nfts": [r["nft_id"] for r in similar_results],
                "similarity_threshold": 0.85,
                "image_processed": True,
                "embedding_generated": len(image_embedding) > 0
            }
            
            state["messages"].append({
                "step": "check_similarity",
                "result": state["similarity_results"],
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Similarity check completed. Found {len(similar_results)} similar images")
            return state
            
        except Exception as e:
            logger.error(f"Error in similarity check step: {e}")
            state["error"] = f"Similarity check failed: {str(e)}"
            # Return state with error but continue workflow
            state["similarity_results"] = {
                "is_similar": False,
                "max_similarity": 0.0,
                "similar_nfts": [],
                "similarity_threshold": 0.85,
                "error": str(e)
            }
            return state
    
    async def analyze_behavior_step(self, state: AgentState) -> AgentState:
        """Step 3: Analyze wallet behavior patterns"""
        try:
            logger.info("Step 3: Analyzing behavior patterns")
            state["current_step"] = "analyze_behavior"
            
            nft_data = state["nft_data"]
            creator_address = nft_data["creator"]
            logger.info(f"Analyzing behavior for creator: {creator_address}")
            
            # Get wallet activity from Sui blockchain
            try:
                activity = await sui_client.get_wallet_activity(creator_address, hours=24)
                logger.info(f"Retrieved wallet activity: {len(activity.get('transactions', []))} transactions")
            except Exception as activity_error:
                logger.warning(f"Could not retrieve wallet activity: {activity_error}")
                activity = {"transactions": [], "error": str(activity_error)}
            
            # Analyze patterns using LLM
            if self.llm:
                # Use Google Gemini for behavior analysis
                prompt_text = f"""Analyze this wallet behavior for suspicious NFT minting patterns:

Wallet Address: {creator_address}
Wallet Activity: {str(activity)}
NFT Name: {nft_data["name"]}

Consider:
1. Minting frequency (too many NFTs in short time)
2. Collection diversity
3. Trading patterns
4. Account age vs activity

Respond in JSON format with:
- risk_score (0-1)
- suspicious_indicators (list of strings)
- behavior_type (string)"""

                try:
                    response = await self.llm.ainvoke(prompt_text)
                    # Try to parse JSON response
                    import json
                    behavior_analysis = json.loads(response.content)
                    logger.info(f"AI behavior analysis completed. Risk score: {behavior_analysis.get('risk_score', 'unknown')}")
                except Exception as ai_error:
                    logger.warning(f"AI behavior analysis failed: {ai_error}")
                    # Fallback if JSON parsing fails
                    behavior_analysis = {
                        "risk_score": 0.3,
                        "suspicious_indicators": ["AI analysis completed with fallback"],
                        "behavior_type": "analyzed_with_fallback",
                        "ai_error": str(ai_error)
                    }
            else:
                # Mock behavior analysis with some basic logic
                transaction_count = len(activity.get("transactions", []))
                behavior_analysis = {
                    "risk_score": min(0.1 + (transaction_count * 0.1), 0.8),
                    "suspicious_indicators": [] if transaction_count < 5 else ["High transaction frequency"],
                    "behavior_type": "mock_analysis",
                    "transaction_count": transaction_count
                }
                logger.info("Using mock behavior analysis (no LLM configured)")
            
            state["behavior_analysis"] = behavior_analysis
            state["messages"].append({
                "step": "analyze_behavior",
                "result": behavior_analysis,
                "timestamp": datetime.now().isoformat()
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Error in behavior analysis step: {e}")
            state["error"] = f"Behavior analysis failed: {str(e)}"
            # Provide fallback analysis
            state["behavior_analysis"] = {
                "risk_score": 0.2,
                "suspicious_indicators": ["Analysis failed"],
                "behavior_type": "error_fallback",
                "error": str(e)
            }
            return state
    
    async def analyze_metadata_step(self, state: AgentState) -> AgentState:
        """Step 4: Analyze NFT metadata for inconsistencies"""
        try:
            logger.info("Step 4: Analyzing metadata")
            state["current_step"] = "analyze_metadata"
            
            nft_data = state["nft_data"]
            logger.info(f"Analyzing metadata for NFT: {nft_data['name']}")
            
            if self.llm:
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """Analyze NFT metadata for fraud indicators.
                    
                    Look for:
                    1. Missing or incomplete metadata
                    2. Suspicious keywords
                    3. Inconsistencies between name, description, and image
                    4. Low-quality or generic descriptions
                    
                    Respond in JSON format with:
                    - risk_score (0-1)
                    - quality_assessment (string)
                    - suspicious_indicators (list of strings)
                    """),
                    ("human", "NFT Data: {nft_data}")
                ])
                
                formatted_prompt = prompt.format_messages(nft_data=str(nft_data))
                
                try:
                    response = await self.llm.ainvoke(formatted_prompt)
                    parser = JsonOutputParser()
                    metadata_analysis = parser.parse(response.content)
                    logger.info(f"AI metadata analysis completed. Risk score: {metadata_analysis.get('risk_score', 'unknown')}")
                except Exception as ai_error:
                    logger.warning(f"AI metadata analysis failed: {ai_error}")
                    # Fallback metadata analysis
                    metadata_analysis = {
                        "risk_score": 0.2,
                        "quality_assessment": "analysis_failed",
                        "suspicious_indicators": ["AI analysis failed"],
                        "ai_error": str(ai_error)
                    }
            else:
                # Mock metadata analysis with basic checks
                name_length = len(nft_data.get("name", ""))
                desc_length = len(nft_data.get("description", ""))
                
                # Basic quality checks
                quality_indicators = []
                risk_score = 0.0
                
                if name_length < 3:
                    quality_indicators.append("Very short name")
                    risk_score += 0.2
                
                if desc_length < 10:
                    quality_indicators.append("Very short description")
                    risk_score += 0.1
                
                # Check for suspicious keywords
                suspicious_words = ["copy", "fake", "replica", "stolen", "pirated"]
                text_to_check = f"{nft_data.get('name', '')} {nft_data.get('description', '')}".lower()
                
                for word in suspicious_words:
                    if word in text_to_check:
                        quality_indicators.append(f"Contains suspicious word: {word}")
                        risk_score += 0.3
                
                metadata_analysis = {
                    "risk_score": min(risk_score, 1.0),
                    "quality_assessment": "mock_analysis",
                    "suspicious_indicators": quality_indicators,
                    "name_length": name_length,
                    "description_length": desc_length
                }
                logger.info("Using mock metadata analysis (no LLM configured)")
            
            state["metadata_analysis"] = metadata_analysis
            state["messages"].append({
                "step": "analyze_metadata",
                "result": metadata_analysis,
                "timestamp": datetime.now().isoformat()
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Error in metadata analysis step: {e}")
            state["error"] = f"Metadata analysis failed: {str(e)}"
            # Provide fallback analysis
            state["metadata_analysis"] = {
                "risk_score": 0.1,
                "quality_assessment": "error_fallback",
                "suspicious_indicators": ["Analysis failed"],
                "error": str(e)
            }
            return state

    async def make_decision_step(self, state: AgentState) -> AgentState:
        """Step 5: Make final fraud decision based on all analyses"""
        try:
            logger.info("Step 5: Making fraud decision")
            state["current_step"] = "make_decision"

            # Gather all analysis results with safe defaults
            image_analysis = state.get("image_analysis", {})
            similarity_results = state.get("similarity_results", {})
            behavior_analysis = state.get("behavior_analysis", {})
            metadata_analysis = state.get("metadata_analysis", {})

            logger.info(f"Analysis summary - Image: {bool(image_analysis)}, Similarity: {bool(similarity_results)}, Behavior: {bool(behavior_analysis)}, Metadata: {bool(metadata_analysis)}")

            if self.llm:
                # Use Google Gemini for final fraud decision
                decision_prompt = f"""You are a fraud detection AI. Based on all analysis results, decide if this NFT is fraudulent.

Analysis Results:
Image Analysis: {str(image_analysis)}
Similarity Results: {str(similarity_results)}
Behavior Analysis: {str(behavior_analysis)}
Metadata Analysis: {str(metadata_analysis)}

Consider:
1. Image analysis results
2. Similarity to existing NFTs
3. Creator behavior patterns
4. Metadata quality

Respond in JSON format with:
- is_fraud (boolean)
- confidence_score (0-1)
- flag_type (1=plagiarism, 2=suspicious_activity, 3=fake_metadata, 4=ai_generated)
- reason (string explaining the decision)
- primary_concern (string)"""

                try:
                    response = await self.llm.ainvoke(decision_prompt)
                    import json
                    fraud_decision = json.loads(response.content)
                    logger.info(f"AI fraud decision: {fraud_decision.get('is_fraud', 'unknown')} (confidence: {fraud_decision.get('confidence_score', 'unknown')})")
                except Exception as ai_error:
                    logger.warning(f"AI decision failed, using fallback logic: {ai_error}")
                    # Fallback decision logic
                    similarity_score = similarity_results.get("max_similarity", 0.0)
                    behavior_risk = behavior_analysis.get("risk_score", 0.0)
                    metadata_risk = metadata_analysis.get("risk_score", 0.0)
                    image_risk = 0.3 if image_analysis.get("is_ai_generated", False) else 0.1

                    total_risk = (similarity_score * 0.4) + (behavior_risk * 0.25) + (metadata_risk * 0.25) + (image_risk * 0.1)

                    fraud_decision = {
                        "is_fraud": total_risk > 0.6,
                        "confidence_score": min(total_risk, 1.0),
                        "flag_type": 1 if similarity_score > 0.8 else 2 if behavior_risk > 0.5 else 3,
                        "reason": f"AI analysis with fallback scoring: {total_risk:.2f}",
                        "primary_concern": "similarity" if similarity_score > 0.8 else "behavior" if behavior_risk > 0.5 else "metadata",
                        "ai_error": str(ai_error)
                    }
            else:
                # Mock decision logic with detailed scoring
                similarity_score = similarity_results.get("max_similarity", 0.0)
                behavior_risk = behavior_analysis.get("risk_score", 0.0)
                metadata_risk = metadata_analysis.get("risk_score", 0.0)
                
                # Enhanced scoring with image analysis
                image_risk = 0.0
                if image_analysis.get("is_ai_generated", False):
                    image_risk += 0.3
                if image_analysis.get("quality_score", 1.0) < 0.5:
                    image_risk += 0.2
                if len(image_analysis.get("suspicious_elements", [])) > 0:
                    image_risk += 0.1

                # Weighted scoring algorithm
                total_risk = (similarity_score * 0.4) + (behavior_risk * 0.25) + (metadata_risk * 0.25) + (image_risk * 0.1)

                # Determine primary concern
                concerns = [
                    ("similarity", similarity_score),
                    ("behavior", behavior_risk),
                    ("metadata", metadata_risk),
                    ("image", image_risk)
                ]
                primary_concern = max(concerns, key=lambda x: x[1])[0]

                fraud_decision = {
                    "is_fraud": total_risk > 0.6,
                    "confidence_score": min(total_risk, 1.0),
                    "flag_type": 1 if similarity_score > 0.8 else 2 if behavior_risk > 0.5 else 3 if metadata_risk > 0.4 else 4,
                    "reason": f"Combined risk score: {total_risk:.2f} (similarity: {similarity_score:.2f}, behavior: {behavior_risk:.2f}, metadata: {metadata_risk:.2f}, image: {image_risk:.2f})",
                    "primary_concern": primary_concern,
                    "risk_breakdown": {
                        "similarity": similarity_score,
                        "behavior": behavior_risk,
                        "metadata": metadata_risk,
                        "image": image_risk,
                        "total": total_risk
                    }
                }
                logger.info("Using enhanced mock decision logic (no LLM configured)")

            state["fraud_decision"] = fraud_decision
            state["messages"].append({
                "step": "make_decision",
                "result": fraud_decision,
                "timestamp": datetime.now().isoformat()
            })

            logger.info(f"Final fraud decision: {'FRAUD' if fraud_decision['is_fraud'] else 'CLEAN'} (confidence: {fraud_decision['confidence_score']:.2f})")
            return state
            
        except Exception as e:
            logger.error(f"Error in decision making step: {e}")
            state["error"] = f"Decision making failed: {str(e)}"
            # Provide safe fallback decision
            state["fraud_decision"] = {
                "is_fraud": False,
                "confidence_score": 0.1,
                "flag_type": 0,
                "reason": f"Decision process failed: {str(e)}",
                "primary_concern": "system_error",
                "error": str(e)
            }
            return state

        except Exception as e:
            logger.error(f"Error in decision making step: {e}")
            state["error"] = f"Decision making failed: {str(e)}"
            return state

    async def create_flag_step(self, state: AgentState) -> AgentState:
        """Step 6: Create fraud flag on blockchain if fraud detected"""
        try:
            logger.info("Step 6: Creating fraud flag")
            state["current_step"] = "create_flag"

            nft_data = state["nft_data"]
            fraud_decision = state["fraud_decision"]

            # Create fraud flag on Sui blockchain
            flag_id = await sui_client.create_fraud_flag(
                nft_id=nft_data["object_id"],
                flag_type=fraud_decision["flag_type"],
                confidence_score=int(fraud_decision["confidence_score"] * 100),
                reason=fraud_decision["reason"],
                evidence_url=""  # Could store detailed analysis in cloud storage
            )

            if flag_id:
                logger.info(f"Fraud flag created successfully: {flag_id}")
                state["messages"].append({
                    "step": "create_flag",
                    "result": {"flag_id": flag_id, "status": "success"},
                    "timestamp": datetime.now().isoformat()
                })
            else:
                logger.error("Failed to create fraud flag")
                state["error"] = "Failed to create fraud flag on blockchain"

            return state

        except Exception as e:
            logger.error(f"Error in flag creation step: {e}")
            state["error"] = f"Flag creation failed: {str(e)}"
            return state

    def should_create_flag(self, state: AgentState) -> str:
        """Conditional logic to determine if fraud flag should be created"""
        fraud_decision = state.get("fraud_decision", {})

        if fraud_decision.get("is_fraud", False):
            return "create_flag"
        else:
            return "end"

    async def analyze_nft(self, nft_data: NFTData) -> FraudDetectionResult:
        """Main entry point for NFT fraud analysis using LangGraph workflow"""
        try:
            logger.info(f"Starting LangGraph fraud analysis for NFT: {nft_data.object_id}")

            if not self.graph:
                # Fallback to simple analysis if LangGraph not available
                return await self._simple_analysis(nft_data)

            # Initialize agent state
            initial_state = AgentState(
                nft_data={
                    "object_id": nft_data.object_id,
                    "name": nft_data.name,
                    "description": nft_data.description,
                    "image_url": nft_data.image_url,
                    "creator": nft_data.creator,
                    "created_at": nft_data.created_at,
                    "metadata": nft_data.metadata,
                    "collection": nft_data.collection
                },
                image_analysis={},
                similarity_results={},
                behavior_analysis={},
                metadata_analysis={},
                fraud_decision={},
                messages=[],
                current_step="",
                error=None
            )

            # Run the workflow
            final_state = await self.graph.ainvoke(initial_state)

            # Extract results
            fraud_decision = final_state.get("fraud_decision", {})

            return FraudDetectionResult(
                is_fraud=fraud_decision.get("is_fraud", False),
                confidence_score=fraud_decision.get("confidence_score", 0.0),
                flag_type=fraud_decision.get("flag_type", 0),
                reason=fraud_decision.get("reason", "Analysis completed"),
                evidence_url="",
                analysis_details={
                    "image_analysis": final_state.get("image_analysis", {}),
                    "similarity_results": final_state.get("similarity_results", {}),
                    "behavior_analysis": final_state.get("behavior_analysis", {}),
                    "metadata_analysis": final_state.get("metadata_analysis", {}),
                    "workflow_messages": final_state.get("messages", []),
                    "error": final_state.get("error")
                }
            )

        except Exception as e:
            logger.error(f"Error in LangGraph analysis: {e}")
            return FraudDetectionResult(
                is_fraud=False,
                confidence_score=0.0,
                flag_type=0,
                reason=f"Analysis failed: {str(e)}",
                evidence_url="",
                analysis_details={"error": str(e)}
            )

    async def _simple_analysis(self, nft_data: NFTData) -> FraudDetectionResult:
        """Fallback simple analysis when LangGraph is not available"""
        logger.info("Using simple analysis fallback")

        # Basic fraud indicators
        suspicious_keywords = ["copy", "fake", "replica", "stolen"]
        name_lower = nft_data.name.lower()
        desc_lower = nft_data.description.lower()

        is_suspicious = any(keyword in name_lower or keyword in desc_lower for keyword in suspicious_keywords)

        return FraudDetectionResult(
            is_fraud=is_suspicious,
            confidence_score=0.8 if is_suspicious else 0.1,
            flag_type=3 if is_suspicious else 0,  # Fake metadata
            reason="Suspicious keywords detected" if is_suspicious else "No obvious fraud indicators",
            evidence_url="",
            analysis_details={"method": "simple_fallback"}
        )


# Global agent instance
fraud_agent = FraudDetectionAgent()


async def analyze_nft_with_langgraph(nft_data: NFTData) -> FraudDetectionResult:
    """Analyze NFT using LangGraph workflow"""
    return await fraud_agent.analyze_nft(nft_data)
