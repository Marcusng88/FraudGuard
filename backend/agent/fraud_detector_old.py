"""
Fraud detection engine for FraudGuard - LangGraph Integration Only
Main entry point that delegates to LangGraph-based analysis
"""
import logging
from typing import Dict, Any
from dataclasses import dataclass

try:
    from agent.sui_client import NFTData
    from agent.langgraph_agent import analyze_nft_with_langgraph
except ImportError:
    from backend.agent.sui_client import NFTData
    from backend.agent.langgraph_agent import analyze_nft_with_langgraph

logger = logging.getLogger(__name__)


@dataclass
class FraudAnalysisResult:
    """Result of fraud analysis"""
    is_fraud: bool
    confidence_score: float  # 0.0 to 1.0
    flag_type: int
    reason: str
    evidence_url: str
    details: Dict[str, Any]


async def analyze_nft_for_fraud(nft_data: NFTData) -> FraudAnalysisResult:
    """Analyze an NFT for fraud indicators using LangGraph workflow"""
    try:
        logger.info(f"Starting LangGraph fraud analysis for NFT: {nft_data.object_id}")

        # Use LangGraph-based analysis
        langgraph_result = await analyze_nft_with_langgraph(nft_data)

        # Convert LangGraph result to FraudAnalysisResult
        return FraudAnalysisResult(
            is_fraud=langgraph_result.is_fraud,
            confidence_score=langgraph_result.confidence_score,
            flag_type=langgraph_result.flag_type,
            reason=langgraph_result.reason,
            evidence_url=langgraph_result.evidence_url,
            details=langgraph_result.analysis_details
        )

    except Exception as e:
        logger.error(f"Error in LangGraph analysis: {e}")

        # Simple fallback analysis without external dependencies
        suspicious_keywords = ["copy", "fake", "replica", "stolen", "plagiarism"]
        name_lower = nft_data.name.lower()
        desc_lower = nft_data.description.lower()

        is_suspicious = any(keyword in name_lower or keyword in desc_lower for keyword in suspicious_keywords)

        return FraudAnalysisResult(
            is_fraud=is_suspicious,
            confidence_score=0.8 if is_suspicious else 0.1,
            flag_type=3 if is_suspicious else 0,  # Fake metadata
            reason="Suspicious keywords detected" if is_suspicious else "No obvious fraud indicators",
            evidence_url="",
            details={"method": "simple_fallback", "error": str(e)}
        )
