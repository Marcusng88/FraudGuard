@echo off
REM FraudGuard Contract Upgrade Script for Windows
REM This script upgrades the existing FraudGuard NFT contracts on Sui testnet

echo 🚀 Starting FraudGuard contract upgrade...

REM Check if sui CLI is installed
where sui >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Sui CLI is not installed. Please install it first.
    echo Visit: https://docs.sui.io/build/install
    pause
    exit /b 1
)

REM Check if we're in the sui directory
if not exist "Move.toml" (
    echo ❌ Move.toml not found. Please run this script from the sui directory.
    pause
    exit /b 1
)

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist "build" rmdir /s /q build 2>nul
if exist "Move.lock" del /f /q "Move.lock" 2>nul

REM Build the package
echo 🔨 Building the Move package...
sui move build --skip-fetch-latest-git-deps

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please check your Move code for errors.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Check current active address
echo 📍 Active address:
sui client active-address

REM Check balance
echo 💰 Checking SUI balance...
sui client gas

REM Upgrade the existing package
echo 🚀 Upgrading existing package on Sui testnet...
echo.
echo 📦 Current Package ID: 0xa97d9b127b18afe9cc4c42f3fdab5c5044fa2c2aa2d2883049e009e0ea1cacf1
echo.
sui client upgrade --gas-budget 100000000 0xa97d9b127b18afe9cc4c42f3fdab5c5044fa2c2aa2d2883049e009e0ea1cacf1

if %errorlevel% neq 0 (
    echo ❌ Upgrade failed.
    pause
    exit /b 1
)

echo ✅ Upgrade successful!
echo.
echo 🎉 Contract upgraded successfully!
echo 📋 The mint_nft_with_id function should now work properly.
echo.
echo 🔗 View your contract on Sui Explorer:
echo https://testnet.suivision.xyz/package/0xa97d9b127b18afe9cc4c42f3fdab5c5044fa2c2aa2d2883049e009e0ea1cacf1
echo.
pause 