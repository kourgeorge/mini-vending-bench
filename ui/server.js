import express from 'express';
import cors from 'cors';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUN_OUTPUTS_DIR = resolve(__dirname, '../run_outputs');

const app = express();
app.use(cors());
app.use(express.json());

function readJSONL(filepath) {
  if (!existsSync(filepath)) return [];
  const content = readFileSync(filepath, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function readJSON(filepath) {
  if (!existsSync(filepath)) return null;
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

/**
 * Compute product swaps from tool calls
 */
function computeProductSwaps(toolCalls) {
  const slotHistory = {};
  const slotCurrent = {};

  for (const call of toolCalls) {
    if (call.tool === 'restock_machine' && call.result?.success) {
      const { row, column, product } = call.args;
      const key = `${row}-${column}`;
      const prev = slotCurrent[key];
      
      if (prev !== product) {
        if (!slotHistory[key]) slotHistory[key] = [];
        slotHistory[key].push({ day: call.day, product });
        slotCurrent[key] = product;
      }
    }

    if (call.tool === 'empty_slot' && call.result?.success) {
      const { row, column } = call.args;
      delete slotCurrent[`${row}-${column}`];
    }
  }

  return Object.values(slotHistory).reduce(
    (sum, hist) => sum + Math.max(0, hist.length - 1),
    0
  );
}

/**
 * Compute unsold units from state (machine + storage)
 */
function computeUnsoldUnits(state) {
  if (!state) return 0;
  
  let total = 0;
  
  // Count units in vending machine
  if (state.vending_machine?.inventory) {
    total += state.vending_machine.inventory.reduce((sum, slot) => sum + (slot.quantity || 0), 0);
  }
  
  // Count units in storage
  if (state.storage?.inventory) {
    total += state.storage.inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }
  
  return total;
}

function getRunStatus(runDir) {
  const hasFinalScore = existsSync(join(runDir, 'final_score.json'));
  if (hasFinalScore) return 'completed';
  const state = readJSON(join(runDir, 'state.json'));
  if (!state) return 'unknown';
  const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
  const completedDays = summaries.length;
  const currentDay = state.simulation?.current_day ?? 1;
  if (completedDays < currentDay - 1 || currentDay <= state.simulation?.max_days) {
    return 'live';
  }
  return 'completed';
}


/**
 * Generate balance chart data from daily summaries
 */
function generateBalanceChartData(summaries) {
  const days = summaries.map(s => s.day);
  const balances = summaries.map(s => s.balance);

  return {
    title: 'Bank Balance Over Time',
    type: 'line',
    xAxis: {
      label: 'Day',
      data: days,
    },
    yAxis: {
      label: 'Balance ($)',
    },
    series: [
      {
        name: 'Bank Balance',
        data: balances,
      },
    ],
  };
}

/**
 * Generate units sold chart data from daily summaries
 */
function generateUnitsSoldChartData(summaries) {
  const days = summaries.map(s => s.day);
  const units = summaries.map(s => s.units_sold || 0);

  return {
    title: 'Daily Units Sold',
    type: 'bar',
    xAxis: {
      label: 'Day',
      data: days,
    },
    yAxis: {
      label: 'Units Sold',
    },
    series: [
      {
        name: 'Units Sold',
        data: units,
      },
    ],
  };
}

/**
 * Generate revenue chart data from daily summaries
 */
function generateRevenueChartData(summaries) {
  const days = summaries.map(s => s.day);
  const revenue = summaries.map(s => s.revenue || 0);

  // Calculate cumulative values
  let cumulativeRevenue = 0;
  const cumulativeRevenueData = revenue.map(r => {
    cumulativeRevenue += r;
    return cumulativeRevenue;
  });

  return {
    title: 'Revenue Over Time',
    type: 'line',
    xAxis: {
      label: 'Day',
      data: days,
    },
    yAxis: {
      label: 'Revenue ($)',
    },
    series: [
      {
        name: 'Cumulative Revenue',
        data: cumulativeRevenueData,
      },
      {
        name: 'Daily Revenue',
        data: revenue,
      },
    ],
  };
}


// GET /api/runs — list all runs across all subdirectories
app.get('/api/runs', (req, res) => {
  if (!existsSync(RUN_OUTPUTS_DIR)) return res.json([]);

  const result = [];
  const subdirs = readdirSync(RUN_OUTPUTS_DIR).filter(name => {
    return statSync(join(RUN_OUTPUTS_DIR, name)).isDirectory();
  });

  for (const subdir of subdirs) {
    const subdirPath = join(RUN_OUTPUTS_DIR, subdir);
    const runIds = readdirSync(subdirPath).filter(name => {
      return statSync(join(subdirPath, name)).isDirectory();
    });

    for (const runId of runIds) {
      const runDir = join(subdirPath, runId);
      const state = readJSON(join(runDir, 'state.json'));
      const finalScore = readJSON(join(runDir, 'final_score.json'));
      const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
      const status = getRunStatus(runDir);

      const tsMatch = runId.match(/run_(\d+)/);
      const startedAt = tsMatch ? new Date(parseInt(tsMatch[1])).toISOString() : null;

      let finalCost = readJSON(join(runDir, 'final_cost.json'));
      if (!finalCost) {
        // For live runs, compute running totals from costs.jsonl
        const costEntries = readJSONL(join(runDir, 'costs.jsonl'));
        if (costEntries.length > 0) {
          const totalCostUsd = costEntries.some(e => e.costUsd != null)
            ? costEntries.reduce((s, e) => s + (e.costUsd ?? 0), 0)
            : null;
          const totalTokens = costEntries.reduce((s, e) => s + (e.totalTokens ?? 0), 0);
          finalCost = { totalCostUsd, totalTokens };
        }
      }

      result.push({
        subdir,
        runId,
        status,
        startedAt,
        currentDay: state?.simulation?.current_day ?? null,
        maxDays: state?.simulation?.max_days ?? null,
        balance: state?.finances?.balance ?? null,
        model: readJSON(join(runDir, 'config.json'))?.agent?.model ?? null,
        finalScore: finalScore ?? null,
        finalCost: finalCost ?? null,
        completedDays: summaries.length,
      });
    }
  }

  // Sort: live first, then by start time descending (newest first)
  result.sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return (b.startedAt ?? '').localeCompare(a.startedAt ?? '');
  });

  res.json(result);
});

// GET /api/runs/:subdir/:runId/state — full state.json
app.get('/api/runs/:subdir/:runId/state', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const state = readJSON(join(runDir, 'state.json'));
  if (!state) return res.status(404).json({ error: 'State not found' });
  res.json(state);
});

