# Backend NFT Analysis Endpoint Implementation Guide

This file shows what needs to be implemented in your FastAPI backend for NFT fraud detection.

## Required Backend Endpoint

Add this to your `backend/api/marketplace.py` or create a new file `backend/api/nft_analysis.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class NFTAnalysisRequest(BaseModel):
    nftId: str
    name: str
    description: str
    imageUrl: str
    creator: str

class NFTAnalysisResponse(BaseModel):
    nftId: str
    riskLevel: str  # "safe", "warning", "danger"
    confidence: float
    flags: list[str]
    analysisComplete: bool

@router.post("/api/nft/analyze", response_model=NFTAnalysisResponse)
async def analyze_nft(request: NFTAnalysisRequest):
    """
    Analyze a newly minted NFT for fraud detection.
    This endpoint should trigger your LangGraph agent workflow.
    """
    try:
        logger.info(f"Analyzing NFT {request.nftId} from creator {request.creator}")
        
        # TODO: Implement your LangGraph agent workflow here
        # This should:
        # 1. Download the image from IPFS
        # 2. Generate image embeddings using CLIP
        # 3. Query Supabase for similar images
        # 4. Run fraud detection analysis
        # 5. Store results in database
        # 6. If flagged, call Sui contract to flag the NFT
        
        # For now, return a placeholder response
        # Replace this with your actual agent implementation
        
        response = NFTAnalysisResponse(
            nftId=request.nftId,
            riskLevel="safe",  # or "warning", "danger"
            confidence=0.95,
            flags=[],
            analysisComplete=True
        )
        
        # Store in Supabase
        await store_nft_metadata(request)
        
        # Trigger async fraud detection (don't block the response)
        asyncio.create_task(run_fraud_detection_workflow(request))
        
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing NFT {request.nftId}: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

async def store_nft_metadata(nft_data: NFTAnalysisRequest):
    """Store NFT metadata in Supabase cache table"""
    # TODO: Implement Supabase insertion
    # INSERT INTO nfts_cache (nft_id, name, description, image_url, creator_address, ...)
    pass

async def run_fraud_detection_workflow(nft_data: NFTAnalysisRequest):
    """
    Run the complete fraud detection workflow asynchronously.
    This is where your LangGraph agent should be triggered.
    """
    try:
        logger.info(f"Starting fraud detection workflow for NFT {nft_data.nftId}")
        
        # TODO: Implement your LangGraph workflow:
        
        # 1. Image Analysis Step
        # - Download image from IPFS
        # - Generate CLIP embeddings
        # - Store in nft_embeddings table
        
        # 2. Similarity Search Step  
        # - Query existing embeddings for similar images
        # - Calculate cosine similarity
        
        # 3. Fraud Detection Step
        # - Analyze metadata for suspicious patterns
        # - Check creator history
        # - Combine all signals
        
        # 4. Action Step (if flagged)
        # - Store fraud flag in database
        # - Call Sui contract to flag NFT on-chain
        # - Notify relevant parties
        
        logger.info(f"Fraud detection workflow completed for NFT {nft_data.nftId}")
        
    except Exception as e:
        logger.error(f"Fraud detection workflow failed for NFT {nft_data.nftId}: {str(e)}")

# Add this router to your main FastAPI app
```

## Required Supabase Queries

Add these functions to your `backend/database/connection.py`:

```python
import asyncpg
from typing import List, Optional
import numpy as np

async def store_nft_embedding(nft_id: str, image_url: str, embedding: List[float]):
    """Store NFT image embedding for similarity search"""
    # Convert embedding to pgvector format
    embedding_vector = f"[{','.join(map(str, embedding))}]"
    
    query = """
    INSERT INTO nft_embeddings (nft_id, image_url, embedding, created_at)
    VALUES ($1, $2, $3::vector, NOW())
    ON CONFLICT (nft_id) DO UPDATE SET
        embedding = $3::vector,
        updated_at = NOW()
    """
    
    # Execute with your asyncpg connection
    # await conn.execute(query, nft_id, image_url, embedding_vector)

async def find_similar_nfts(embedding: List[float], threshold: float = 0.9) -> List[dict]:
    """Find similar NFTs using cosine similarity"""
    embedding_vector = f"[{','.join(map(str, embedding))}]"
    
    query = """
    SELECT nft_id, image_url, (embedding <=> $1::vector) as similarity
    FROM nft_embeddings
    WHERE (embedding <=> $1::vector) < $2
    ORDER BY similarity ASC
    LIMIT 10
    """
    
    # Execute and return results
    # return await conn.fetch(query, embedding_vector, 1.0 - threshold)

async def store_fraud_flag(nft_id: str, flag_type: str, reason: str, confidence: float):
    """Store fraud flag in database"""
    query = """
    INSERT INTO fraud_flags (nft_id, flag_type, reason, confidence, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    """
    
    # Execute with your asyncpg connection
    # await conn.execute(query, nft_id, flag_type, reason, confidence)
```

