import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList, ReferenceLine,
} from 'recharts';
import styles from './Leaderboard.module.css';

const MODEL_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4',
];

function fmt(n) {
  if (n == null) return '—';
  return n.toFixed(2);
}

function pct(n) {
  if (n == null) return '—';
  return `${Math.round(n * 100)}%`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ onSelectRun, embedded = false }) {
  const [sortKey, setSortKey] = useState('avgNetWorth');
  const [expandedModel, setExpandedModel] = useState(null);

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => fetch('/api/leaderboard').then(r => r.json()),
    refetchInterval: 15000,
  });

  if (isLoading) return <div className={styles.loading}>Loading leaderboard…</div>;
  if (error) return <div className={styles.error}>Failed to load: {error.message}</div>;

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🏆</div>
        <p>No completed runs yet.</p>
        <p className={styles.emptyHint}>Finish at least one simulation to see the leaderboard.</p>
      </div>
    );
  }

  const SORT_OPTIONS = [
    { key: 'avgNetWorth', label: 'Net Worth' },
    { key: 'avgProfit', label: 'Profit' },
    { key: 'avgUnitsSold', label: 'Units Sold' },
    { key: 'avgDaysSurvived', label: 'Days Survived' },
    { key: 'avgToolCalls', label: 'Tool Calls' },
  ];

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey]);

  // Chart data: avg balance progression by day for each model
  const allDays = [...new Set(data.flatMap(m => m.avgBalanceByDay.map(d => d.day)))].sort((a, b) => a - b);
  const balanceProgressData = allDays.map(day => {
    const point = { day: `D${day}` };
    for (const model of data) {
      const entry = model.avgBalanceByDay.find(d => d.day === day);
      if (entry) point[model.model] = parseFloat(entry.balance.toFixed(2));
    }
    return point;
  });

  // Frontier scatter data: cost vs profit per model
  const frontierData = data
    .filter(m => m.avgCostUsd != null)
    .map((m, i) => ({
      model: m.model.split('/').pop(),
      fullModel: m.model,
      x: parseFloat(m.avgCostUsd.toFixed(4)),
      y: parseFloat(m.avgProfit.toFixed(2)),
      color: MODEL_COLORS[data.indexOf(m) % MODEL_COLORS.length],
    }));

  return (
    <div className={styles.root}>
      {!embedded && (
        <div className={styles.titleRow}>
          <h1 className={styles.title}>🏆 Leaderboard</h1>
          <div className={styles.titleRight}>
            <span className={styles.hint}>{data.length} models · {data.reduce((s, m) => s + m.runs, 0)} total runs</span>
            <button className={styles.refreshBtn} onClick={() => refetch()}>↺ Refresh</button>
          </div>
        </div>
      )}

      {/* Balance progression chart */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Average Balance Progression by Day</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={balanceProgressData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickFormatter={v => `$${v}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
                return (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                    {sorted.map(entry => (
                      <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: entry.color }}>
                        <span>{entry.dataKey.split('/').pop()}</span>
                        <span style={{ fontWeight: 700 }}>${entry.value?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} formatter={name => name.split('/').pop()} />
            {data.map((m, i) => (
              <Line
                key={m.model}
                type="monotone"
                dataKey={m.model}
                stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cost vs Profit frontier */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Cost vs Profit Frontier</h3>
        {frontierData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No cost data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 20, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="x"
                type="number"
                name="LLM Cost"
                scale="log"
                domain={['auto', 'auto']}
                ticks={[0.01, 0.1, 1, 10, 100]}
                tickFormatter={v => `$${v < 1 ? v.toFixed(2) : v.toFixed(0)}`}
                tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                label={{ value: 'LLM Cost (USD, log scale)', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'var(--text-dim)' }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="Profit"
                tickFormatter={v => `$${v}`}
                tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 2" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                      <div style={{ color: d.color, fontWeight: 700, marginBottom: 4 }}>{d.model}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Cost: <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>${d.x.toFixed(4)}</span></div>
                      <div style={{ color: 'var(--text-muted)' }}>Profit: <span style={{ color: d.y >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.y >= 0 ? '+' : ''}${d.y.toFixed(2)}</span></div>
                    </div>
                  );
                }}
              />
              {frontierData.map(d => (
                <Scatter key={d.fullModel} data={[d]} fill={d.color}>
                  <LabelList dataKey="model" position="top" style={{ fontSize: 10, fill: d.color }} />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rank table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.chartTitle}>Rankings</h3>
          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Sort by:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`${styles.sortBtn} ${sortKey === opt.key ? styles.sortActive : ''}`}
                onClick={() => setSortKey(opt.key)}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span className={styles.colRank}>#</span>
            <span className={styles.colModel}>Model</span>
            <span className={styles.colNum}>Runs</span>
            <span className={styles.colNum}>Net Worth</span>
            <span className={styles.colNum}>Profit</span>
            <span className={styles.colNum}>Sold Units</span>
            <span className={styles.colNum}>Operating Days</span>
            <span className={styles.colNum}>#Tool<br/>Calls</span>
            <span className={styles.colNum}>LLM Cost</span>
          </div>

          {sorted.map((entry, i) => {
            const color = MODEL_COLORS[data.indexOf(entry) % MODEL_COLORS.length];
            const isExpanded = expandedModel === entry.model;
            return (
              <div key={entry.model}>
                <div
                  className={`${styles.tableRow} ${isExpanded ? styles.tableRowExpanded : ''}`}
                  onClick={() => setExpandedModel(isExpanded ? null : entry.model)}
                >
                  <span className={styles.colRank}>
                    {MEDALS[i] ?? <span className={styles.rankNum}>{i + 1}</span>}
                  </span>
                  <span className={styles.colModel}>
                    <span className={styles.modelDot} style={{ background: color }} />
                    <span className={styles.modelName}>{entry.model}</span>
                  </span>
                  <span className={styles.colNum}>{entry.runs}</span>
                  <span className={`${styles.colNum} ${styles.highlight}`}>${fmt(entry.avgNetWorth)}</span>
                  <span className={`${styles.colNum} ${entry.avgProfit >= 0 ? styles.green : styles.red}`}>
                    {entry.avgProfit >= 0 ? '+' : ''}${fmt(entry.avgProfit)}
                  </span>
                  <span className={styles.colNum}>{Math.round(entry.avgUnitsSold)}</span>
                  <span className={styles.colNum}>{fmt(entry.avgDaysSurvived)}</span>
                  <span className={styles.colNum}>{Math.round(entry.avgToolCalls ?? 0)}</span>
                  <span className={`${styles.colNum} ${styles.yellow}`}>
                    {entry.avgCostUsd != null ? `$${entry.avgCostUsd.toFixed(4)}` : '—'}
                  </span>
                </div>

                {isExpanded && entry.runDetails.map(run => (
                  <div
                    key={run.runId}
                    className={`${styles.tableRow} ${styles.subRow}`}
                    onClick={e => { e.stopPropagation(); onSelectRun({ subdir: run.subdir, runId: run.runId, status: 'completed' }); }}
                  >
                    <span />
                    <span className={styles.colModel}>
                      <span className={styles.subRowIndent}>↳</span>
                      <span className={styles.runId}>{run.startedAt ? new Date(run.startedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : run.runId}</span>
                    </span>
                    <span className={styles.colNum}>1</span>
                    <span className={`${styles.colNum} ${styles.highlight}`}>${run.netWorth?.toFixed(2)}</span>
                    <span className={`${styles.colNum} ${run.profit >= 0 ? styles.green : styles.red}`}>
                      {run.profit >= 0 ? '+' : ''}${run.profit?.toFixed(2)}
                    </span>
                    <span className={styles.colNum}>{run.unitsSold}</span>
                    <span className={styles.colNum}>{run.daysSurvived}</span>
                    <span className={styles.colNum}>{run.toolCallCount ?? '—'}</span>
                    <span className={`${styles.colNum} ${styles.yellow}`}>
                      {run.totalCostUsd != null ? `$${run.totalCostUsd.toFixed(4)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
