"""
Google Gemini Image Analysis Service for FraudGuard
Extracts detailed descriptions from NFT images for fraud detection analysis
"""

import logging
import base64
import asyncio
from typing import Dict, Any, Optional, List
from io import BytesIO
import json
from dotenv import load_dotenv
load_dotenv()
import os
try:
    import requests
    from PIL import Image
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    from langchain.schema import HumanMessage
except ImportError as e:
    logging.warning(f"Missing dependencies for Gemini analysis: {e}")
    requests = None
    Image = None
    ChatGoogleGenerativeAI = None
    GoogleGenerativeAIEmbeddings = None
    HumanMessage = None

try:
    from core.config import settings
except ImportError:
    from backend.core.config import settings

logger = logging.getLogger(__name__)


class GeminiImageAnalyzer:
    """Google Gemini-powered image analysis for fraud detection"""
    
    def __init__(self):
        self.gemini_chat = None
        self.embeddings = None
        self.initialized = False
        
    async def initialize(self) -> bool:
        """Initialize Gemini models"""
        try:
            logger.info("Initializing Gemini image analyzer...")
            
            if not ChatGoogleGenerativeAI or not GoogleGenerativeAIEmbeddings:
                logger.warning("Gemini dependencies not available, using mock analyzer")
                self.initialized = True
                return True
            
            if not settings.google_api_key:
                logger.warning("Google API key not configured, using mock analyzer")
                self.initialized = True
                return True
            
            # Initialize Gemini Pro for multimodal analysis
            try:
                self.gemini_chat = ChatGoogleGenerativeAI(
                    model=settings.google_model or "gemini-1.5-pro-latest",
                    google_api_key=settings.google_api_key,
                    temperature=0.1,  # Low temperature for consistent analysis
                    max_tokens=1000
                )
                logger.info("Gemini chat model initialized successfully")
            except Exception as chat_error:
                logger.warning(f"Failed to initialize Gemini chat model: {chat_error}")
                self.gemini_chat = None
            
            # Initialize Google embeddings
            try:
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model=settings.gemini_embedding_model or "models/embedding-001",
                    google_api_key=settings.google_api_key
                )
                logger.info("Gemini embeddings model initialized successfully")
            except Exception as embed_error:
                logger.warning(f"Failed to initialize Gemini embeddings: {embed_error}")
                self.embeddings = None
            
            self.initialized = True
            logger.info("Gemini image analyzer initialization completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini analyzer: {e}")
            # Still mark as initialized to allow fallback analysis
            self.initialized = True
            return False
    
    async def analyze_nft_image(self, image_url: str, nft_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze NFT image for fraud detection using Gemini Pro Vision
        Returns comprehensive analysis including description and fraud indicators
        """
        try:
            if not self.initialized:
                await self.initialize()
            
            # Download and prepare image
            image_data = await self._download_image(image_url)
            if not image_data:
                raise Exception(f"Failed to download or process image: {image_url}")
            
            # Create fraud detection prompt
            prompt = self._create_fraud_analysis_prompt(nft_metadata)
            
            if not self.gemini_chat:
                raise Exception("Gemini chat model not available")
            
            # Analyze image with Gemini
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                ]
            )
            
            response = await self.gemini_chat.ainvoke([message])
            analysis_text = response.content
            
            # Parse Gemini response into structured format
            structured_analysis = self._parse_gemini_response(analysis_text)
            
            # Generate embeddings for the description
            if self.embeddings and structured_analysis.get("description"):
                embedding = await self.embeddings.aembed_query(structured_analysis["description"])
                structured_analysis["embedding"] = embedding
                structured_analysis["embedding_dimension"] = len(embedding)
            
            logger.info(f"Completed Gemini analysis for image: {image_url}")
            return structured_analysis
            
        except Exception as e:
            logger.error(f"Error in Gemini image analysis: {e}")
            raise e
    
    def _create_fraud_analysis_prompt(self, nft_metadata: Dict[str, Any]) -> str:
        """Create a comprehensive prompt for fraud detection analysis"""
        
        prompt = f"""
You are an expert NFT fraud detection analyst with deep expertise in digital art, blockchain technology, and fraud detection. Analyze this NFT image for potential fraud indicators with extreme attention to detail.

NFT Metadata:
- Title: {nft_metadata.get('title', nft_metadata.get('name', 'Unknown'))}
- Creator: {nft_metadata.get('creator', 'Unknown')}
- Collection: {nft_metadata.get('collection', nft_metadata.get('category', 'Unknown'))}
- Description: {nft_metadata.get('description', 'No description provided')}
- Category: {nft_metadata.get('category', 'Unknown')}

Please provide a comprehensive analysis in the following JSON format:

{{
    "description": "Extremely detailed visual description of the image (minimum 200 words). Include all visual elements, colors, composition, style, textures, lighting, perspective, and any text or symbols visible. Describe the artistic technique, medium, and overall aesthetic quality.",
    "artistic_style": "Detailed art style classification (e.g., pixel art, 3D render, photography, digital art, oil painting, watercolor, etc.) with specific style references",
    "quality_assessment": "Comprehensive image quality rating (1-10) with detailed technical analysis including resolution, color depth, compression artifacts, and overall production value",
    "fraud_indicators": {{
        "low_effort_generation": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Detailed analysis of effort level, complexity, originality, and artistic merit"
        }},
        "stolen_artwork": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Analysis of watermarks, signatures, style inconsistencies, reverse image search indicators, and plagiarism signs"
        }},
        "ai_generated": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Identification of AI generation artifacts, unnatural patterns, inconsistencies, and typical AI-generated characteristics"
        }},
        "template_usage": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Detection of generic templates, common patterns, mass-produced elements, and lack of originality"
        }},
        "metadata_mismatch": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Analysis of whether the image content matches the claimed title, description, and category"
        }},
        "copyright_violation": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Signs of copyrighted characters, logos, brands, or protected intellectual property"
        }},
        "inappropriate_content": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Detection of NSFW content, violence, hate speech, or other inappropriate material"
        }}
    }},
    "overall_fraud_score": 0.0-1.0,
    "risk_level": "low/medium/high/critical",
    "key_visual_elements": ["comprehensive", "list", "of", "all", "important", "visual", "elements", "and", "features"],
    "color_palette": ["detailed", "analysis", "of", "color", "scheme", "and", "palette"],
    "composition_analysis": "In-depth analysis of image composition, layout, focal points, balance, and visual hierarchy",
    "uniqueness_score": 0.0-1.0,
    "artistic_merit": "Assessment of artistic value, creativity, skill level, and cultural significance",
    "technical_quality": "Detailed technical analysis including resolution, file quality, compression, and production standards",
    "market_value_assessment": "Estimation of fair market value based on artistic merit, rarity, and market trends",
    "recommendation": "Clear, actionable recommendation based on comprehensive analysis with specific next steps",
    "confidence_in_analysis": 0.0-1.0,
    "additional_notes": "Any additional observations, concerns, or positive aspects not covered above"
}}

