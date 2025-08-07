## **⚙️ Tech Stack**

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Blockchain** | **Sui (Move)** | For creating the smart contracts that govern the marketplace, NFTs, and the on-chain `FraudFlag` objects. The object-centric model is perfect for this. |
| **Frontend** | **Vite & TypeScript** | To build a fast, user-friendly interface. Connects to the Sui network via wallet adapters (`@mysten/dapp-kit`) to read on-chain data and submit transactions. |
| **Backend API** | **FastAPI (Python)** | To serve as the communication hub. The frontend might call it for cached data, but its main job is to run the AI agent logic. |
| **AI Agent Logic**| **LangChain / LangGraph (Python)**| To structure the fraud detection flow. **LangGraph** is excellent for creating the stateful, multi-step agent that will: 1. See event, 2. Analyze, 3. Decide, 4. Act. |
| **Vector DB / Cache**| **Supabase (Postgres w/ pgvector)**| **This is crucial.** You need Supabase for: <br>1. **Vector Database**: Store image embeddings from NFTs and perform similarity searches for plagiarism detection. <br>2. **Cache**: Store wallet activity or other data to avoid spamming the Sui RPC endpoint. |
