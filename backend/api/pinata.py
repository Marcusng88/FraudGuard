"""
Pinata IPFS API endpoints for FraudGuard
Handles image uploads to IPFS via Pinata service
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import httpx
import os
import json
import time
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Pinata API configuration
PINATA_API_URL = "https://api.pinata.cloud"
PINATA_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs"

# Get Pinata credentials from environment variables
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_API_KEY")

@router.post("/upload-pinata")
async def upload_to_pinata(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload a file to Pinata IPFS.
    
    Following step 2 of the 8-step workflow:
    - Upload image to IPFS via Pinata
    - Return public IPFS URL
    """
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check if Pinata credentials are configured
        if not PINATA_API_KEY or not PINATA_SECRET_KEY:
            logger.warning("Pinata credentials not configured, using mock response")
            # Return a mock response for development
            mock_hash = f"mock-{hash(file.filename)}-{int(time.time())}"
            return {
                "success": True,
                "ipfs_hash": mock_hash,
                "image_url": f"{PINATA_GATEWAY_URL}/{mock_hash}",
                "pinata_response": {"mock": True}
            }
        
        # Read file content
        file_content = await file.read()
        
        # Prepare headers for Pinata API
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY,
        }
        
        # Prepare file data for upload
        files = {
            "file": (file.filename, file_content, file.content_type)
        }
        
        # Optional metadata for Pinata
        metadata = {
            "name": file.filename,
            "keyvalues": {
                "project": "FraudGuard",
                "type": "NFT_Image"
            }
        }
        
        # Upload to Pinata
        async with httpx.AsyncClient(timeout=60.0) as client:
            upload_response = await client.post(
                f"{PINATA_API_URL}/pinning/pinFileToIPFS",
                headers=headers,
                files=files,
                data={"pinataMetadata": json.dumps(metadata)}
            )
            
            if upload_response.status_code != 200:
                logger.error(f"Pinata upload failed: {upload_response.status_code} - {upload_response.text}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to upload to Pinata: {upload_response.text}"
                )
            
            upload_result = upload_response.json()
            
            # Extract IPFS hash from response
            ipfs_hash = upload_result.get("IpfsHash")
            
            if not ipfs_hash:
                raise HTTPException(status_code=500, detail="Could not get IPFS hash from Pinata response")
            
            # Construct public URL
            image_url = f"{PINATA_GATEWAY_URL}/{ipfs_hash}"
            
            logger.info(f"Successfully uploaded to Pinata IPFS: {ipfs_hash}")
            
            return {
                "success": True,
                "ipfs_hash": ipfs_hash,
                "image_url": image_url,
                "pinata_response": upload_result
            }
    
    except httpx.TimeoutException:
        logger.error("Pinata upload timeout")
        raise HTTPException(status_code=408, detail="Upload to Pinata timed out")
    
    except Exception as e:
        logger.error(f"Error uploading to Pinata: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to Pinata: {str(e)}")

@router.get("/pinata/status")
async def check_pinata_status():
    """
    Check if Pinata service is configured and accessible
    """
    try:
        if not PINATA_API_KEY or not PINATA_SECRET_KEY:
            return {
                "configured": False,
                "message": "Pinata API credentials not configured"
            }
        
        # Test Pinata API connectivity
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY,
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{PINATA_API_URL}/data/testAuthentication",
                headers=headers
            )
            
            if response.status_code == 200:
                return {
                    "configured": True,
                    "connected": True,
                    "message": "Pinata service is ready"
                }
            else:
                return {
                    "configured": True,
                    "connected": False,
                    "message": f"Pinata authentication failed: {response.status_code}"
                }
    
    except Exception as e:
        return {
            "configured": bool(PINATA_API_KEY and PINATA_SECRET_KEY),
            "connected": False,
            "message": f"Error checking Pinata status: {str(e)}"
        }
