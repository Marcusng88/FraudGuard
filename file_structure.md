```plaintext
/fraudguard/
|
|--- 📄 README.md
|--- 📄 package.json        # Main package file to run all services concurrently
|
|--- 📂 sui/                 # Sui Smart Contracts
|    |
|    |--- 📄 Move.toml
|    |--- 📂 sources/
|         |--- 📄 marketplace.move  # Core logic: list, buy, transfer
|         |--- 📄 fraud_flag.move   # Logic for creating and attaching flags
|
|--- 📂 frontend/            # Next.js Application
|    |
|    |--- 📄 package.json
|    |--- 📄 next.config.js
|    |--- 📂 src/
|         |--- 📂 app/         # App router structure
|         |--- 📂 components/
|         |    |--- MarketplaceGrid.tsx
|         |    |--- NftCard.tsx
|         |    |--- FraudWarningBanner.tsx
|         |--- 📂 hooks/
|         |    |--- useSuiNfts.ts    # Hook to fetch NFTs and fraud flags
|         |--- 📂 utils/
|              |--- sui.ts        # Sui client configuration
|
|--- 📂 backend/             # FastAPI & AI Agent
     |
     |--- 📄 requirements.txt
     |--- 📄 main.py            # FastAPI app setup
     |--- 📂 agent/
     |    |--- 📄 __init__.py
     |    |--- 📄 chain.py         # LangGraph/LangChain logic definition
     |    |--- 📄 tools.py        # Tools for the agent (image analysis, sui tx signing)
     |    |--- 📄 listener.py      # Service that listens to Sui RPC for new objects
     |--- 📂 core/
          |--- 📄 config.py      # Environment variables (SUI_RPC, SUPABASE_KEY)