"""
This agent bridges the gap between humans, enabling everyone to access knowledge about NFTs and SUI.
"""
import os
import requests
import google.generativeai as genai
from tavily import TavilyClient
# ====== API KEYS ======
from dotenv import load_dotenv
load_dotenv

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)


def validate_environment():
    """Check if required API keys are set"""
    missing_keys = []
    if not TAVILY_API_KEY:
        missing_keys.append("TAVILY_API_KEY")
    if not GOOGLE_API_KEY:
        missing_keys.append("GOOGLE_API_KEY")

    if missing_keys:
        return False, f"Missing environment variables: {', '.join(missing_keys)}"
    return True, None

def search_nft_news(query):
    """Search for NFT news using Tavily API"""
    try:
        tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
        res = tavily_client.search(query=f'description for species {query}', include_images=True, max_results=1)
        return res
    except Exception as e:
        print(f"Error in search_nft_news: {e}")
        return None


def fallback_search(query):
    """Fallback search if Tavily fails"""
    return {
        "results": [{
            "title": f"NFT Market Analysis for {query}",
            "url": "https://example.com/nft-news",
            "content": f"Recent developments in the NFT space regarding {query}. Market trends show varying patterns.",
            "images": []
        }]
    }

def summarize_with_gemini(query, context_text):
    """Generate NFT summary with Gemini AI"""
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        prompt = f"""
You are an expert NFT market analyst and blockchain technology specialist.

User Query: {query}

Market Data and News Context:
{context_text}

Please provide:
1. Key market insights
2. Notable trends
3. Specific projects worth mentioning
4. Market sentiment and potential implications

Keep the response concise yet informative.
"""
        response = model.generate_content(prompt)
        return response.text
    except Exception:
        return f"Unable to generate summary. Raw context: {context_text[:500]}..."

def get_nft_market_analysis(user_query):
    """Main logic to fetch NFT news and summarize"""
    search_results = search_nft_news(user_query)

    if not search_results.get("results"):
        search_results = fallback_search(user_query)

    context = ""
    images = []
    results = search_results.get("results", [])

    for i, item in enumerate(results[:3], 1):
        title = item.get('title', 'No title')
        url = item.get('url', 'No URL')
        content = item.get('content', 'No content available')

        context += f"{i}. {title}\nSource: {url}\nContent: {content}\n\n"

        if item.get("images"):
            images.extend(item["images"])

    summary = summarize_with_gemini(user_query, context)
    return {
        "query": user_query,
        "summary": summary,
        "images": images[:3]
    }