// GET /api/runs/:subdir/:runId/daily_summary — daily_summary.jsonl as array
app.get('/api/runs/:subdir/:runId/daily_summary', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
  res.json(summaries);
});

// GET /api/runs/:subdir/:runId/messages — messages.jsonl as array
app.get('/api/runs/:subdir/:runId/messages', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const messages = readJSONL(join(runDir, 'messages.jsonl'));
  res.json(messages);
});

// GET /api/runs/:subdir/:runId/config — config.json
app.get('/api/runs/:subdir/:runId/config', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const config = readJSON(join(runDir, 'config.json'));
  if (!config) return res.status(404).json({ error: 'Config not found' });
  res.json(config);
});

// GET /api/runs/:subdir/:runId/costs — costs.jsonl as array
app.get('/api/runs/:subdir/:runId/costs', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  res.json(readJSONL(join(runDir, 'costs.jsonl')));
});

// GET /api/runs/:subdir/:runId/tool_calls — tool_calls.jsonl as array
app.get('/api/runs/:subdir/:runId/tool_calls', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const calls = readJSONL(join(runDir, 'tool_calls.jsonl'));
  res.json(calls);
});


// GET /api/runs/:subdir/:runId/balance_chart — compute balance chart data
app.get('/api/runs/:subdir/:runId/balance_chart', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
  if (summaries.length === 0) return res.json(null);
  res.json(generateBalanceChartData(summaries));
});

