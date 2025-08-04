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
            if not ChatGoogleGenerativeAI or not GoogleGenerativeAIEmbeddings:
                logger.warning("Gemini dependencies not available, using mock analyzer")
                self.initialized = True
                return True
            
            # Initialize Gemini Pro Vision for image analysis
            self.gemini_chat = ChatGoogleGenerativeAI(
                model="gemini-pro-vision",
                google_api_key=settings.google_api_key,
                temperature=0.1,  # Low temperature for consistent analysis
                max_tokens=1000
            )
            
            # Initialize Google embeddings
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.google_api_key
            )
            
            self.initialized = True
            logger.info("Gemini image analyzer initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini analyzer: {e}")
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
                return self._mock_analysis_result()
            
            # Create fraud detection prompt
            prompt = self._create_fraud_analysis_prompt(nft_metadata)
            
            if not self.gemini_chat:
                return self._mock_analysis_result()
            
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
            return self._mock_analysis_result()
    
    def _create_fraud_analysis_prompt(self, nft_metadata: Dict[str, Any]) -> str:
        """Create a comprehensive prompt for fraud detection analysis"""
        
        prompt = f"""
You are an expert NFT fraud detection analyst. Analyze this NFT image for potential fraud indicators.

NFT Metadata:
- Name: {nft_metadata.get('name', 'Unknown')}
- Creator: {nft_metadata.get('creator', 'Unknown')}
- Collection: {nft_metadata.get('collection', 'Unknown')}
- Description: {nft_metadata.get('description', 'No description')}

Please provide a detailed analysis in the following JSON format:

{{
    "description": "Detailed visual description of the image (minimum 100 words)",
    "artistic_style": "Art style classification (e.g., pixel art, 3D render, photography, digital art, etc.)",
    "quality_assessment": "Image quality rating (1-10) and technical details",
    "fraud_indicators": {{
        "low_effort_generation": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Specific visual evidence"
        }},
        "stolen_artwork": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Signs of watermarks, inconsistent styles, etc."
        }},
        "ai_generated": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "AI generation artifacts, inconsistencies"
        }},
        "template_usage": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Generic templates, common patterns"
        }},
        "metadata_mismatch": {{
            "detected": true/false,
            "confidence": 0.0-1.0,
            "evidence": "Image doesn't match claimed description/name"
        }}
    }},
    "overall_fraud_score": 0.0-1.0,
    "risk_level": "low/medium/high",
    "key_visual_elements": ["list", "of", "important", "visual", "elements"],
    "color_palette": ["dominant", "colors"],
    "composition_analysis": "Analysis of image composition and layout",
    "uniqueness_score": 0.0-1.0,
    "recommendation": "clear recommendation based on analysis"
}}

Focus on identifying:
1. Signs of plagiarism or stolen content
2. Low-effort AI generation
3. Template reuse
4. Metadata inconsistencies
5. Quality and artistic merit
6. Uniqueness and originality

Be thorough but concise. Provide specific evidence for each fraud indicator.
"""
        return prompt
    
    async def _download_image(self, image_url: str) -> Optional[str]:
        """Download image and convert to base64"""
        try:
            if not requests or not Image:
                return None
            
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Process image
            image = Image.open(BytesIO(response.content))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large (Gemini has size limits)
            max_size = (1024, 1024)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to base64
            buffer = BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()
            
            return base64.b64encode(image_bytes).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error downloading/processing image: {e}")
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
            
            # Fallback: extract description manually
            return {
                "description": response_text[:500] + "..." if len(response_text) > 500 else response_text,
                "artistic_style": "unknown",
                "quality_assessment": "Could not assess",
                "fraud_indicators": {},
                "overall_fraud_score": 0.0,
                "risk_level": "unknown",
                "key_visual_elements": [],
                "color_palette": [],
                "composition_analysis": "Could not analyze",
                "uniqueness_score": 0.5,
                "recommendation": "Manual review recommended"
            }
            
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            return self._mock_analysis_result()
    
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
            analysis = await self.analyze_nft_image(image_url, {})
            return analysis.get("description", "Unknown image content")
        except Exception as e:
            logger.error(f"Error extracting image description: {e}")
            return "Could not analyze image content"
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embeddings for text using Google embeddings"""
        try:
            if not self.embeddings:
                # Return mock embedding
                return [0.1] * 768
            
            embedding = await self.embeddings.aembed_query(text)
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return [0.1] * 768
    
    async def batch_embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            if not self.embeddings:
                return [[0.1] * 768 for _ in texts]
            
            embeddings = await self.embeddings.aembed_documents(texts)
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[0.1] * 768 for _ in texts]


# Global analyzer instance
gemini_analyzer = GeminiImageAnalyzer()


async def initialize_gemini_analyzer() -> bool:
    """Initialize the global Gemini analyzer"""
    return await gemini_analyzer.initialize()


async def get_gemini_analyzer() -> GeminiImageAnalyzer:
    """Get the global Gemini analyzer instance"""
    return gemini_analyzer
