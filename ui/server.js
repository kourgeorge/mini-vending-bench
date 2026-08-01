import express from 'express';
import cors from 'cors';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

      const toolCallCount = readJSONL(join(runDir, 'tool_calls.jsonl')).length;

      if (!byModel[model]) byModel[model] = [];
      byModel[model].push({
        subdir,
        runId,
        startedAt,
        ...finalScore,
        totalCostUsd: finalCost?.totalCostUsd ?? null,
        totalTokens: finalCost?.totalTokens ?? null,
        toolCallCount,
        dailySummaries: summaries,
      });
    }
  }

  const leaderboard = Object.entries(byModel).map(([model, runs]) => {
    const avg = key => runs.reduce((s, r) => s + (r[key] ?? 0), 0) / runs.length;

    // Build per-day average balance across runs
    const maxDay = Math.max(...runs.map(r => r.dailySummaries.length));
    const avgBalanceByDay = Array.from({ length: maxDay }, (_, i) => {
      const dayNum = i + 1;
      const values = runs.map(r => r.dailySummaries.find(d => d.day === dayNum)?.balance).filter(v => v != null);
      return values.length ? { day: dayNum, balance: values.reduce((a, b) => a + b, 0) / values.length } : null;
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
      successRate: completedFull / runs.length,
      bestBalance: Math.max(...runs.map(r => r.balance)),
      worstBalance: Math.min(...runs.map(r => r.balance)),
      avgCostUsd: costRuns.length ? costRuns.reduce((s, r) => s + r.totalCostUsd, 0) / costRuns.length : null,
      avgTokens: costRuns.length ? Math.round(costRuns.reduce((s, r) => s + (r.totalTokens ?? 0), 0) / costRuns.length) : null,
      avgBalanceByDay,
      runDetails: runs.map(({ dailySummaries: _, ...r }) => r),
    };
  });

  // Sort by average net worth descending
  leaderboard.sort((a, b) => b.avgNetWorth - a.avgNetWorth);

  res.json(leaderboard);
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