// GET /api/runs/:subdir/:runId/units_sold_chart — compute units sold chart data
app.get('/api/runs/:subdir/:runId/units_sold_chart', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
  if (summaries.length === 0) return res.json(null);
  res.json(generateUnitsSoldChartData(summaries));
});

// GET /api/runs/:subdir/:runId/revenue_chart — compute revenue chart data
app.get('/api/runs/:subdir/:runId/revenue_chart', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
  if (summaries.length === 0) return res.json(null);
  res.json(generateRevenueChartData(summaries));
});


// GET /api/leaderboard — aggregate completed runs by model
app.get('/api/leaderboard', (req, res) => {
  if (!existsSync(RUN_OUTPUTS_DIR)) return res.json([]);

  const byModel = {};

  const subdirs = readdirSync(RUN_OUTPUTS_DIR).filter(name =>
    statSync(join(RUN_OUTPUTS_DIR, name)).isDirectory()
  );

  for (const subdir of subdirs) {
    const subdirPath = join(RUN_OUTPUTS_DIR, subdir);
    const runIds = readdirSync(subdirPath).filter(name =>
      statSync(join(subdirPath, name)).isDirectory()
    );

    for (const runId of runIds) {
      const runDir = join(subdirPath, runId);
      const finalScore = readJSON(join(runDir, 'final_score.json'));
      if (!finalScore) continue; // skip incomplete runs

      const model = readJSON(join(runDir, 'config.json'))?.agent?.model ?? 'unknown';
      const summaries = readJSONL(join(runDir, 'daily_summary.jsonl'));
      const finalCost = readJSON(join(runDir, 'final_cost.json'));
      const tsMatch = runId.match(/run_(\d+)/);
      const startedAt = tsMatch ? new Date(parseInt(tsMatch[1])).toISOString() : null;

      const toolCalls = readJSONL(join(runDir, 'tool_calls.jsonl'));
      const toolCallCount = toolCalls.length;

      // Compute product swaps from tool calls
      const productSwaps = computeProductSwaps(toolCalls);

      // Compute unsold units from final state
      const state = readJSON(join(runDir, 'state.json'));
      const unsoldUnits = computeUnsoldUnits(state);

      if (!byModel[model]) byModel[model] = [];
      byModel[model].push({
        subdir,
        runId,
        startedAt,
        ...finalScore,
        totalCostUsd: finalCost?.totalCostUsd ?? null,
        totalTokens: finalCost?.totalTokens ?? null,
        toolCallCount,
        productSwaps,
        unsoldUnits,
        dailySummaries: summaries,
      });
    }
  }

  const leaderboard = Object.entries(byModel).map(([model, runs]) => {
    const avg = key => runs.reduce((s, r) => s + (r[key] ?? 0), 0) / runs.length;

    // Build per-day average balance and profit across runs
    const maxDay = Math.max(...runs.map(r => r.dailySummaries.length));
    const avgBalanceByDay = Array.from({ length: maxDay }, (_, i) => {
      const dayNum = i + 1;
      const values = runs.map(r => r.dailySummaries.find(d => d.day === dayNum)?.balance).filter(v => v != null);
      return values.length ? { day: dayNum, balance: values.reduce((a, b) => a + b, 0) / values.length } : null;
    }).filter(Boolean);

    const avgProfitByDay = Array.from({ length: maxDay }, (_, i) => {
      const dayNum = i + 1;
      const values = runs.map(r => r.dailySummaries.find(d => d.day === dayNum)?.profit).filter(v => v != null);
      return values.length ? { day: dayNum, profit: values.reduce((a, b) => a + b, 0) / values.length } : null;
    }).filter(Boolean);

    const avgNetWorthByDay = Array.from({ length: maxDay }, (_, i) => {
      const dayNum = i + 1;
      const values = runs.map(r => r.dailySummaries.find(d => d.day === dayNum)?.netWorth).filter(v => v != null);
      return values.length ? { day: dayNum, netWorth: values.reduce((a, b) => a + b, 0) / values.length } : null;
    }).filter(Boolean);

    const completedFull = runs.filter(r => r.daysSurvived >= (r.durationDays ?? 30)).length;

    const costRuns = runs.filter(r => r.totalCostUsd != null);

    return {
      model,
      runs: runs.length,
      avgNetWorth: avg('netWorth'),
      avgProfit: avg('profit'),
      avgUnitsSold: avg('unitsSold'),
      avgDaysSurvived: avg('daysSurvived'),
      avgToolCalls: avg('toolCallCount'),
      avgProductSwaps: avg('productSwaps'),
      avgUnsoldUnits: avg('unsoldUnits'),
      successRate: completedFull / runs.length,
      bestBalance: Math.max(...runs.map(r => r.balance)),
      worstBalance: Math.min(...runs.map(r => r.balance)),
      avgCostUsd: costRuns.length ? costRuns.reduce((s, r) => s + r.totalCostUsd, 0) / costRuns.length : null,
      avgTokens: costRuns.length ? Math.round(costRuns.reduce((s, r) => s + (r.totalTokens ?? 0), 0) / costRuns.length) : null,
      avgBalanceByDay,
      avgProfitByDay,
      avgNetWorthByDay,
      runDetails: runs.map(({ dailySummaries: _, ...r }) => r),
    };
  });

  // Sort by average net worth descending
  leaderboard.sort((a, b) => b.avgNetWorth - a.avgNetWorth);

  res.json(leaderboard);
});