Focus on identifying:
1. Signs of plagiarism, stolen content, or copyright violations
2. Low-effort AI generation or mass-produced content
3. Template reuse and lack of originality
4. Metadata inconsistencies and misrepresentations
5. Quality and artistic merit assessment
6. Uniqueness and cultural significance
7. Technical quality and production standards
8. Market value and authenticity indicators
9. Inappropriate or harmful content
10. Signs of automated or bulk generation

Be extremely thorough and provide specific, detailed evidence for each fraud indicator. Consider the broader context of NFT markets, digital art trends, and blockchain authenticity. Your analysis should be comprehensive enough to support legal and commercial decisions.
"""
        return prompt
    
    async def _download_image(self, image_url: str) -> Optional[str]:
        """Download image and convert to base64"""
        try:
            if not requests or not Image:
                logger.warning("Required dependencies (requests, PIL) not available")
                return None
            
            logger.info(f"Downloading image from: {image_url}")
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            logger.info(f"Image downloaded successfully, size: {len(response.content)} bytes")
            
            # Process image
            image = Image.open(BytesIO(response.content))
            logger.info(f"Image opened successfully, format: {image.format}, size: {image.size}, mode: {image.mode}")
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                logger.info(f"Converting image from {image.mode} to RGB")
                image = image.convert('RGB')
            
            # Resize if too large (Gemini has size limits)
            max_size = (1024, 1024)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                logger.info(f"Resizing image from {image.size} to max {max_size}")
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to base64
            buffer = BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()
            
            base64_data = base64.b64encode(image_bytes).decode('utf-8')
            logger.info(f"Image converted to base64, length: {len(base64_data)}")
            
            return base64_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error downloading image: {e}")
            return None
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return None
    
    def _parse_gemini_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini response into structured format"""
        try:
            # Try to extract JSON from response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_text = response_text[start_idx:end_idx]
                parsed = json.loads(json_text)
                
                # Validate required fields
                if not parsed.get("description"):
                    parsed["description"] = "Could not extract detailed description"
                
                # Calculate overall fraud indicators
                fraud_indicators = parsed.get("fraud_indicators", {})
                fraud_scores = []
                
                for indicator, details in fraud_indicators.items():
                    if isinstance(details, dict) and details.get("detected"):
                        fraud_scores.append(details.get("confidence", 0.0))
                
                if fraud_scores:
                    parsed["overall_fraud_score"] = max(fraud_scores)
                else:
                    parsed["overall_fraud_score"] = 0.0
                
                return parsed
            
            # If no JSON found, raise an exception
            raise Exception(f"Could not parse JSON from Gemini response: {response_text[:200]}...")
            
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            raise e
    
    def _mock_analysis_result(self) -> Dict[str, Any]:
        """Return mock analysis for development/testing"""
        return {
            "description": "Mock NFT image analysis - detailed visual description of a digital artwork featuring vibrant colors and unique artistic elements. The composition shows careful attention to detail with balanced proportions and creative use of space.",
            "artistic_style": "digital art",
            "quality_assessment": "High quality digital artwork with good resolution and clear details",
            "fraud_indicators": {
                "low_effort_generation": {
                    "detected": False,
                    "confidence": 0.2,
                    "evidence": "Shows artistic effort and creativity"
                },
                "stolen_artwork": {
                    "detected": False,
                    "confidence": 0.1,
                    "evidence": "No obvious watermarks or style inconsistencies"
                },
                "ai_generated": {
                    "detected": False,
                    "confidence": 0.3,
                    "evidence": "No clear AI generation artifacts detected"
                },
                "template_usage": {
                    "detected": False,
                    "confidence": 0.1,
                    "evidence": "Appears to be original composition"
                },
                "metadata_mismatch": {
                    "detected": False,
                    "confidence": 0.0,
                    "evidence": "Image matches provided metadata"
                }
            },
            "overall_fraud_score": 0.3,
            "risk_level": "low",
            "key_visual_elements": ["colors", "shapes", "composition"],
            "color_palette": ["blue", "purple", "gold"],
            "composition_analysis": "Well-balanced composition with focal points",
            "uniqueness_score": 0.8,
            "recommendation": "Low fraud risk - appears legitimate",
            "embedding": [0.1] * 768,  # Mock embedding
            "embedding_dimension": 768
        }
    
    async def extract_image_description(self, image_url: str) -> str:
        """Extract simple description for embedding (simplified version)"""
        try:
            if not self.initialized:
                await self.initialize()
            
            # Download and prepare image
            image_data = await self._download_image(image_url)
            if not image_data:
                raise Exception(f"Could not download image: {image_url}")
            
            if not self.gemini_chat:
                raise Exception("Gemini chat not available")
            
            # Use a simpler prompt for description extraction
            simple_prompt = """
            Please provide a detailed visual description of this image. Focus on:
            - What you see in the image
            - Colors and visual elements
            - Style and composition
            - Any text or symbols visible
            
            Provide a clear, descriptive response in plain text (no JSON formatting).
            """
            
            # Analyze image with Gemini using simpler prompt
            message = HumanMessage(
                content=[
                    {"type": "text", "text": simple_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                ]
            )
            
            response = await self.gemini_chat.ainvoke([message])
            description = response.content.strip()
            
            if description and len(description) > 10:
                logger.info(f"Successfully extracted description: {description[:100]}...")
                return description
            else:
                raise Exception(f"Empty or too short description from Gemini: '{description}'")
                
        except Exception as e:
            logger.error(f"Error extracting image description: {e}")
            raise e
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embeddings for text using Google embeddings"""
        try:
            if not self.embeddings:
                raise Exception("Gemini embeddings model not available")
            
            embedding = await self.embeddings.aembed_query(text)
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise e
    
    async def batch_embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            if not self.embeddings:
                raise Exception("Gemini embeddings model not available")
            
            embeddings = await self.embeddings.aembed_documents(texts)
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise e


# Global analyzer instance
gemini_analyzer = GeminiImageAnalyzer()


async def initialize_gemini_analyzer() -> bool:
    """Initialize the global Gemini analyzer"""
    return await gemini_analyzer.initialize()


async def get_gemini_analyzer() -> GeminiImageAnalyzer:
    """Get the global Gemini analyzer instance"""
    return gemini_analyzer
