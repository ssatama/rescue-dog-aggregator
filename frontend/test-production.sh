#!/bin/bash

echo "🔨 Building production bundle..."
npm run build

echo "🚀 Starting production server on http://localhost:3000"
echo "📝 This simulates Vercel's production environment"
echo "🔍 Check console for service worker errors"
echo ""
echo "Press Ctrl+C to stop"

# Start production server
npm run start