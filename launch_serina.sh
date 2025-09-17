#!/bin/bash
# Launch complete Serina Evolution System
# Usage: ./launch_serina.sh [mode]
# Modes: cpp, python, mock, auto (default)

echo "🌍 SERINA - World of Birds Evolution System"
echo "============================================"

# Default mode
MODE=${1:-auto}

# Check if WAMP/MySQL is running (Windows)
if command -v tasklist &> /dev/null; then
    if ! tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" > nul; then
        echo "⚠️  MySQL not detected. Please start WAMP/XAMPP first."
        echo "   Then run: $0 $MODE"
        exit 1
    fi
fi

# Navigate to API directory
cd "$(dirname "$0")/api" || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "🚀 Starting Serina Evolution API..."
echo "   Mode: $MODE"
echo "   API: http://localhost:3001/api"
echo "   Docs: http://localhost:3001/api-docs"
echo "   Health: http://localhost:3001/health"
echo ""
echo "📊 Available endpoints:"
echo "   POST /api/simulation/start (mode: $MODE)"
echo "   POST /api/simulation/stop"
echo "   GET  /api/simulation/status"
echo "   GET  /api/simulations"
echo "   GET  /api/species/1"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start the API with simulation mode
SIMULATION_MODE="$MODE" node server.js