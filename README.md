# 📄 Product Requirements Document: FraudGuard

### **Vision & Mission** 💡

**Vision:** To create the most trustworthy decentralized marketplace by empowering users and protecting creators with transparent, real-time, AI-driven fraud detection.

**Mission (for this Hackathon):** To build a functional MVP of an on-chain marketplace on the Sui network that integrates an AI agent to detect and flag potential plagiarism and suspicious on-chain behavior, making this information visible to users directly on the frontend.

---

## **🧑‍💻 Target Audience**

1.  **NFT Creators/Artists:** Want to protect their original work from plagiarism and theft.
2.  **NFT Collectors/Traders:** Want to make informed purchasing decisions and avoid scams, fake assets, and manipulated prices.
3.  **Marketplace Operators:** (Future) Want to build a reputable platform with automated, decentralized moderation.

---

## **Core Features & User Stories (MVP Scope)**

### **1. On-Chain Marketplace (Sui)**
This is the decentralized foundation of the application.

* **User Story:** As a user, I can connect my Sui wallet to the marketplace.
* **User Story:** As a creator, I can mint an NFT and list it for sale on the marketplace smart contract.
* **User Story:** As a buyer, I can purchase a listed NFT, which transfers ownership to my wallet.
* **User Story:** As the AI Agent, I can call a specific function on the smart contract to attach a `FraudFlag` to a specific NFT object.

### **2. AI Fraud Detection Agent (Backend: FastAPI, LangChain)**
This is the "brain" that monitors and acts on suspicious activity.

* **User Story (Visual AI):** As the agent, when a new NFT is minted, I will analyze its image, create a vector embedding, and compare it against a database of existing NFT images to detect potential plagiarism or duplicates.
* **User Story (Behavioral AI):** As the agent, I will monitor on-chain events for simple red flags, such as a single wallet minting an unusually high number of NFTs in a short period.
* **User Story (Enforcement):** As the agent, if I detect a high probability of fraud (either visual or behavioral), I will automatically sign and submit a transaction to the Sui network to flag the corresponding NFT object.

### **3. Marketplace Frontend (Next.js)**
This is the user-facing window into the marketplace.

* **User Story:** As a user, I can browse all NFTs listed on the marketplace.
* **User Story:** As a user, when I view an NFT that has been flagged by the AI Agent, I will see a clear and prominent warning message (e.g., "⚠️ High Plagiarism Risk Detected" or "⚠️ Suspicious Minting Activity Detected").
* **User Story:** As a user, the warning will not prevent me from buying, but it will allow me to make a more informed decision.

---

## **⚙️ Tech Stack**

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Blockchain** | **Sui (Move)** | For creating the smart contracts that govern the marketplace, NFTs, and the on-chain `FraudFlag` objects. The object-centric model is perfect for this. |
| **Frontend** | **Next.js & TypeScript** | To build a fast, user-friendly interface. Connects to the Sui network via wallet adapters (`@mysten/dapp-kit`) to read on-chain data and submit transactions. |
| **Backend API** | **FastAPI (Python)** | To serve as the communication hub. The frontend might call it for cached data, but its main job is to run the AI agent logic. |
| **AI Agent Logic**| **LangChain / LangGraph (Python)**| To structure the fraud detection flow. **LangGraph** is excellent for creating the stateful, multi-step agent that will: 1. See event, 2. Analyze, 3. Decide, 4. Act. |
| **Vector DB / Cache**| **Supabase (Postgres w/ pgvector)**| **This is crucial.** You need Supabase for: <br>1. **Vector Database**: Store image embeddings from NFTs and perform similarity searches for plagiarism detection. <br>2. **Cache**: Store wallet activity or other data to avoid spamming the Sui RPC endpoint. |
<!-- | **Deployment** | **Vercel** (Frontend), **Render/Railway** (Backend)| For easy and fast deployment during the hackathon. | -->

### **Why Supabase is needed:**
Your AI agent can't scan the *entire blockchain* for every new image. Instead, when a new NFT is minted, the agent's process will be:
1.  Take the NFT's image URL.
2.  Convert the image to a vector embedding using a model like CLIP.
3.  **Query Supabase:** "Find any vectors in my database that are highly similar to this new vector."
4.  If a match is found, flag for plagiarism.
5.  **Insert into Supabase:** Store the new, non-plagiarized image's vector for future checks.

---

## **📂 Proposed MVP File Structure**

Here is a logical way to structure your project monorepo.

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