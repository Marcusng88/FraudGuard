# 🧠 NFT Marketplace with Fraud Detection (Sui + FastAPI + Supabase + Walrus)

This project is a decentralized NFT marketplace (like Shopee) where users can:
- Log in with **zkLogin (Google)**
- Upload and mint NFTs
- Run **AI-based fraud detection** on images
- List NFTs for sale via marketplace
- Buy NFTs directly using on-chain logic

---

## ⚙️ Tech Stack

| Component     | Description |
|---------------|-------------|
| **Sui**       | Blockchain for NFTs, ownership, and trading |
| **Marketplace** | On-chain marketplace for listing/buying NFTs |
| **FastAPI**   | Backend logic for upload, fraud detection, minting |
| **Walrus**    | S3-compatible storage for NFT images and metadata |
| **Supabase**  | PostgreSQL + pgvector for metadata, user data, fraud results |
| **zkLogin**   | Web3 walletless login via Google |
| **AI Agent**  | Custom fraud scanner with confidence scoring and flags |

---

## 🛠️ Workflow: Create + Sell NFT

### 1. 🧾 User Inputs NFT Info
- NFT image upload
- Title, description, category
- Price
- Authenticated via **zkLogin**
- Sends data to FastAPI

---

### 2. 📦 Upload Image to Walrus
- FastAPI uploads image to Walrus
- Receives a public `image_url`

---

### 3. 🧠 AI Fraud Detection
- FastAPI sends image + metadata to AI agent
- Agent returns:
  ```json
  {
    "is_fraud": false,
    "confidence_score": 0.15,
    "flag_type": null,
    "reason": null,
    "analysis_details": {...}
  }
4. 🧠 Supabase: Store Metadata & Embedding
FastAPI generates image embedding (GoogleGenAIEmbeddings)

Inserts NFT into Supabase nfts table:

image_url

title, description, category, price

fraud analysis results

embedding vector

links to owner (wallet)

5. 🛠️ Mint NFT on Sui
FastAPI uses Sui SDK to:

Call custom mint_nft() Move function

Pass metadata URL and fraud results

On success, receives:

sui_object_id

Updates Supabase:

status = minted

sui_object_id added

6. 🛒 List NFT for Sale
Frontend uses wallet adapter to:

Sign transaction to list NFT for sale

NFT is listed in user’s kiosk

Listed NFTs are discoverable

7. 👥 Buyer Purchases NFT
Buyer browses listed NFTs (via Supabase query)

Wallet signs:

purchase_nft(listing_id)

Ownership is transferred on-chain

8. 🔄 Sync Supabase with Chain
Optional webhook or indexer:

Updates Supabase after purchase

Marks NFT as sold

📄 Supabase Schema Overview
users
id, wallet_address, email, username, avatar_url, reputation_score

nfts
id, owner_id, wallet_address, title, description, category, price

image_url, embedding_vector, is_fraud, confidence_score, reason

analysis_details, sui_object_id, status

listings
id, nft_id, seller_id, price, expires_at, status

flags
id, nft_id, user_id, reason

🧬 Move Module Overview
move
Copy
Edit
struct NFT has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    category: String,
    metadata_url: String,
    fraud_flag: bool,
    confidence_score: u64,
}

public entry fun mint_nft(
    recipient: &signer,
    name: String,
    description: String,
    image_url: String,
    category: String,
    metadata_url: String,
    fraud_flag: bool,
    confidence_score: u64
): NFT {
    NFT {
        id: object::new(),
        name,
        description,
        image_url,
        category,
        metadata_url,
        fraud_flag,
        confidence_score
    }
}