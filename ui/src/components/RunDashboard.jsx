import { useQuery } from '@tanstack/react-query';
import StatCards from './StatCards.jsx';
import VendingMachineGrid from './VendingMachineGrid.jsx';
import StorageInventory from './StorageInventory.jsx';
import TransactionLog from './TransactionLog.jsx';
import AgentMessages from './AgentMessages.jsx';
import OrderHistory from './OrderHistory.jsx';
import ToolCallLog from './ToolCallLog.jsx';
import ProductAdaptation, { computeProductSwaps } from './ProductAdaptation.jsx';
import BalanceChart from './charts/BalanceChart.jsx';
import UnitsSoldChart from './charts/UnitsSoldChart.jsx';
import RevenueChart from './charts/RevenueChart.jsx';
import styles from './RunDashboard.module.css';

const POLL_INTERVAL = 3000;

function useRunData(subdir, runId, isLive) {
  const opts = { refetchInterval: isLive ? POLL_INTERVAL : false };

  const state = useQuery({
    queryKey: ['state', subdir, runId],
    queryFn: () => fetch(`/api/runs/${subdir}/${runId}/state`).then(r => r.json()),
    ...opts,
  });

  const summaries = useQuery({
    queryKey: ['summaries', subdir, runId],
    queryFn: () => fetch(`/api/runs/${subdir}/${runId}/daily_summary`).then(r => r.json()),
    ...opts,
  });

  const messages = useQuery({
    queryKey: ['messages', subdir, runId],
    queryFn: () => fetch(`/api/runs/${subdir}/${runId}/messages`).then(r => r.json()),
    ...opts,
  });

  const toolCalls = useQuery({
    queryKey: ['tool_calls', subdir, runId],
    queryFn: () => fetch(`/api/runs/${subdir}/${runId}/tool_calls`).then(r => r.json()),
    ...opts,
  });

  const costs = useQuery({
    queryKey: ['costs', subdir, runId],
    queryFn: () => fetch(`/api/runs/${subdir}/${runId}/costs`).then(r => r.json()),
    ...opts,
  });

  return { state, summaries, messages, toolCalls, costs };
}

export default function RunDashboard({ subdir, runId, status, model }) {
  const isLive = status === 'live';
  const { state, summaries, messages, toolCalls, costs } = useRunData(subdir, runId, isLive);

  if (state.isLoading) {
    return <div className={styles.loading}>Loading run data…</div>;
  }

  if (state.error || !state.data) {
    return <div className={styles.error}>Failed to load run: {state.error?.message}</div>;
  }

  const s = state.data;
  const sums = summaries.data ?? [];
  const msgs = messages.data ?? [];
  const calls = toolCalls.data ?? [];
  const costEntries = costs.data ?? [];
  const { totalSwaps } = computeProductSwaps(calls);

  const totalCostUsd = costEntries.length && costEntries.some(e => e.costUsd != null)
    ? costEntries.reduce((sum, e) => sum + (e.costUsd ?? 0), 0)
    : null;
  const totalTokens = costEntries.reduce((sum, e) => sum + (e.totalTokens ?? 0), 0);

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <div>
          <div className={styles.breadcrumb}>{subdir} / {runId}</div>
          <h2 className={styles.title}>
            Day {s.simulation.current_day - 1} of {s.simulation.max_days}
            {isLive && <span className={styles.liveBadge}>● Live</span>}
            {!isLive && <span className={styles.doneBadge}>✓ Completed</span>}
          </h2>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaItem}>📍 {s.vending_machine.location}</span>
          {model && <span className={styles.metaItem}>🤖 {model}</span>}
          <span className={styles.metaItem} style={{ color: 'var(--text-dim)', fontSize: 11 }}>{s.runId}</span>
        </div>
      </div>

      {/* Stat cards */}
      <StatCards state={s} summaries={sums} totalSwaps={totalSwaps} totalCostUsd={totalCostUsd} totalTokens={totalTokens} />

      {/* Charts row */}
      <div className={styles.chartsGrid}>
        <BalanceChart summaries={sums} startingBalance={s.finances.starting_balance} />
        <UnitsSoldChart summaries={sums} />
        <RevenueChart summaries={sums} />
      </div>

      {/* Middle row: vending machine + storage */}
      <div className={styles.inventoryRow}>
        <VendingMachineGrid
          inventory={s.vending_machine.inventory}
          rows={s.vending_machine.rows}
          slotsPerRow={s.vending_machine.slots_per_row}
        />
        <StorageInventory inventory={s.storage.inventory} />
      </div>

      {/* Orders */}
      <OrderHistory orders={s.orders} />

      {/* Bottom row: transactions + messages */}
      <div className={styles.logsRow}>
        <TransactionLog transactions={s.finances.transactions} />
        <AgentMessages messages={msgs} />
      </div>

      {/* Product adaptation */}
      <ProductAdaptation toolCalls={calls} currentDay={s.simulation.current_day} />

      {/* Tool call log */}
      <ToolCallLog toolCalls={calls} />
    </div>
  );
}
