#!/bin/bash

# Brief Bank Tool - Start Script
# This script starts both the backend and frontend servers

set -e

echo "==================================="
echo "  Brief Bank Tool - Starting..."
echo "==================================="

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo ""
    echo "WARNING: ANTHROPIC_API_KEY is not set!"
    echo "Draft generation will not work without it."
    echo ""
    echo "Set it with: export ANTHROPIC_API_KEY='your-key-here'"
    echo ""
fi

# Navigate to project root
cd "$(dirname "$0")"

# Start backend in background
echo ""
echo "[1/2] Starting backend server..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install -q -r requirements.txt

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# Give backend a moment to start
sleep 2

# Start frontend
echo ""
echo "[2/2] Starting frontend server..."
cd frontend

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "==================================="
echo "  Brief Bank Tool is running!"
echo "==================================="
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes and handle Ctrl+C
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
