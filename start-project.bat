@echo off
REM FraudGuard Project Startup Script
REM This script starts all components of the FraudGuard project

echo.
echo ========================================
echo 🚀 Starting FraudGuard Project
echo ========================================
echo.

REM Check if Python virtual environment exists
if not exist ".venv\Scripts\python.exe" (
    echo ❌ Python virtual environment not found
    echo Please run setup first or install dependencies
    pause
    exit /b 1
)

REM Check if node_modules exists in frontend
if not exist "frontend\node_modules" (
    echo ❌ Frontend dependencies not installed
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

echo ✅ Dependencies check complete
echo.

REM Start Backend Server
echo 🔧 Starting Backend API Server...
start "FraudGuard Backend" cmd /c "cd /d %~dp0backend && %~dp0.venv\Scripts\python.exe start.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start Frontend Development Server
echo 🎨 Starting Frontend Development Server...
start "FraudGuard Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

REM Wait a moment for frontend to start
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo ✅ FraudGuard Project Started!
echo ========================================
echo.
echo 📍 Backend API: http://localhost:8000
echo 📚 API Documentation: http://localhost:8000/docs
echo 🎨 Frontend: http://localhost:8080
echo.
echo 🌐 Opening web interfaces...

REM Open browser tabs
start http://localhost:8000/docs
timeout /t 2 /nobreak > nul
start http://localhost:8080

echo.
echo ⚡ To deploy smart contracts:
echo    1. Get testnet SUI tokens from: https://faucet.sui.io/
echo    2. Run: sui\deploy.bat
echo.
echo 🛑 To stop all services, close the terminal windows
echo.
pause
