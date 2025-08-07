# FraudGuard Project Setup Guide

## 🚀 Quick Start

### Automated Startup (Recommended)
1. **Run the startup script:**
   ```bash
   start-project.bat
   ```

This will automatically:
- ✅ Check dependencies
- 🔧 Start the backend API server (http://localhost:8000)
- 🎨 Start the frontend development server (http://localhost:8080)
- 🌐 Open browser tabs for both interfaces

### Manual Startup

#### 1. Backend API Server
```bash
cd backend
D:/FraudGuard/.venv/Scripts/python.exe start.py
```
- API will be available at: http://localhost:8000
- API documentation at: http://localhost:8000/docs

#### 2. Frontend Development Server
```bash
cd frontend
npm run dev
```
- Frontend will be available at: http://localhost:8080

## 🔗 Blockchain (Sui) Setup

### Prerequisites
- ✅ Sui CLI installed (v1.53.2+ detected)
- ✅ Active testnet environment configured
- ⚠️ Need testnet SUI tokens

### Get Testnet Tokens
1. Visit: https://faucet.sui.io/?address=0x8e13a481fd57f1ab3bb25d3d7d563c990711a0dbd0da618aff3c4b166a8b69da
2. Request testnet SUI tokens
3. Wait for confirmation

### Deploy Smart Contracts
```bash
cd sui
deploy.bat
```

## 📊 Current Project Status

### ✅ Working Components
- **Backend API**: FastAPI server with AI fraud detection
- **Frontend**: React/Vite application with Sui wallet integration
- **AI Integration**: Google Gemini Pro Vision for fraud analysis
- **Database**: Supabase with vector storage
- **Environment**: Fully configured with all dependencies

### 🔧 Configuration
- **Environment variables**: Configured in `backend/.env`
- **API endpoints**: Available and documented
- **Sui network**: Connected to testnet
- **AI models**: Google Gemini configured

### 🌐 Access Points
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:8080
- **Sui Explorer**: https://testnet.suivision.xyz/

## 🛠 Development Workflow

1. **Start services** using `start-project.bat`
2. **Develop**: Edit code in `backend/` or `frontend/`
3. **Test**: Use API docs at http://localhost:8000/docs
4. **Deploy contracts**: Run `sui/deploy.bat` when ready
5. **Test full flow**: Create, list, and detect fraud on NFTs

## 📝 Next Steps

1. **Get testnet tokens** from Sui faucet
2. **Deploy smart contracts** using the deploy script
3. **Test the full NFT marketplace** workflow
4. **Create and test fraud detection** on sample NFTs

## 🚨 Troubleshooting

- **Backend issues**: Check terminal output for Python errors
- **Frontend issues**: Check browser console for JavaScript errors
- **Sui issues**: Ensure you have testnet tokens and proper network config
- **Dependencies**: Re-run `npm install` in frontend if needed

The entire FraudGuard project is now running and ready for development! 🎉
