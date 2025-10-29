#!/bin/bash

# FrameLab Startup Script

echo "🚀 Starting FrameLab..."
echo ""

# Check if dependencies are installed
if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
    echo ""
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env not found"
    echo "Creating .env with placeholder..."
    echo "FAL_KEY=your_api_key_here" > backend/.env
    echo "PORT=3001" >> backend/.env
    echo "Please edit backend/.env with your actual FAL API key"
    echo ""
fi

# Start both servers
echo "🎨 Starting backend and frontend..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev

