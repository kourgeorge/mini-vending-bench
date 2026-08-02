#!/usr/bin/env bash
# Stop the running server.
# Usage: ./scripts/undeploy.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.vending.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No .vending.pid found — nothing to stop."
  exit 0
fi

kill "$(cat "$PID_FILE")" 2>/dev/null && echo "Stopped." || echo "Process already gone."
rm -f "$PID_FILE"
lsof -ti :3002 | xargs kill -9 2>/dev/null || true
