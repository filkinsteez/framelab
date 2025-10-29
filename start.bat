@echo off
REM FrameLab Startup Script for Windows

echo Starting FrameLab...
echo.

REM Check if dependencies are installed
if not exist "frontend\node_modules" (
    echo Installing dependencies...
    call npm run install:all
    echo.
)

if not exist "backend\node_modules" (
    echo Installing dependencies...
    call npm run install:all
    echo.
)

REM Check if .env exists
if not exist "backend\.env" (
    echo Warning: backend\.env not found
    echo Creating .env with placeholder...
    echo FAL_KEY=your_api_key_here > backend\.env
    echo PORT=3001 >> backend\.env
    echo Please edit backend\.env with your actual FAL API key
    echo.
)

REM Start both servers
echo Starting backend and frontend...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

call npm run dev

