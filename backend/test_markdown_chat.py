#!/usr/bin/env python3
"""
Quick test to verify markdown and emoji formatting in chat bot responses
"""

import sys
import os

# Add the current directory to the path so we can import the chat_bot module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent.chat_bot import get_nft_market_analysis, validate_environment

def test_markdown_formatting():
    """Test that the chat bot generates markdown with emojis"""
    
    print("🧪 Testing Markdown & Emoji Formatting")
    print("=" * 50)
    
    # Validate environment first
    is_valid, error_msg = validate_environment()
    if not is_valid:
        print(f"❌ Environment validation failed: {error_msg}")
        return
    
    print("✅ Environment validation passed")
    print()
    
    # Test a FraudGuard-specific query
    test_query = "How does FraudGuard's fraud detection work?"
    
    print(f"🔍 Testing query: '{test_query}'")
    print("-" * 40)
    
    try:
        result = get_nft_market_analysis(test_query)
        print(f"📊 Data Source: {result.get('data_source', 'unknown')}")
        print(f"📝 Response:")
        print(result['summary'])
        print()
        
        # Check for markdown elements
        response = result['summary']
        has_bold = '**' in response
        has_italic = '*' in response and '**' not in response.replace('**', '')
        has_emoji = any(ord(char) > 127 for char in response)
        has_bullets = '- ' in response or '* ' in response
        
        print("🔍 Formatting Analysis:")
        print(f"  Bold text (**): {'✅' if has_bold else '❌'}")
        print(f"  Italic text (*): {'✅' if has_italic else '❌'}")
        print(f"  Emojis: {'✅' if has_emoji else '❌'}")
        print(f"  Bullet points: {'✅' if has_bullets else '❌'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Markdown formatting test completed!")

if __name__ == "__main__":
    test_markdown_formatting()