// GET /api/runs/:subdir/:runId/download — ZIP of all run output files + README.md
app.get('/api/runs/:subdir/:runId/download', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);

  if (!existsSync(runDir)) return res.status(404).json({ error: 'Run not found' });

  const state = readJSON(join(runDir, 'state.json'));
  const config = readJSON(join(runDir, 'config.json'));
  const finalScore = readJSON(join(runDir, 'final_score.json'));
  const status = getRunStatus(runDir);
  const tsMatch = runId.match(/run_(\d+)/);
  const startedAt = tsMatch ? new Date(parseInt(tsMatch[1])).toISOString() : 'unknown';

  const readmeContent = `# Mini Vending Bench — Run Export

**Run ID:** ${runId}
**Group:** ${subdir}
**Started:** ${startedAt}
**Status:** ${status}
**Model:** ${config?.agent?.model ?? 'unknown'}
**Days:** ${state?.simulation?.current_day != null ? state.simulation.current_day - 1 : '?'} / ${state?.simulation?.max_days ?? '?'}
${finalScore ? `**Final Balance:** $${finalScore.balance?.toFixed(2)}
**Net Worth:** $${finalScore.netWorth?.toFixed(2)}
**Profit:** $${finalScore.profit?.toFixed(2)}
**Units Sold:** ${finalScore.unitsSold}` : ''}

---

## Files in this export

### \`state.json\`
The complete simulation state at the end of the run (or at the last recorded point for live runs).
Contains:
- \`simulation\` — current day, max days, weather
- \`finances\` — balance, starting balance, total revenue/expenses, full transaction history
- \`vending_machine\` — slot inventory, location, units sold counter
- \`storage\` — items held in back-stock
- \`orders\` — pending and completed supplier orders
- \`emails\` — agent inbox (supplier communications, system messages)

### \`config.json\`
The configuration used to start this run.
Contains:
- \`agent\` — model name and API settings
- \`simulation\` — duration (days), starting balance, daily fee, bankruptcy threshold, random seed
- \`supplier\` — supplier agent model settings
- \`features\` — feature flags (adversarial suppliers, negotiation, supply chain issues)
- \`supervisor\` — supervisor mode (\`none\` | \`static\` | \`mcp\` | \`minimal\`) and guidelines

### \`daily_summary.jsonl\`
One JSON object per line, one entry per completed simulation day.
Each entry contains:
- \`day\` — day number (1-based)
- \`timestamp\` — ISO timestamp when the day was recorded
- \`balance\` — cash balance at end of day
- \`units_sold\` — units sold that day
- \`revenue\` — revenue earned that day
- \`deliveries_received\` — number of supplier deliveries that arrived
- \`weather\` — weather condition for the day (affects foot traffic)
- \`inventory_count\` — total units across machine and storage

### \`messages.jsonl\`
One JSON object per line — the agent's narrative log.
Each entry contains:
- \`timestamp\` — ISO timestamp
- \`role\` — always \`"agent"\`
- \`content\` — the agent's written summary/reasoning for that day
- \`day\` — simulation day number

### \`tool_calls.jsonl\`
One JSON object per line — every tool invocation the agent made.
Each entry contains:
- \`tool\` — tool name (e.g., \`check_inventory\`, \`place_order\`, \`restock_machine\`)
- \`input\` — parameters passed to the tool
- \`output\` — result returned by the tool
- \`day\` — simulation day number

### \`costs.jsonl\`
One JSON object per line — LLM cost data for each API call.
Each entry contains:
- \`costUsd\` — cost in USD for that call (may be null if pricing unavailable)
- \`totalTokens\` — total tokens used
- \`inputTokens\` — prompt/input tokens
- \`outputTokens\` — completion/output tokens

### \`final_score.json\`
Present only on completed runs. Contains the final performance metrics:
- \`balance\` — ending cash balance
- \`netWorth\` — balance + value of remaining inventory
- \`profit\` — net worth minus starting balance
- \`totalRevenue\` — sum of all sales revenue
- \`totalExpenses\` — sum of all costs (product purchases, daily fees)
- \`unitsSold\` — total units sold across all days
- \`daysSurvived\` — number of days the agent operated without going bankrupt
- \`startingBalance\` — the initial cash balance
- \`generated_at\` — ISO timestamp when the score was computed

### \`final_cost.json\`
Present on completed runs. Aggregate LLM cost summary:
- \`model\` — the LLM model used
- \`totalInputTokens\` — total input/prompt tokens
- \`totalOutputTokens\` — total output/completion tokens
- \`totalTokens\` — total tokens consumed
- \`totalCostUsd\` — total USD spent on LLM API calls (null if pricing unavailable)
- \`days\` — number of days tracked
- \`generated_at\` — ISO timestamp when computed

---

## Simulation Overview

The Mini Vending Bench is a benchmark where an AI agent manages a vending machine business
over a simulated period (typically 30 days). The agent starts with a fixed cash balance and must:

1. Stock products in the vending machine slots
2. Monitor inventory and sales
3. Place supplier orders before running out of stock
4. Manage cash flow to avoid bankruptcy (balance dropping below threshold)
5. Adapt product selection based on sales performance and weather conditions

The agent is scored on final **net worth** (cash + inventory value) relative to its starting balance.
`;

  const filename = `${subdir}_${runId}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', err => { throw err; });
  archive.pipe(res);

  // Add README.md
  archive.append(readmeContent, { name: 'README.md' });

  // Add all files from the run directory
  const knownFiles = [
    'state.json', 'config.json', 'final_score.json', 'final_cost.json',
    'daily_summary.jsonl', 'messages.jsonl', 'tool_calls.jsonl', 'costs.jsonl',
  ];
  for (const file of knownFiles) {
    const filePath = join(runDir, file);
    if (existsSync(filePath)) archive.file(filePath, { name: file });
  }

  archive.finalize();
});

// GET /api/runs/:subdir/:runId/final_score — final_score.json
app.get('/api/runs/:subdir/:runId/final_score', (req, res) => {
  const { subdir, runId } = req.params;
  const runDir = join(RUN_OUTPUTS_DIR, subdir, runId);
  const score = readJSON(join(runDir, 'final_score.json'));
  if (!score) return res.status(404).json({ error: 'Final score not found' });
  res.json(score);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log(`Reading run outputs from: ${RUN_OUTPUTS_DIR}`);
});
