#!/usr/bin/env bash
# Build UI and start server in background.
# Usage: ./scripts/deploy.sh
# Stop with: ./scripts/undeploy.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.vending.pid"

# Stop any running instance
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
fi
lsof -ti :3001 | xargs kill -9 2>/dev/null || true

echo "[$(date '+%H:%M:%S')] Building UI..."
cd "$ROOT/ui" && npm run build

echo "[$(date '+%H:%M:%S')] Starting server..."
cd "$ROOT"
nohup node ui/server.js > server.log 2>&1 &
echo $! > "$PID_FILE"

sleep 1
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[$(date '+%H:%M:%S')] Running on http://0.0.0.0:3001 (PID $(cat "$PID_FILE"))"
  echo "[$(date '+%H:%M:%S')] Log: server.log | Stop: ./scripts/undeploy.sh"
else
  echo "[$(date '+%H:%M:%S')] Failed to start — check server.log"
  exit 1
fi
