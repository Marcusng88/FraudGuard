from chat_bot import validate_environment, get_nft_market_analysis

def test_nft_analysis():
    valid, msg = validate_environment()
    if not valid:
        print(f"⚠️ {msg}")
        return

    query = input("Enter NFT topic: ").strip()
    if not query:
        print("Please enter a valid query.")
        return

    result = get_nft_market_analysis(query)

    print("\n" + "="*50)
    print(f"📊 NFT MARKET ANALYSIS for: {result['query']}")
    print("="*50)
    print(result["summary"])

    if result["images"]:
        print("\n🖼️ Related Images:")
        for idx, img_url in enumerate(result["images"], 1):
            print(f"{idx}. {img_url}")
    else:
        print("\n(No related images found)")
    print("="*50)

if __name__ == "__main__":
    test_nft_analysis()
