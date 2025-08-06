# 📋 My Listings Feature Documentation

## Overview

The "My Listings" feature in FraudGuard allows users to view and manage NFTs they have uploaded and listed for sale on the marketplace. This feature is accessible through the Profile page and provides comprehensive listing management capabilities.

## 🎯 Feature Access

### How to Access My Listings

1. **Navigate to Profile**: Click on your profile or go to `/profile`
2. **Select Tab**: Click on the "My Listings" tab
3. **View Listings**: See all your active marketplace listings

### Alternative: My Collection Tab

- **My Collection**: Shows ALL your NFTs (both listed and unlisted)
- **My Listings**: Shows ONLY your active marketplace listings

## 🎨 User Interface Components

### 1. Statistics Dashboard
- **Total Listings**: Count of all your listings
- **Active Listings**: Count of currently active listings
- **Total Value**: Combined value of all your listings in SUI

### 2. Search and Filter
- **Search Bar**: Search by NFT title or your username
- **Status Filters**: 
  - All listings
  - Active listings
  - Sold listings
  - Expired listings

### 3. Listing Cards
Each listing displays:
- **NFT Image**: High-quality preview
- **Title**: NFT name
- **Price**: Listed price in SUI
- **Status Badge**: Current listing status
- **Date**: When listed/last updated
- **Actions**: Edit price, view details, unlist

### 4. Quick Actions
- **List NFT**: Create new listing from unlisted NFTs
- **Edit Listing**: Update price and metadata
- **Unlist NFT**: Remove from marketplace
- **View Details**: See full NFT information

## 🔧 Functionality

### Creating New Listings

1. **Click "List NFT"** button
2. **Select NFT** from your unlisted collection
3. **Set Price** in SUI
4. **Confirm** to create listing

**Requirements:**
- NFT must be minted (status: 'minted')
- NFT must not be already listed
- NFT must not be flagged as fraudulent

### Managing Existing Listings

#### Edit Listing
1. Click **Edit** button on listing card
2. Enter new price
3. Confirm update

#### Unlist NFT
1. Click **Unlist** button on listing card
2. Confirm removal from marketplace
3. NFT returns to your collection

### Status Indicators

- **🟢 Active**: Listed and available for purchase
- **🔵 Sold**: Successfully sold
- **🟡 Expired**: Listing has expired
- **🔴 Flagged**: Marked as potentially fraudulent

## 🏗️ Technical Implementation

### Frontend Components

```
Profile.tsx
├── MyNFTs.tsx (My Collection tab)
└── ListingManager.tsx (My Listings tab)
```

### API Endpoints Used

- `GET /api/listings/user/{wallet_address}` - Fetch user listings
- `GET /api/nft/user/{wallet_address}` - Fetch user NFTs
- `POST /api/listings` - Create new listing
- `PUT /api/listings/{listing_id}` - Update listing
- `DELETE /api/listings/{listing_id}` - Delete listing

### Data Flow

1. **Load Profile**: Fetch user data and statistics
2. **Load Listings**: Get user's active listings from backend
3. **Load NFTs**: Get user's NFT collection for listing creation
4. **Real-time Updates**: Refresh data after listing operations

## 📱 User Experience

### Responsive Design
- **Desktop**: Multi-column grid layout with detailed cards
- **Tablet**: 2-column grid with condensed information
- **Mobile**: Single column with stacked layout

### Visual Feedback
- **Loading States**: Spinners during data fetching
- **Success Messages**: Confirmation of successful operations
- **Error Handling**: Clear error messages for failed operations
- **Empty States**: Helpful guidance when no listings exist

### Navigation Flow
```
Marketplace → Profile → My Listings
     ↓
View/Edit/Unlist NFTs
     ↓
Back to Collection or Create New Listing
```

## 🔍 Search and Discovery

### Search Functionality
- **Title Search**: Find NFTs by name
- **Creator Search**: Find by your username
- **Real-time**: Results update as you type

### Filter Options
- **Status-based**: Active, sold, expired listings
- **Combined Filters**: Search + status filtering
- **Clear Filters**: Reset to show all listings

## 📊 Analytics and Insights

### Personal Statistics
- **Listing Performance**: Success rates and average prices
- **Sales History**: Track your marketplace activity
- **Portfolio Value**: Monitor total listing value

### Marketplace Context
- **Market Position**: How your listings compare
- **Pricing Insights**: Suggested pricing based on similar NFTs
- **Trend Analysis**: Market performance over time

## 🛡️ Security and Safety

### Fraud Protection
- **AI Detection**: Automatic fraud scanning
- **Confidence Scores**: Risk assessment display
- **Warning Systems**: Clear fraud indicators
- **Safe Trading**: Protected transaction flow

### Access Control
- **Wallet Authentication**: Secure wallet connection required
- **Owner Verification**: Only list/edit your own NFTs
- **Transaction Security**: Secure blockchain operations

## 🚀 Getting Started

### Prerequisites
1. **Connect Wallet**: Valid Sui wallet connection
2. **Create NFTs**: Upload and mint NFTs first
3. **Profile Setup**: Complete basic profile information

### First Time Use
1. **Go to Profile**: Navigate to `/profile`
2. **Check Collection**: View your NFTs in "My Collection"
3. **Create Listing**: List your first NFT for sale
4. **Monitor Performance**: Track in "My Listings"

## 💡 Tips and Best Practices

### Pricing Strategy
- **Research Market**: Check similar NFT prices
- **Competitive Pricing**: Price competitively for faster sales
- **Regular Updates**: Adjust prices based on market response

### Listing Management
- **Regular Reviews**: Check your listings periodically
- **Update Metadata**: Keep descriptions current
- **Respond to Market**: Adjust to market conditions

### Quality Control
- **High-Quality Images**: Use clear, attractive images
- **Detailed Descriptions**: Provide comprehensive information
- **Honest Representation**: Accurately represent your NFTs

## 🔧 Troubleshooting

### Common Issues

**"No NFTs available for listing"**
- Ensure you have minted NFTs
- Check that NFTs aren't already listed
- Verify NFTs aren't flagged as fraudulent

**"Failed to create listing"**
- Check wallet connection
- Verify sufficient gas fees
- Ensure NFT ownership

**"Listings not loading"**
- Check internet connection
- Verify backend service is running
- Try refreshing the page

### Support Resources
- **Documentation**: This guide and API docs
- **Community**: Discord/Telegram support channels
- **Technical Support**: GitHub issues for bugs

---

## 📞 Support

For technical issues or feature requests, please:
1. Check this documentation first
2. Search existing GitHub issues
3. Create a new issue with detailed description
4. Include wallet address and error messages

**Happy Trading!** 🎨✨
