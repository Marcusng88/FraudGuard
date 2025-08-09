# Environment Setup for FraudGuard Frontend

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```bash
# Sui Blockchain Configuration
VITE_MARKETPLACE_PACKAGE_ID=0x7ae460902e9017c7c9a5c898443105435b7393fc5776ace61b2f0c6a1f578381
VITE_MARKETPLACE_OBJECT_ID=0x...

# Backend API Configuration (optional, defaults to localhost)
VITE_API_BASE_URL=http://localhost:8000

# Pinata IPFS Configuration (for image/metadata uploads)
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_API_KEY=your_pinata_secret_key
VITE_PINATA_JWT=your_pinata_jwt_token
```

## Setting Up Your .env File

1. Copy the content above into a new file named `.env` in the `frontend/` directory
2. Update `VITE_MARKETPLACE_PACKAGE_ID` with your deployed package ID
3. Update `VITE_MARKETPLACE_OBJECT_ID` with your marketplace object ID
4. Optionally update `VITE_API_BASE_URL` with your backend API URL

## Why Environment Variables?

- **Security**: Keeps sensitive configuration out of source code
- **Flexibility**: Easy to change for different environments (dev, staging, prod)
- **Maintainability**: Central configuration management

## Fallback Values

If environment variables are not set, the application will use fallback values:
- `VITE_MARKETPLACE_PACKAGE_ID`: Falls back to the hardcoded package ID
- `VITE_MARKETPLACE_OBJECT_ID`: Falls back to '0x...' (needs to be configured)

You'll see console warnings if these variables are not properly configured.

## Deployment Notes

For production deployment:
1. Set environment variables in your hosting platform
2. Never commit `.env` files to version control
3. Use `.env.example` to document required variables
