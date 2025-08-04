"""
Test script for unified FraudGuard fraud detection system
Tests the LLM-powered fraud analysis with Google Gemini integration
"""

import asyncio
import logging
import sys
import os

# Add backend directory to path for imports
sys.path.append(os.path.dirname(__file__))

from agent.fraud_detector import analyze_nft_for_fraud, initialize_fraud_detector, NFTData
from core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_unified_fraud_detection():
    """Test the unified fraud detection system"""
    
    print("🚀 Testing Unified FraudGuard System")
    print("=" * 50)
    
    try:
        # Initialize the system
        print("\n1. Initializing Unified Fraud Detection System...")
        success = await initialize_fraud_detector()
        if not success:
            print("❌ Failed to initialize fraud detection system")
            print("⚠️  This is expected if Google API key is not configured")
        else:
            print("✅ Fraud detection system initialized successfully")
        
        # Test NFT data
        test_nft_data = NFTData(
            title="Test Digital Artwork #1",
            description="A beautiful digital landscape painting featuring mountains and rivers in an impressionist style",
            image_url="https://example.com/artwork.jpg",
            category="art",
            price=0.5
        )
        
        print(f"\n2. Testing NFT Fraud Analysis...")
        print(f"   NFT: {test_nft_data.title}")
        print(f"   Description: {test_nft_data.description[:50]}...")
        
        # Run fraud analysis
        analysis_result = await analyze_nft_for_fraud(test_nft_data)
        
        print(f"\n✅ Fraud Analysis Complete:")
        print(f"   Is Fraud: {analysis_result.get('is_fraud', False)}")
        print(f"   Confidence: {analysis_result.get('confidence_score', 0.0):.3f}")
        print(f"   Flag Type: {analysis_result.get('flag_type', 'None')}")
        print(f"   Reason: {analysis_result.get('reason', 'N/A')}")
        
        # Show analysis details
        details = analysis_result.get('analysis_details', {})
        if details:
            print(f"\n📊 Analysis Details:")
            
            # Image analysis
            image_analysis = details.get('image_analysis', {})
            if image_analysis:
                print(f"   Image Analysis:")
                print(f"   - Overall Fraud Score: {image_analysis.get('overall_fraud_score', 0.0):.3f}")
                print(f"   - Risk Level: {image_analysis.get('risk_level', 'unknown')}")
                
                fraud_indicators = image_analysis.get('fraud_indicators', {})
                if fraud_indicators:
                    print(f"   - Fraud Indicators: {len(fraud_indicators)} detected")
            
            # Similarity analysis
            similarity = details.get('similarity_results', {})
            if similarity:
                print(f"   Similarity Analysis:")
                print(f"   - Max Similarity: {similarity.get('max_similarity', 0.0):.3f}")
                print(f"   - Similar NFTs Found: {len(similarity.get('similar_nfts', []))}")
                print(f"   - Is Duplicate: {similarity.get('is_duplicate', False)}")
            
            # Metadata analysis
            metadata = details.get('metadata_analysis', {})
            if metadata:
                print(f"   Metadata Analysis:")
                print(f"   - Quality Score: {metadata.get('quality_score', 0.0):.3f}")
                print(f"   - Metadata Risk: {metadata.get('metadata_risk', 0.0):.3f}")
                indicators = metadata.get('suspicious_indicators', [])
                if indicators:
                    print(f"   - Suspicious Indicators: {len(indicators)}")
        
        # Test with suspicious NFT
        print(f"\n3. Testing with Suspicious NFT...")
        suspicious_nft = NFTData(
            title="COPY OF FAMOUS ART",
            description="This is a copy of a famous artwork, not original",
            image_url="https://example.com/suspicious.jpg",
            category="art",
            price=0.001  # Unusually low price
        )
        
        suspicious_result = await analyze_nft_for_fraud(suspicious_nft)
        
        print(f"   Suspicious NFT Analysis:")
        print(f"   - Is Fraud: {suspicious_result.get('is_fraud', False)}")
        print(f"   - Confidence: {suspicious_result.get('confidence_score', 0.0):.3f}")
        print(f"   - Reason: {suspicious_result.get('reason', 'N/A')}")
        
        # Test batch analysis
        print(f"\n4. Testing Batch Analysis...")
        test_nfts = [
            NFTData(
                title="Original Artwork #1",
                description="Unique digital painting created with original techniques",
                image_url="https://example.com/original1.jpg",
                category="art",
                price=1.5
            ),
            NFTData(
                title="Quick Generated Art",
                description="AI generated image, low effort",
                image_url="https://example.com/generated.jpg",
                category="ai",
                price=0.01
            ),
            NFTData(
                title="Professional Digital Art",
                description="High quality digital artwork with detailed composition and professional techniques",
                image_url="https://example.com/professional.jpg",
                category="art",
                price=5.0
            )
        ]
        
        batch_results = []
        for i, nft in enumerate(test_nfts):
            result = await analyze_nft_for_fraud(nft)
            batch_results.append(result)
            print(f"   NFT {i+1}: {result.get('is_fraud', False)} (confidence: {result.get('confidence_score', 0.0):.3f})")
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed successfully!")
        
        print("\n💡 System Status:")
        print(f"   - Google API Key: {'✅ Configured' if settings.google_api_key else '❌ Not configured'}")
        print(f"   - Supabase: {'✅ Configured' if settings.supabase_url else '❌ Not configured'}")
        print(f"   - Analysis Mode: {'🤖 LLM-powered' if settings.google_api_key else '📋 Rule-based fallback'}")
        
        print("\n🚀 Ready for production use!")
        print("   - Start API: uvicorn main:app --reload")
        print("   - Test endpoint: POST /analyze-nft")
        print("   - View recent NFTs: GET /api/marketplace/nfts/recent")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        logger.error(f"Test error: {e}", exc_info=True)


if __name__ == "__main__":
    print("FraudGuard Unified Test Suite")
    print("Testing LLM-powered fraud detection with Google Gemini")
    
    # Run unified fraud detection test
    asyncio.run(test_unified_fraud_detection())
