from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import httpx
import os
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Walrus testnet endpoints
WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space"
WALRUS_AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space"

@router.post("/upload-walrus")
async def upload_to_walrus(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload a file to Walrus storage network.
    
    Following step 2 of the 8-step workflow:
    - Upload image to Walrus
    - Return public image URL
    """
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        file_content = await file.read()
        
        # Upload to Walrus Publisher
        async with httpx.AsyncClient(timeout=60.0) as client:
            upload_response = await client.put(
                f"{WALRUS_PUBLISHER_URL}/v1/blobs",
                content=file_content,
                headers={
                    "Content-Type": file.content_type,
                },
                params={
                    "epochs": "5"  # Store for 5 epochs
                }
            )
            
            if upload_response.status_code != 200:
                logger.error(f"Walrus upload failed: {upload_response.status_code} - {upload_response.text}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to upload to Walrus: {upload_response.text}"
                )
            
            upload_result = upload_response.json()
            
            # Extract blob ID from response
            blob_id = None
            if "newlyCreated" in upload_result:
                blob_id = upload_result["newlyCreated"]["blobObject"]["blobId"]
            elif "alreadyCertified" in upload_result:
                blob_id = upload_result["alreadyCertified"]["blobId"]
            
            if not blob_id:
                raise HTTPException(status_code=500, detail="Could not get blob ID from Walrus response")
            
            # Construct public URL
            image_url = f"{WALRUS_AGGREGATOR_URL}/v1/blobs/{blob_id}"
            
            logger.info(f"Successfully uploaded to Walrus: {blob_id}")
            
            return {
                "success": True,
                "blob_id": blob_id,
                "image_url": image_url,
                "walrus_response": upload_result
            }
    
    except httpx.TimeoutException:
        logger.error("Walrus upload timeout")
        raise HTTPException(status_code=408, detail="Upload to Walrus timed out")
    
    except Exception as e:
        logger.error(f"Error uploading to Walrus: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to Walrus: {str(e)}")
