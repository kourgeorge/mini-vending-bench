#!/usr/bin/env bash

PID_FILE=/tmp/mini-vending-bench.pid

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found at $PID_FILE — nothing to stop."
  exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping Mini Vending Bench (PID $PID and children)..."
  # Kill the entire process group to catch all child processes (node, vite, etc.)
  kill -- -"$PID" 2>/dev/null || kill "$PID"
  rm "$PID_FILE"
  echo "Done."
else
  echo "Process $PID is not running. Cleaning up stale PID file."
  rm "$PID_FILE"
fi
