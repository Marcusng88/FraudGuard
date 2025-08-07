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
                logger.warning("Gemini dependencies not available, analyzer will not be available")
                self.initialized = True
                return True
            
            if not settings.google_api_key:
                logger.warning("Google API key not configured, analyzer will not be available")
                self.initialized = True
                return True
            
            # Initialize Gemini Pro for multimodal analysis
            try:
                self.gemini_chat = ChatGoogleGenerativeAI(
                    model=settings.google_model or "gemini-2.5-flash-lite",
                    google_api_key=settings.google_api_key,
                    temperature=0.1,  # Low temperature for consistent analysis
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
                logger.warning(f"Failed to download or process image: {image_url}, returning error analysis")
                return self._create_error_analysis_result(f"Failed to download or process image: {image_url}")
            
            # Create fraud detection prompt
            prompt = self._create_fraud_analysis_prompt(nft_metadata)
            
            if not self.gemini_chat:
                logger.warning("Gemini chat model not available, returning error analysis")
                return self._create_error_analysis_result("Gemini chat model not available")
            
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
                try:
                    logger.info(f"Generating embedding for description: {structured_analysis['description'][:100]}...")
                    embedding = await self.embeddings.aembed_query(structured_analysis["description"])
                    structured_analysis["embedding"] = embedding
                    structured_analysis["embedding_dimension"] = len(embedding)
                    logger.info(f"Successfully generated embedding with dimension: {len(embedding)}")
                except Exception as embed_error:
                    logger.error(f"Error generating embedding: {embed_error}")
                    logger.error(f"Embedding model status: {self.embeddings is not None}")
                    logger.error(f"Description available: {bool(structured_analysis.get('description'))}")
                    
                    # Try to generate a fallback embedding using a simple method
                    try:
                        fallback_embedding = await self._generate_fallback_embedding(structured_analysis["description"])
                        structured_analysis["embedding"] = fallback_embedding
                        structured_analysis["embedding_dimension"] = len(fallback_embedding)
                        logger.info(f"Generated fallback embedding with dimension: {len(fallback_embedding)}")
                    except Exception as fallback_error:
                        logger.error(f"Fallback embedding generation also failed: {fallback_error}")
                        structured_analysis["embedding"] = []
                        structured_analysis["embedding_dimension"] = 0
            else:
                logger.warning("No embeddings model available or no description to embed")
                logger.warning(f"Embeddings model available: {self.embeddings is not None}")
                logger.warning(f"Description available: {bool(structured_analysis.get('description'))}")
                
                # Try to generate a fallback embedding even without the model
                if structured_analysis.get("description"):
                    try:
                        fallback_embedding = await self._generate_fallback_embedding(structured_analysis["description"])
                        structured_analysis["embedding"] = fallback_embedding
                        structured_analysis["embedding_dimension"] = len(fallback_embedding)
                        logger.info(f"Generated fallback embedding with dimension: {len(fallback_embedding)}")
                    except Exception as fallback_error:
                        logger.error(f"Fallback embedding generation failed: {fallback_error}")
                        structured_analysis["embedding"] = []
                        structured_analysis["embedding_dimension"] = 0
            
            logger.info(f"Completed Gemini analysis for image: {image_url}")
            return structured_analysis
            
        except Exception as e:
            logger.error(f"Error in Gemini image analysis: {e}")
            # Return structured error response instead of raising
            return {
                "description": f"Error analyzing image: {str(e)}",
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
                "recommendation": "Manual review required - Analysis error",
                "confidence_in_analysis": 0.0,
                "additional_notes": f"Error: {str(e)}"
            }
    
    def _create_fraud_analysis_prompt(self, nft_metadata: Dict[str, Any]) -> str:
        """Create a comprehensive prompt for fraud detection analysis"""
        
        prompt = f"""
        You are an expert NFT fraud detection analyst. Analyze this NFT image and respond with ONLY a valid JSON object.

        NFT Metadata:
        - Title: {nft_metadata.get('title', nft_metadata.get('name', 'Unknown'))}
        - Creator: {nft_metadata.get('creator', 'Unknown')}
        - Collection: {nft_metadata.get('collection', nft_metadata.get('category', 'Unknown'))}
        - Description: {nft_metadata.get('description', 'No description provided')}
        - Category: {nft_metadata.get('category', 'Unknown')}

        CRITICAL: Respond with ONLY valid JSON. No text before or after. No markdown formatting.

        Required JSON structure:
        {{
            "description": "Detailed visual description of the image (200+ words). Include all visual elements, colors, composition, style, textures, lighting, perspective, text, symbols. Describe artistic technique, medium, and aesthetic quality.",
            "artistic_style": "Art style classification (e.g., pixel art, 3D render, photography, digital art, oil painting, watercolor)",
            "quality_assessment": "Image quality rating (1-10) with technical analysis of resolution, color depth, compression artifacts, production value",
            "fraud_indicators": {{
                "low_effort_generation": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Analysis of effort level, complexity, originality, artistic merit"
                }},
                "stolen_artwork": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Analysis of watermarks, signatures, style inconsistencies, plagiarism signs"
                }},
                "ai_generated": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Identification of AI generation artifacts, unnatural patterns, AI-generated characteristics"
                }},
                "template_usage": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Detection of generic templates, common patterns, mass-produced elements"
                }},
                "metadata_mismatch": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Analysis of whether image content matches claimed title, description, category"
                }},
                "copyright_violation": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Signs of copyrighted characters, logos, brands, protected IP"
                }},
                "inappropriate_content": {{
                    "detected": false,
                    "confidence": 0.0,
                    "evidence": "Detection of NSFW content, violence, hate speech, inappropriate material"
                }}
            }},
            "overall_fraud_score": 0.0,
            "risk_level": "low",
            "key_visual_elements": ["list", "of", "important", "visual", "elements"],
            "color_palette": ["analysis", "of", "color", "scheme"],
            "composition_analysis": "Analysis of image composition, layout, focal points, balance, visual hierarchy",
            "uniqueness_score": 0.0,
            "artistic_merit": "Assessment of artistic value, creativity, skill level, cultural significance",
            "technical_quality": "Technical analysis of resolution, file quality, compression, production standards",
            "market_value_assessment": "Estimation of fair market value based on artistic merit, rarity, market trends",
            "recommendation": "Clear, actionable recommendation with specific next steps",
            "confidence_in_analysis": 0.0,
            "additional_notes": "Additional observations, concerns, or positive aspects"
        }}

        ANALYSIS REQUIREMENTS:
        1. Examine image for fraud indicators: plagiarism, AI generation, low effort, stolen content
        2. Assess artistic quality, originality, and technical merit
        3. Check for metadata inconsistencies and copyright violations
        4. Evaluate market value and authenticity indicators
        5. Provide specific evidence for each fraud indicator
        6. Calculate overall fraud score (0.0-1.0) based on detected risks
        7. Determine risk level: low (0.0-0.3), medium (0.3-0.7), high (0.7-1.0)
        8. Give clear recommendation: ALLOW, FLAG, or BLOCK

        RESPONSE FORMAT:
        - Return ONLY the JSON object
        - Use actual numbers for scores (not strings)
        - Use true/false for boolean values (not "True"/"False")
        - Ensure JSON is valid and complete
        - No additional text or formatting
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
            # Clean the response text
            response_text = response_text.strip()
            logger.info(f"Parsing Gemini response, length: {len(response_text)}")
            
            # Try multiple JSON extraction strategies
            json_text = None
            parsed = None
            
            # Strategy 1: Look for JSON between curly braces (most common)
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}')
            
            if start_idx >= 0 and end_idx > start_idx:
                potential_json = response_text[start_idx:end_idx + 1]
                try:
                    parsed = json.loads(potential_json)
                    json_text = potential_json
                    logger.info("Successfully parsed JSON using curly brace extraction")
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parsing failed for curly brace extraction: {e}")
            
            # Strategy 2: Look for JSON with markdown code blocks
            if not json_text:
                import re
                json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
                matches = re.findall(json_pattern, response_text, re.DOTALL)
                if matches:
                    try:
                        parsed = json.loads(matches[0])
                        json_text = matches[0]
                        logger.info("Successfully parsed JSON using markdown code block extraction")
                    except json.JSONDecodeError as e:
                        logger.warning(f"JSON parsing failed for markdown extraction: {e}")
            
            # Strategy 3: Try to extract JSON from the entire response
            if not json_text:
                # Remove common prefixes and suffixes
                cleaned_text = response_text
                prefixes_to_remove = ['Here is the analysis:', 'Analysis:', 'JSON:', '```json', '```', 'Response:', 'Result:']
                for prefix in prefixes_to_remove:
                    if cleaned_text.startswith(prefix):
                        cleaned_text = cleaned_text[len(prefix):].strip()
                
                suffixes_to_remove = ['```', 'End of analysis', 'Analysis complete', 'End', 'Complete']
                for suffix in suffixes_to_remove:
                    if cleaned_text.endswith(suffix):
                        cleaned_text = cleaned_text[:-len(suffix)].strip()
                
                try:
                    parsed = json.loads(cleaned_text)
                    json_text = cleaned_text
                    logger.info("Successfully parsed JSON using full response extraction")
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parsing failed for full response extraction: {e}")
            
            # If we found valid JSON, process it
            if json_text and parsed:
                # Validate and fix required fields
                if not parsed.get("description"):
                    # Extract description from the original response if not in JSON
                    description = self._extract_description_from_text(response_text)
                    parsed["description"] = description
                    logger.info("Extracted description from text response")
                
                # Ensure all required fraud indicators exist with proper structure
                required_indicators = [
                    "low_effort_generation", "stolen_artwork", "ai_generated", 
                    "template_usage", "metadata_mismatch", "copyright_violation", 
                    "inappropriate_content"
                ]
                
                fraud_indicators = parsed.get("fraud_indicators", {})
                for indicator in required_indicators:
                    if indicator not in fraud_indicators:
                        fraud_indicators[indicator] = {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Not analyzed"
                        }
                    elif not isinstance(fraud_indicators[indicator], dict):
                        # Fix malformed indicator
                        fraud_indicators[indicator] = {
                            "detected": False,
                            "confidence": 0.0,
                            "evidence": "Malformed data"
                        }
                
                # Calculate overall fraud score based on detected indicators
                fraud_scores = []
                for indicator, details in fraud_indicators.items():
                    if isinstance(details, dict) and details.get("detected"):
                        confidence = details.get("confidence", 0.0)
                        if isinstance(confidence, (int, float)):
                            fraud_scores.append(confidence)
                
                if fraud_scores:
                    parsed["overall_fraud_score"] = max(fraud_scores)
                else:
                    parsed["overall_fraud_score"] = 0.0
                
                # Determine risk level based on fraud score
                fraud_score = parsed["overall_fraud_score"]
                if fraud_score >= 0.7:
                    parsed["risk_level"] = "high"
                elif fraud_score >= 0.3:
                    parsed["risk_level"] = "medium"
                else:
                    parsed["risk_level"] = "low"
                
                # Ensure other required fields exist with proper types
                required_fields = {
                    "artistic_style": "unknown",
                    "quality_assessment": "Analysis completed",
                    "key_visual_elements": [],
                    "color_palette": [],
                    "composition_analysis": "Analysis completed",
                    "uniqueness_score": 0.0,
                    "artistic_merit": "Analysis completed",
                    "technical_quality": "Analysis completed",
                    "market_value_assessment": "Analysis completed",
                    "recommendation": "ALLOW" if fraud_score < 0.3 else "FLAG" if fraud_score < 0.7 else "BLOCK",
                    "confidence_in_analysis": 0.8,
                    "additional_notes": "Analysis completed successfully"
                }
                
                for field, default_value in required_fields.items():
                    if field not in parsed:
                        parsed[field] = default_value
                    elif field in ["key_visual_elements", "color_palette"] and not isinstance(parsed[field], list):
                        parsed[field] = default_value
                    elif field in ["uniqueness_score", "confidence_in_analysis"] and not isinstance(parsed[field], (int, float)):
                        parsed[field] = default_value
                
                logger.info(f"Successfully processed JSON response with fraud score: {parsed['overall_fraud_score']}")
                return parsed
            
            # If no JSON found, try to extract structured information from text
            logger.warning(f"Could not parse JSON from Gemini response, attempting text extraction")
            return self._extract_structured_info_from_text(response_text)
            
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            return self._create_error_response(f"Response parsing error: {str(e)}")
    
    def _extract_description_from_text(self, text: str) -> str:
        """Extract description from text response"""
        # Look for common description patterns
        lines = text.split('\n')
        description_lines = []
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('{') and not line.startswith('"') and not line.startswith('```'):
                if len(line) > 20:  # Likely a description line
                    description_lines.append(line)
        
        if description_lines:
            # Join all description lines for a comprehensive description
            full_description = ' '.join(description_lines)
            
            # If the description is very long, truncate it appropriately
            if len(full_description) > 500:
                # Try to find a good breaking point
                sentences = full_description.split('. ')
                if len(sentences) > 2:
                    full_description = '. '.join(sentences[:3]) + '.'
                else:
                    full_description = full_description[:500] + '...'
            
            return full_description
        
        return "Could not extract detailed description from response"
    
    def _extract_structured_info_from_text(self, text: str) -> Dict[str, Any]:
        """Extract structured information from text response when JSON parsing fails"""
        try:
            logger.info("Extracting structured info from text response")
            # Extract description
            description = self._extract_description_from_text(text)
            
            # Try to identify fraud indicators from text using more sophisticated analysis
            fraud_indicators = {}
            text_lower = text.lower()
            
            # Enhanced keyword-based detection with context
            indicators = {
                "low_effort_generation": {
                    "keywords": ["low effort", "simple", "basic", "minimal", "lazy", "quick", "rushed", "poor quality"],
                    "positive_keywords": ["detailed", "complex", "intricate", "careful", "professional"]
                },
                "stolen_artwork": {
                    "keywords": ["stolen", "plagiarized", "copied", "watermark", "signature", "copyright", "trademark"],
                    "positive_keywords": ["original", "unique", "authentic", "genuine"]
                },
                "ai_generated": {
                    "keywords": ["ai generated", "artificial", "generated", "synthetic", "computer", "algorithm", "machine"],
                    "positive_keywords": ["hand-drawn", "painted", "photographed", "scanned"]
                },
                "template_usage": {
                    "keywords": ["template", "generic", "common", "standard", "mass-produced", "cookie cutter"],
                    "positive_keywords": ["unique", "original", "custom", "one-of-a-kind"]
                },
                "metadata_mismatch": {
                    "keywords": ["mismatch", "inconsistent", "doesn't match", "wrong", "incorrect"],
                    "positive_keywords": ["matches", "consistent", "accurate", "correct"]
                },
                "copyright_violation": {
                    "keywords": ["copyright", "trademark", "brand", "logo", "disney", "marvel", "nintendo"],
                    "positive_keywords": ["original", "public domain", "creative commons"]
                },
                "inappropriate_content": {
                    "keywords": ["inappropriate", "nsfw", "violent", "hate", "offensive", "explicit"],
                    "positive_keywords": ["appropriate", "family-friendly", "safe", "clean"]
                }
            }
            
            for indicator, config in indicators.items():
                # Check for negative indicators
                detected_negative = any(keyword in text_lower for keyword in config["keywords"])
                # Check for positive indicators
                detected_positive = any(keyword in text_lower for keyword in config["positive_keywords"])
                
                # Determine detection and confidence
                if detected_negative and not detected_positive:
                    detected = True
                    confidence = 0.6
                    evidence = f"Detected negative indicators: {[k for k in config['keywords'] if k in text_lower]}"
                elif detected_positive and not detected_negative:
                    detected = False
                    confidence = 0.8
                    evidence = f"Detected positive indicators: {[k for k in config['positive_keywords'] if k in text_lower]}"
                elif detected_negative and detected_positive:
                    detected = False  # Positive outweighs negative
                    confidence = 0.4
                    evidence = "Mixed indicators detected - positive indicators suggest legitimate content"
                else:
                    detected = False
                    confidence = 0.2
                    evidence = "No clear indicators detected - requires manual review"
                
                fraud_indicators[indicator] = {
                    "detected": detected,
                    "confidence": confidence,
                    "evidence": evidence
                }
            
            # Calculate overall fraud score
            fraud_scores = [details["confidence"] for details in fraud_indicators.values() if details["detected"]]
            overall_score = max(fraud_scores) if fraud_scores else 0.0
            
            # Determine risk level
            if overall_score >= 0.6:
                risk_level = "high"
                recommendation = "FLAG"
            elif overall_score >= 0.3:
                risk_level = "medium"
                recommendation = "REVIEW"
            else:
                risk_level = "low"
                recommendation = "ALLOW"
            
            # Extract additional information from text
            artistic_style = "unknown"
            if any(word in text_lower for word in ["pixel", "8-bit", "retro"]):
                artistic_style = "pixel art"
            elif any(word in text_lower for word in ["3d", "render", "blender", "maya"]):
                artistic_style = "3D render"
            elif any(word in text_lower for word in ["photo", "photograph", "camera"]):
                artistic_style = "photography"
            elif any(word in text_lower for word in ["painting", "oil", "watercolor", "acrylic"]):
                artistic_style = "painting"
            elif any(word in text_lower for word in ["digital", "photoshop", "illustrator"]):
                artistic_style = "digital art"
            
            return {
                "description": description,
                "artistic_style": artistic_style,
                "quality_assessment": "Analysis completed via text extraction",
                "fraud_indicators": fraud_indicators,
                "overall_fraud_score": overall_score,
                "risk_level": risk_level,
                "key_visual_elements": ["extracted from text analysis"],
                "color_palette": ["extracted from text analysis"],
                "composition_analysis": "Analysis completed via text extraction",
                "uniqueness_score": 0.5,
                "artistic_merit": "Analysis completed via text extraction",
                "technical_quality": "Analysis completed via text extraction",
                "market_value_assessment": "Analysis completed via text extraction",
                "recommendation": recommendation,
                "confidence_in_analysis": 0.4,
                "additional_notes": "Analysis completed using text extraction due to JSON parsing failure. Manual review recommended for higher accuracy."
            }
            
        except Exception as e:
            logger.error(f"Error in text extraction: {e}")
            return self._create_error_response(f"Text extraction error: {str(e)}")
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create a standardized error response"""
        return {
            "description": f"Error analyzing image: {error_message}",
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
            "recommendation": "Manual review required - Analysis error",
            "confidence_in_analysis": 0.0,
            "additional_notes": f"Error: {error_message}"
        }
    
    def _create_error_analysis_result(self, error_message: str) -> Dict[str, Any]:
        """Return error analysis result when analysis fails"""
        return {
            "description": f"Analysis failed: {error_message}",
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
            "recommendation": "Manual review required - Analysis failed",
            "confidence_in_analysis": 0.0,
            "additional_notes": f"Error: {error_message}",
            "embedding": [],
            "embedding_dimension": 0,
            "error": error_message
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
            logger.info("=" * 80)
            logger.info("RAW GEMINI DESCRIPTION RESPONSE:")
            logger.info("=" * 80)
            logger.info(description)
            logger.info("=" * 80)
            
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
