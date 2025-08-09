"""
FraudGuard Knowledge Agent with Intelligent Routing
---------------------------------------------------
This agent intelligently routes user queries between two data sources:
1. Local FraudGuard documentation (tech stack, platform features, how-to guides)
2. Live NFT market search (current trends, news, general NFT knowledge)

The LLM automatically decides which source to use based on query context,
ensuring users get the most relevant and accurate information.
"""

import os
import google.generativeai as genai
from tavily import TavilyClient

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "tvly-dev-api_key")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "google_AI_studio_API_key")

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


def load_local_knowledge():
    """Load local documentation files for FraudGuard platform knowledge"""
    knowledge_files = [
        "README.md",
        "track_1.md",
        "track_2.md",
        "track_3.md",
        "tech_stack.md"
    ]

    combined_knowledge = ""

    for file_path in knowledge_files:
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    combined_knowledge += f"\n\n=== {file_path} ===\n{content}"
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                continue

    
    if not combined_knowledge:
        combined_knowledge = """
FraudGuard is an AI-powered NFT marketplace built on the Sui blockchain that provides:
- Decentralized NFT marketplace functionality
- AI-driven fraud detection using Google Gemini
- Real-time plagiarism detection
- Smart contract-based fraud flagging
- User-friendly frontend with fraud warnings
- FastAPI backend with LangChain integration
"""

    return combined_knowledge


def search_nft_news(query):
    """Search for NFT news using Tavily API"""
    try:
        tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
        res = tavily_client.search(
            query=f"NFT market update for {query}",
            include_images=True,
            max_results=3
        )
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


def decide_data_source(query, local_data):
    """
    Let the LLM decide whether to use:
    - Local FraudGuard documentation (tech stack, features, how the platform works)
    - Live NFT news search (market trends, current events, general NFT knowledge)
    """
    model = genai.GenerativeModel("gemini-2.5-flash")
    decision_prompt = f"""
You are an intelligent routing system for a FraudGuard NFT marketplace chatbot.

User Query: "{query}"

You have access to TWO data sources (use ONLY ONE):

1. LOCAL DOCUMENTATION: Contains detailed information about:
   - FraudGuard platform architecture and technology stack
   - How the marketplace works (listing, buying, selling NFTs)
   - AI fraud detection features and capabilities
   - Smart contract functionality on Sui blockchain
   - Platform-specific features and implementation details
   - Technical documentation and development guides

2. LIVE WEB SEARCH: Provides current information about:
   - General NFT market trends and news
   - Current NFT prices and market analysis
   - Recent developments in the broader NFT ecosystem
   - General blockchain and cryptocurrency news
   - External NFT projects and platforms

DECISION RULES:
- Choose "local" if the query asks about:
  * FraudGuard platform features, capabilities, or how it works
  * Technical implementation, architecture, or technology stack
  * How to use the marketplace (listing, buying, fraud detection)
  * Platform-specific functionality or documentation
  * Development or integration questions

- Choose "live" if the query asks about:
  * Current NFT market trends, prices, or news
  * General NFT concepts, definitions, or education
  * Recent events in the NFT/crypto space
  * Comparison with other platforms or general market analysis
  * Current events or real-time information

Local Knowledge Preview:
{local_data[:500] if local_data else "No local documentation available"}...

Respond with EXACTLY one word: "local" or "live"
    """
    try:
        resp = model.generate_content(decision_prompt)
        choice = resp.text.strip().lower()
        return "local" if "local" in choice else "live"
    except Exception:
        return "live"  

def summarize_with_gemini(query, context_text, data_source="unknown"):
    """Generate context-aware summary with Gemini AI"""
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        if data_source == "local":
            prompt = f"""
You are a FraudGuard platform expert and technical assistant.

User Query: {query}

FraudGuard Platform Information:
{context_text}

As a FraudGuard expert, please provide a helpful response that:
1. Directly answers the user's question about FraudGuard
2. Explains relevant platform features and capabilities
3. Provides technical details when appropriate
4. Highlights unique fraud detection and security features
5. Guides users on how to use the platform effectively

Focus on FraudGuard-specific information and keep the response informative yet accessible.

IMPORTANT: Format your response using proper markdown syntax and emojis:
- Use **bold** for important terms and features
- Use *italic* for emphasis
- Use bullet points (- or *) for lists
- Use numbered lists (1., 2., etc.) for step-by-step instructions
- Use `code` for technical terms or code snippets
- Use ## for section headers if needed
- Use relevant emojis to make the response more engaging and interactive:
  * 🛡️ for security/fraud detection features
  * 🎨 for NFT-related content
  * ⚡ for performance/speed features
  * 🔗 for blockchain/network features
  * 💡 for tips and insights
  * ✅ for benefits/advantages
  * 🚀 for advanced features
  * 📱 for user interface features
"""
        else:
            prompt = f"""
You are an expert NFT market analyst and blockchain technology specialist.

User Query: {query}

Current Market Context:
{context_text}

Please provide:
1. Key market insights or knowledge relevant to the query
2. Notable trends or important facts
3. Specific projects or examples worth mentioning
4. Market sentiment and potential implications (if applicable)
5. Educational information for NFT newcomers when relevant

Keep the response concise yet informative, focusing on current market conditions and general NFT knowledge.

IMPORTANT: Format your response using proper markdown syntax and emojis:
- Use **bold** for important terms, project names, and key metrics
- Use *italic* for emphasis
- Use bullet points (- or *) for lists
- Use numbered lists (1., 2., etc.) for step-by-step information
- Use `code` for technical terms or blockchain addresses
- Use ## for section headers if needed
- Use relevant emojis to make the response more engaging and interactive:
  * 📈 for market trends and growth
  * 📉 for market declines or bearish sentiment
  * 💰 for prices and financial metrics
  * 🎨 for NFT collections and art
  * 🔥 for trending/hot topics
  * 💎 for valuable or premium NFTs
  * 🌟 for notable projects or achievements
  * ⚠️ for warnings or risks
  * 🚀 for launches and new developments
  * 🎯 for targets and goals
"""

        response = model.generate_content(prompt)
        return response.text
    except Exception:
        return f"Unable to generate summary. Raw context: {context_text[:500]}..."


def get_nft_market_analysis(user_query):
    """Main logic: Decide data source, fetch, summarize"""
    local_data = load_local_knowledge()

    source_choice = decide_data_source(user_query, local_data)
    print(f"[DEBUG] Data source chosen: {source_choice}")

    context = ""
    images = []

    if source_choice == "local" and local_data:
        context = local_data
        print(f"[DEBUG] Using local FraudGuard documentation")
    else:
        print(f"[DEBUG] Using live NFT news search")
        search_results = search_nft_news(user_query) or fallback_search(user_query)
        results = search_results.get("results", [])

        for i, item in enumerate(results[:3], 1):
            title = item.get('title', 'No title')
            url = item.get('url', 'No URL')
            content = item.get('content', 'No content available')
            context += f"{i}. {title}\nSource: {url}\nContent: {content}\n\n"

            if item.get("images"):
                images.extend(item["images"])

    summary = summarize_with_gemini(user_query, context, source_choice)

    return {
        "query": user_query,
        "summary": summary,
        "images": images[:3],
        "data_source": source_choice
    }
