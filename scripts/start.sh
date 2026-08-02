#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Installing root dependencies..."
cd "$ROOT" && npm install --silent

echo "Installing UI dependencies..."
cd "$ROOT/ui" && npm install --silent

echo ""
echo "Starting Mini Vending Bench UI..."
echo "  API server → http://localhost:3001"
echo "  Dashboard  → http://localhost:5173"
echo ""

cd "$ROOT" && npm run ui:dev
