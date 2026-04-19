@echo off
REM Edge TTS Server Startup Script for Windows
REM This starts the local TTS server for voice samples testing

echo.
echo ============================================================
echo Starting Edge TTS Server for Voice Samples Testing
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/3] Installing Python dependencies...
pip install -r requirements-tts-server.txt

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Starting Edge TTS Server...
echo Server will run at: http://localhost:8765
echo.
echo [3/3] Press Ctrl+C to stop the server
echo ============================================================
echo.

python tts-server.py
