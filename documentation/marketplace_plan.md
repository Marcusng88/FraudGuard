# NFT Marketplace Implementation Plan

## 1. Vision & Goal

The goal is to build a decentralized NFT marketplace on the Sui network that leverages Sui Kiosk for listings and zkLogin for user authentication. A key feature is the integration of a backend AI agent that detects plagiarism and suspicious on-chain activity, providing real-time fraud alerts to users on the frontend.

This plan outlines the architecture, technical components, and development steps required to achieve this vision for the hackathon.

---

## 2. High-Level Architecture

The system consists of four main pillars:

1.  **Sui Blockchain (The Ledger):**
    *   **Smart Contracts (Move):** Defines the NFT, the `FraudFlag`, and the logic for interacting with Sui Kiosks.
    *   **Sui Kiosk:** The standard on-chain solution for managing listings and sales. Each user will have their own Kiosk.
    *   **zkLogin:** Provides a seamless, social-login-based wallet experience for users.

2.  **Frontend (The User Interface):**
    *   **Framework:** Vite with React/TypeScript.
    *   **Responsibilities:** Wallet connection (zkLogin), minting NFTs, managing personal Kiosks (listing/delisting), browsing a global marketplace view, purchasing NFTs, and displaying AI-driven fraud warnings.

3.  **Backend (The AI Brain):**
    *   **Framework:** FastAPI (Python) with LangGraph.
    *   **Responsibilities:**
        *   Listen to on-chain events (e.g., new NFT mints).
        *   Perform AI analysis (visual plagiarism check, behavioral patterns).
        *   Interact with Supabase for data caching and vector similarity search.
        *   Submit on-chain transactions to flag suspicious NFTs.
        *   Provide an API endpoint for the frontend to fetch aggregated marketplace data.

4.  **Supabase (The Memory):**
    *   **Vector Database (pgvector):** Stores image embeddings of all minted NFTs for plagiarism checks.
    *   **Cache:** Stores indexed data from on-chain Kiosks to provide a fast, aggregated marketplace view for the frontend, reducing reliance on direct RPC calls.

---

## 3. Detailed Development Plan

### Phase 1: Smart Contracts (Sui/Move)

The foundation of the marketplace.

*   **File:** `sui/sources/marketplace.move`
*   **Actions:**
    1.  **NFT Contract:**
        *   Define a new NFT object (`MarketNFT`) with standard fields: `name`, `description`, `url` (for the image).
        *   Ensure it has the `key` and `store` abilities.
        *   The `url` field is crucial for the AI agent.
    2.  **Fraud Flag Contract:**
        *   Define a `FraudFlag` object that can be attached to a `MarketNFT`.
        *   It should contain fields like `reason: vector<u8>` (e.g., "Plagiarism Risk") and `reported_by: address`.
        *   Create a public function `flag_nft(nft: &mut MarketNFT, reason: vector<u8>, ctx: &mut TxContext)` that can only be called by the designated AI Agent's address. This will attach the flag.
    3.  **Kiosk Integration:**
        *   The minting function will transfer the newly created `MarketNFT` directly to the user's wallet.
        *   Users will then use the standard Sui Kiosk functions to list their `MarketNFT` for sale. We will not write a custom marketplace contract but instead rely on the battle-tested Kiosk standard.
        *   The listing price will be set using the Kiosk policy.

### Phase 2: Backend AI Agent & Indexer

The intelligence layer that monitors the chain.

*   **Files:** `backend/agent/*`
*   **Actions:**
    1.  **On-Chain Listener (`listener.py`):**
        *   Subscribe to Sui network events, specifically looking for new `MarketNFT` creation events.
    2.  **AI Logic (`fraud_detector.py`):**
        *   When a new NFT is detected, trigger the LangGraph agent.
        *   **Step 1: Analyze Image:** Get the NFT's `url`, download the image, and convert it to a vector embedding using a CLIP model.
        *   **Step 2: Query Supabase:** Perform a similarity search on the `pgvector` table in Supabase to find visually similar images.
        *   **Step 3: Decide:** If a highly similar vector is found, classify it as high-risk for plagiarism.
        *   **Step 4: Act:** If flagged, call the `flag_nft` function in the `marketplace.move` contract using the agent's Sui wallet.
        *   **Step 5: Store New Vector:** If the image is original, insert its vector embedding into the Supabase table for future checks.
    3.  **Marketplace Indexer (`main.py`):**
        *   Create a background task that periodically scans the blockchain for all public Kiosks containing `MarketNFT`s.
        *   Cache the NFT details, owner, price, and any attached `FraudFlag`s in a regular Supabase table.
        *   Create a FastAPI endpoint `/marketplace` that the frontend can call to get a paginated list of all for-sale NFTs. This avoids the frontend having to make many slow RPC calls.

### Phase 3: Frontend Implementation (Vite with React/TypeScript)

Tying everything together for the user.

*   **Files:** `frontend/src/*`
*   **Actions:**
    1.  **zkLogin Integration:**
        *   Implement the `@mysten/dapp-kit` and `@mysten/zksend` packages.
        *   Create a login flow that allows users to sign in with Google/Twitch.
        *   For now, the derived Sui address can be a placeholder, but the UI flow should be built. The key is to get a `SuiClient` and a `Signer` instance for the user.
    2.  **Create NFT Page (`CreateNft.tsx`):**
        *   Build a form to upload an image (to a service like IPFS or Supabase Storage) and enter a name/description.
        *   On submit, call the `mint` function from our `marketplace.move` contract.
    3.  **Profile/Kiosk Management Page (`Profile.tsx`):**
        *   After logging in, check if the user has a Kiosk. If not, provide a button to create one.
        *   Display all `MarketNFT`s owned by the user.
        *   For each NFT, provide a "List for Sale" button that opens a dialog to set a price. This action will call the Kiosk `list` function.
    4.  **Marketplace Page (`Marketplace.tsx`):**
        *   Fetch data from the backend's `/marketplace` endpoint instead of using mock data.
        *   Display all listed NFTs in a grid.
        *   **Crucially:** If an NFT has a `FraudFlag`, display a prominent warning icon and message on its card (`FraudAlert.tsx`).
    5.  **Purchase Flow:**
        *   When a user clicks "Buy" on an NFT, use the Kiosk standard functions to execute the purchase. This will involve the buyer providing the necessary SUI and the Kiosk contract handling the atomic swap of the NFT for the SUI.

---

## 4. User Flow Summary

1.  **Login:** User visits the site -> Clicks "Login" -> Authenticates with Google via zkLogin -> Frontend gets a user-specific signer.
2.  **Mint:** User goes to "Create" -> Uploads image, adds details -> Clicks "Mint" -> A `MarketNFT` is created and sent to their wallet.
3.  **AI Check (Async):** Backend agent sees the new mint -> Fetches image -> Checks for plagiarism -> If risky, calls `flag_nft` on-chain.
4.  **List:** User goes to "Profile" -> Sees their new NFT -> Clicks "List" -> Sets a price -> The NFT is placed in their Kiosk for sale.
5.  **Browse:** Another user visits the "Marketplace" -> Frontend fetches aggregated data from the backend -> They see the newly listed NFT, potentially with a fraud warning.
6.  **Buy:** Buyer clicks "Buy" -> Confirms transaction in their wallet -> SUI is transferred to the seller, and the NFT is transferred to the buyer's wallet via the Kiosk transaction.

This plan breaks down the project into manageable phases, ensuring that the on-chain, backend, and frontend components are developed in a logical order.