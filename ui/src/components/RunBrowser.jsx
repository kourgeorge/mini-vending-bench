import { useQuery } from '@tanstack/react-query';
import styles from './RunBrowser.module.css';

function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {status === 'live' ? '● Live' : status === 'completed' ? '✓ Done' : status}
    </span>
  );
}

function formatStartedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function RunBrowser({ onSelect }) {
  const { data: runs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['runs'],
    queryFn: () => fetch('/api/runs').then(r => r.json()),
    refetchInterval: 5000,
  });

  if (isLoading) return <div className={styles.loading}>Loading runs…</div>;
  if (error) return <div className={styles.error}>Failed to load runs: {error.message}</div>;

  if (runs.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📭</div>
        <p>No simulation runs found in <code>run_outputs/</code></p>
        <p className={styles.emptyHint}>Run <code>npm start &lt;subdir&gt; none</code> to start a simulation.</p>
      </div>
    );
  }

  // Group by subdir, each group sorted by recency (API already sorts, preserve order)
  const grouped = runs.reduce((acc, run) => {
    if (!acc[run.subdir]) acc[run.subdir] = [];
    acc[run.subdir].push(run);
    return acc;
  }, {});

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Simulation Runs</h1>
        <button className={styles.refreshBtn} onClick={() => refetch()}>↺ Refresh</button>
      </div>

      {Object.entries(grouped).map(([subdir, subdirRuns]) => (
        <section key={subdir} className={styles.section}>
          <h2 className={styles.subdir}>{subdir} <span className={styles.subdirCount}>{subdirRuns.length} runs</span></h2>

          <div className={styles.tableWrapper}><div className={styles.table}>
            <div className={styles.thead}>
              <span>Started</span>
              <span>Run</span>
              <span>Status</span>
              <span>Model</span>
              <span>Day</span>
              <span className={styles.right}>Balance</span>
              <span className={styles.right}>Net Worth</span>
              <span className={styles.right}>Profit</span>
              <span className={styles.right}>Units Sold</span>
              <span className={styles.right}>LLM Cost</span>
            </div>

            {subdirRuns.map(run => (
              <button key={run.runId} className={styles.row} onClick={() => onSelect(run)}>
                <span className={styles.date}>
                  {formatStartedAt(run.startedAt)}
                  {run.status === 'live' && <span className={styles.pulse} />}
                </span>
                <span className={styles.runId}>{run.runId}</span>
                <span><StatusBadge status={run.status} /></span>
                <span className={styles.model}>{run.model ?? '—'}</span>
                <span className={styles.day}>
                  {run.currentDay != null ? `${run.completedDays} / ${run.maxDays}` : '—'}
                </span>
                <span className={`${styles.right} ${styles.green}`}>
                  {run.balance != null ? `$${run.balance.toFixed(2)}` : '—'}
                </span>
                <span className={styles.right}>
                  {run.finalScore?.netWorth != null ? `$${run.finalScore.netWorth.toFixed(2)}` : '—'}
                </span>
                <span className={`${styles.right} ${run.finalScore?.profit >= 0 ? styles.green : run.finalScore?.profit < 0 ? styles.red : ''}`}>
                  {run.finalScore?.profit != null
                    ? `${run.finalScore.profit >= 0 ? '+' : ''}$${run.finalScore.profit.toFixed(2)}`
                    : '—'}
                </span>
                <span className={styles.right}>
                  {run.finalScore?.unitsSold != null ? run.finalScore.unitsSold : '—'}
                </span>
                <span className={`${styles.right} ${styles.yellow}`}>
                  {run.finalCost?.totalCostUsd != null ? `$${run.finalCost.totalCostUsd.toFixed(4)}` : '—'}
                </span>
              </button>
            ))}
          </div></div>
        </section>
      ))}
    </div>
  );
}
