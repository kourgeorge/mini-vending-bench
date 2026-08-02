# Mini Vending Bench — Web Dashboard

A real-time web UI for monitoring benchmark runs, comparing models, and browsing run history.

## Features

- **Leaderboard**: Ranked table of all runs by final score, with model, supervisor mode, profit, days survived, and cost
- **Run Detail**: Per-run view with daily balance/revenue/sales charts and full agent message log
- **Live Polling**: Active runs update automatically every 3 seconds
- **Benchmark Description**: System architecture diagram and simulation overview

## Structure

```
ui/
├── src/                    # React source (components, pages, hooks)
├── server.js               # Express API server (port 3001) — reads run_outputs/
├── index.html
├── vite.config.js
└── package.json (workspace)
```

## Starting the Dashboard

### Development — single terminal (recommended)

```bash
npm run ui:dev
```

Uses `concurrently` to start both the API server (port 3001) and the Vite frontend (port 5173). Open [http://localhost:5173](http://localhost:5173).

### Development — two terminals

```bash
# Terminal 1 — API server (port 3001)
npm run ui:api

# Terminal 2 — React frontend with hot reload (port 5173)
npm run ui:app
```

## Deployment

### Production server

```bash
# Build the UI and start the server in the background
./scripts/deploy.sh

# Stop the running server
./scripts/undeploy.sh
```

`deploy.sh` builds the Vite bundle, then starts `ui/server.js` in the background via `nohup`. The PID is stored in `.vending.pid` and logs go to `server.log`. The dashboard is then available at `http://<host>:3002`.

### Quick dev-mode start/stop

```bash
# Install dependencies and start API + Vite (logs to /tmp/mini-vending-bench.log)
./scripts/start.sh

# Stop start.sh processes
./scripts/stop.sh
```

## Scripts

| Script | Description |
|---|---|
| `scripts/deploy.sh` | Build UI + start production server (port 3002) |
| `scripts/undeploy.sh` | Stop production server |
| `scripts/start.sh` | Start dev server (API + Vite) |
| `scripts/stop.sh` | Stop dev server |
