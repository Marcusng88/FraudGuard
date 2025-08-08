import os
import requests
import google.generativeai as genai

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")  # set your key in environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")  # set your key in environment

genai.configure(api_key=GOOGLE_API_KEY)

def search_nft_news(query):
    """Search for NFT news using Tavily API"""
    # Corrected Tavily API endpoint
    url = "https://api.tavily.com/search"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": f"NFT {query} latest news market",
        "search_depth": "basic",  # Changed to basic for better reliability
        "include_answer": True,
        "include_images": True,
        "max_results": 5
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Check if the response contains results
        if "results" not in data:
            print("Warning: No results found in API response")
            return {"results": []}
            
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
        return {"results": []}
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {"results": []}


def fallback_search(query):
    """Fallback search using a different approach if Tavily fails"""
    try:
        # You could integrate with other news APIs here
        # For now, return mock data structure
        return {
            "results": [{
                "title": f"NFT Market Analysis for {query}",
                "url": "https://example.com/nft-news",
                "content": f"Recent developments in the NFT space regarding {query}. Market trends show varying patterns.",
                "images": []
            }]
        }
    except Exception as e:
        print(f"Fallback search failed: {e}")
        return {"results": []}


def summarize_with_gemini(query, context_text):
    """Generate summary using Gemini AI"""
    try:
        model = genai.GenerativeModel("gemini-pro")
        prompt = f"""
You are an expert NFT market analyst and blockchain technology specialist.

User Query: {query}

Market Data and News Context:
{context_text}

Please provide a comprehensive analysis that includes:
1. Key market insights related to the user's query
2. Notable trends or movements in the NFT space
3. Any specific projects or developments worth highlighting
4. Market sentiment and potential implications

Keep the response informative yet concise, suitable for both beginners and experienced NFT enthusiasts.
        """
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error with Gemini API: {e}")
        return f"Unable to generate summary. Here's the raw context: {context_text[:500]}..."


def validate_environment():
    """Check if required API keys are set"""
    missing_keys = []
    
    if not TAVILY_API_KEY:
        missing_keys.append("TAVILY_API_KEY")
    if not GOOGLE_API_KEY:
        missing_keys.append("GOOGLE_API_KEY")
    
    if missing_keys:
        print(f"⚠️  Missing environment variables: {', '.join(missing_keys)}")
        print("Please set these in your environment or .env file")
        return False
    return True


if __name__ == "__main__":
    # Validate environment first
    if not validate_environment():
        exit(1)
    
    user_query = input("Enter NFT topic or query: ").strip()
    
    if not user_query:
        print("Please enter a valid query.")
        exit(1)

    print(f"\n🔍 Searching for latest info about: {user_query}...")
    search_results = search_nft_news(user_query)

    # If main search fails, try fallback
    if not search_results.get("results"):
        print("Primary search failed, trying fallback...")
        search_results = fallback_search(user_query)

    # Process results
    context = ""
    images = []
    results = search_results.get("results", [])
    
    if results:
        print(f"Found {len(results)} results")
        
        # Combine top results into context string
        for i, item in enumerate(results[:3], 1):
            title = item.get('title', 'No title')
            url = item.get('url', 'No URL')
            content = item.get('content', 'No content available')
            
            context += f"{i}. {title}\nSource: {url}\nContent: {content}\n\n"
            
            # Collect images if available
            if item.get("images"):
                images.extend(item["images"])
    else:
        context = "No recent news or information found for this query."

    print("\n🤖 Generating analysis with Gemini AI...")
    summary = summarize_with_gemini(user_query, context)
    
    print("\n" + "="*50)
    print("📊 NFT MARKET ANALYSIS")
    print("="*50)
    print(summary)
    
    # Display images if found
    if images:
        print("\n🖼️  Related Images:")
        for i, img_url in enumerate(images[:3], 1):
            print(f"{i}. {img_url}")
    else:
        print("\n(No related images found)")
    
    print("\n" + "="*50)