## Integration with LangGraph Agent

Update your `backend/agent/langgraph_agent.py` to include this workflow:

```python
from langgraph import StateGraph, START, END
from typing import Dict, Any
import httpx
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel

# Initialize CLIP model for image embeddings
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

class NFTAnalysisState:
    nft_id: str
    image_url: str
    creator: str
    image_embedding: Optional[List[float]] = None
    similar_nfts: Optional[List[Dict]] = None
    risk_assessment: Optional[Dict] = None
    is_flagged: bool = False

async def download_and_analyze_image(state: NFTAnalysisState) -> NFTAnalysisState:
    """Download image from IPFS and generate embeddings"""
    try:
        # Download image
        async with httpx.AsyncClient() as client:
            response = await client.get(state.image_url)
            image = Image.open(BytesIO(response.content))
        
        # Generate CLIP embedding
        inputs = clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            image_features = clip_model.get_image_features(**inputs)
            embedding = image_features.squeeze().numpy().tolist()
        
        state.image_embedding = embedding
        
        # Store in database
        await store_nft_embedding(state.nft_id, state.image_url, embedding)
        
        return state
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        return state

async def check_similarity(state: NFTAnalysisState) -> NFTAnalysisState:
    """Check for similar existing NFTs"""
    if not state.image_embedding:
        return state
    
    try:
        similar_nfts = await find_similar_nfts(state.image_embedding, threshold=0.85)
        state.similar_nfts = similar_nfts
        return state
    except Exception as e:
        logger.error(f"Similarity check failed: {e}")
        return state

async def assess_risk(state: NFTAnalysisState) -> NFTAnalysisState:
    """Assess fraud risk based on analysis"""
    risk_score = 0.0
    flags = []
    
    # Check for similar images
    if state.similar_nfts and len(state.similar_nfts) > 0:
        highest_similarity = 1.0 - state.similar_nfts[0]['similarity']  # Convert distance to similarity
        if highest_similarity > 0.95:
            risk_score += 0.8
            flags.append("High similarity to existing NFT detected")
    
    # Add more risk factors here...
    # - Creator reputation
    # - Metadata analysis
    # - Price anomalies
    
    state.risk_assessment = {
        'risk_score': risk_score,
        'flags': flags,
        'is_high_risk': risk_score > 0.7
    }
    
    state.is_flagged = risk_score > 0.7
    
    return state

async def flag_on_blockchain(state: NFTAnalysisState) -> NFTAnalysisState:
    """Flag NFT on Sui blockchain if high risk"""
    if not state.is_flagged:
        return state
    
    try:
        # TODO: Implement Sui transaction to flag NFT
        # This should call your fraudguard_nft::flag_nft function
        logger.info(f"Flagging NFT {state.nft_id} on blockchain")
        
        # Store flag in database
        await store_fraud_flag(
            state.nft_id,
            "plagiarism",
            state.risk_assessment['flags'][0] if state.risk_assessment['flags'] else "High risk detected",
            state.risk_assessment['risk_score']
        )
        
        return state
    except Exception as e:
        logger.error(f"Blockchain flagging failed: {e}")
        return state

# Create the workflow graph
def create_nft_analysis_workflow():
    workflow = StateGraph(NFTAnalysisState)
    
    workflow.add_node("download_analyze", download_and_analyze_image)
    workflow.add_node("check_similarity", check_similarity)
    workflow.add_node("assess_risk", assess_risk)
    workflow.add_node("flag_blockchain", flag_on_blockchain)
    
    workflow.add_edge(START, "download_analyze")
    workflow.add_edge("download_analyze", "check_similarity")
    workflow.add_edge("check_similarity", "assess_risk")
    workflow.add_edge("assess_risk", "flag_blockchain")
    workflow.add_edge("flag_blockchain", END)
    
    return workflow.compile()

# Usage in your API endpoint
nft_analysis_workflow = create_nft_analysis_workflow()

async def run_fraud_detection_workflow(nft_data: NFTAnalysisRequest):
    """Run the LangGraph workflow for fraud detection"""
    initial_state = NFTAnalysisState(
        nft_id=nft_data.nftId,
        image_url=nft_data.imageUrl,
        creator=nft_data.creator
    )
    
    final_state = await nft_analysis_workflow.ainvoke(initial_state)
    return final_state
```

This provides you with a complete framework for integrating the frontend NFT creation with your backend fraud detection system!
