@echo off
echo 🚀 Starting Hand Sign Detection Web App
echo =====================================

echo.
echo 📁 Current directory: %CD%
echo.

REM Check if we're in the right directory
if not exist "backend\app.py" (
    echo ❌ Error: backend\app.py not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist ".venv" (
    echo 🔧 Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo 🔧 Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment
    pause
    exit /b 1
)

echo 📦 Installing/updating dependencies...
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🔍 Running diagnostic test...
python backend\test_setup.py
if errorlevel 1 (
    echo.
    echo ⚠️  Diagnostic test failed. Please fix the issues above.
    pause
    exit /b 1
)

echo.
echo 🌐 Starting Flask server...
echo Frontend will be available at: http://localhost:8000
echo Backend API at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start backend server
cd backend
python app.py