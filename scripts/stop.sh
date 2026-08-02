#!/usr/bin/env bash

PID_FILE=/tmp/mini-vending-bench.pid

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found at $PID_FILE — nothing to stop."
  exit 0
fi

PID=$(cat "$PID_FILE")

echo "Stopping Mini Vending Bench..."

# Kill the npm process if still running
kill "$PID" 2>/dev/null

# Kill processes holding the known ports (node API + vite)
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

rm "$PID_FILE"
echo "Done."
