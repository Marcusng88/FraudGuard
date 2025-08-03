# FraudGuard NFT Marketplace Setup Guide

This guide will help you set up the FraudGuard NFT marketplace with real data fetching functionality.

## Architecture Overview

- **Frontend**: React + TypeScript + Vite + TanStack Query
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Database**: PostgreSQL/Supabase
- **Blockchain**: Sui Network

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **PostgreSQL** database (or Supabase account)

## Setup Instructions

### 1. Database Setup

First, set up your PostgreSQL database and run the schema script:

```bash
# If using local PostgreSQL
psql -U your_username -d your_database -f database_schema.sql

# Or execute the SQL file content in your database management tool
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy nul .env  # Windows
# OR
touch .env     # macOS/Linux
```

Add these environment variables to `backend/.env`:

```env
# Database Configuration
SUPABASE_DB_URL=postgresql://username:password@localhost:5432/fraudguard
# OR for Supabase:
# SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Optional: AI Configuration
GOOGLE_API_KEY=your_google_api_key
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# OR
bun install
```

The frontend `.env` file should already have:
```env
VITE_API_URL=http://localhost:8000
```

### 4. Running the Application

#### Start Backend Server

```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
# OR
bun dev
```

The frontend will be available at `http://localhost:5173`

## Testing the Implementation

### 1. Check API Health

Visit `http://localhost:8000` - you should see:
```json
{
  "message": "FraudGuard API",
  "version": "1.0.0",
  "status": "running"
}
```

### 2. Test Marketplace Endpoint

Visit `http://localhost:8000/api/marketplace/nfts` - you should see the sample NFT data.

### 3. Test Frontend

1. Go to `http://localhost:5173/marketplace`
2. You should see real NFT data from the database
3. Search and filtering should work
4. Click on any NFT to view its details

## Key Features Implemented

✅ **Real Data Fetching**: No more mock data - everything comes from the database
✅ **NFT Marketplace Listing**: View all available NFTs with real data
✅ **Search & Filtering**: Search by name/creator, filter by threat level
✅ **Pagination**: Handle large datasets efficiently
✅ **NFT Detail Page**: Click any NFT to view detailed information
✅ **Threat Level Indicators**: Visual indicators for fraud status
✅ **Loading States**: Proper loading and error handling
✅ **Responsive Design**: Maintains the original cyber-themed layout

## API Endpoints

- `GET /api/marketplace/nfts` - List marketplace NFTs with filters
- `GET /api/marketplace/nfts/{nft_id}` - Get NFT details
- `GET /api/marketplace/stats` - Get marketplace statistics
- `GET /api/marketplace/featured` - Get featured NFTs

## Database Tables

- `users` - User profiles and verification status
- `nfts` - NFT metadata and marketplace information
- `fraud_flags` - AI-generated fraud detection flags
- `trades` - Trading history and transactions
- `marketplace_stats` - Cached marketplace statistics

## Next Steps

1. **Authentication Integration**: Add zkLogin for user authentication
2. **Real-time Updates**: WebSocket connections for live data
3. **Transaction Integration**: Connect with Sui blockchain for actual purchases
4. **Enhanced AI Features**: Implement real fraud detection algorithms

## Troubleshooting

**Backend Issues:**
- Ensure PostgreSQL is running and accessible
- Check database connection string in `.env`
- Verify all Python dependencies are installed

**Frontend Issues:**
- Ensure backend is running on port 8000
- Check browser network tab for API errors
- Verify environment variables are set correctly

**Database Issues:**
- Run the schema script to create tables and sample data
- Check database permissions and connection settings

## Sample Data

The database schema includes sample NFT data to test the marketplace functionality:
- 5 sample NFTs with different threat levels
- Sample users (creators and owners)
- One fraud flag example
- Marketplace statistics

This gives you a fully functional marketplace to demonstrate the real data integration!
