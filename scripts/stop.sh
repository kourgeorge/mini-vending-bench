#!/usr/bin/env bash

stopped=0

# Find and kill the Express API server (server.js on port 3001)
API_PIDS=$(lsof -ti tcp:3001 2>/dev/null)
if [ -n "$API_PIDS" ]; then
  echo "Stopping API server (port 3001) — PID(s): $API_PIDS"
  echo "$API_PIDS" | xargs kill
  stopped=$((stopped + 1))
fi

# Find and kill the Vite dev server (port 5173)
VITE_PIDS=$(lsof -ti tcp:5173 2>/dev/null)
if [ -n "$VITE_PIDS" ]; then
  echo "Stopping Vite dev server (port 5173) — PID(s): $VITE_PIDS"
  echo "$VITE_PIDS" | xargs kill
  stopped=$((stopped + 1))
fi

if [ $stopped -eq 0 ]; then
  echo "Nothing running on ports 3001 or 5173."
else
  echo "Done."
fi
