@echo off
REM FraudGuard Contract Deployment Script for Windows
REM This script deploys the FraudGuard NFT contracts to Sui testnet

echo 🚀 Starting FraudGuard contract deployment...

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

REM Clean previous builds and lock files
echo 🧹 Cleaning previous builds...
if exist "build" (
    echo Removing build directory...
    rmdir /s /q build 2>nul
    if exist "build" (
        echo Retrying build directory removal...
        timeout /t 2 /nobreak >nul
        rmdir /s /q build 2>nul
    )
)

if exist "Move.lock" (
    echo Removing Move.lock file...
    del /f /q "Move.lock" 2>nul
)

REM Create fresh build directory
if not exist "build" mkdir build

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

REM Deploy to testnet
echo 🚀 Deploying to Sui testnet...
sui client publish --gas-budget 200000000 > deploy_output.txt 2>&1

if %errorlevel% neq 0 (
    echo ❌ Deployment failed.
    type deploy_output.txt
    del deploy_output.txt
    pause
    exit /b 1
)

echo ✅ Deployment successful!
type deploy_output.txt

REM Extract package ID from output (basic approach for Windows)
echo.
echo 📦 Please manually copy the Package ID from the output above
echo.
echo ⚡ Next steps:
echo 1. Copy the Package ID from the deployment output
echo 2. Update the PACKAGE_ID in frontend\src\lib\sui-utils.ts
echo 3. Replace '0x0' with your Package ID
echo 4. Restart your frontend development server
echo.
echo 🔗 View your contract on Sui Explorer:
echo https://testnet.suivision.xyz/package/[YOUR_PACKAGE_ID]

del deploy_output.txt
echo.
echo 🎉 Deployment complete!
pause
