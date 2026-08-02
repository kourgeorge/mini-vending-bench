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

cd "$ROOT" && setsid npm run ui:dev > /tmp/mini-vending-bench.log 2>&1 &
echo $! > /tmp/mini-vending-bench.pid
echo "Started (PID $(cat /tmp/mini-vending-bench.pid)). Logs: /tmp/mini-vending-bench.log"
