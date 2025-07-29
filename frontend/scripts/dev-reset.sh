#!/bin/bash

# Frontend Dev Reset Script
# Clears all caches, kills processes, and optionally starts dev server

set -e

echo "🧹 Cleaning up frontend development environment..."

# Kill all Next.js/npm dev processes
echo "Killing dev processes..."
pkill -f "next-server\|npm.*dev\|node.*dev" 2>/dev/null || echo "No dev processes running"

# Kill processes on ports 3000/3001
echo "Freeing ports 3000 and 3001..."
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || echo "Ports already free"

# Clean Next.js and npm caches
echo "Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo 2>/dev/null || true

# Optional: Clean node_modules completely (uncomment if needed)
# echo "Removing node_modules..."
rm -rf node_modules

# Reinstall dependencies (only if node_modules was removed)
# echo "Installing dependencies..."
npm install

echo "✅ Environment cleaned!"

# Ask if user wants to start dev server
read -p "Start dev server? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting dev server..."
    npm run dev
fi
