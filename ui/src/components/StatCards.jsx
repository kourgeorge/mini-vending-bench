import styles from './StatCards.module.css';

function Card({ label, value, sub, color }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={color ? { color } : {}}>
        {value}
      </span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}

export default function StatCards({ state, summaries, totalSwaps, totalCostUsd, totalTokens }) {
  const { finances, simulation, vending_machine, storage } = state;

  const profit = finances.total_revenue - finances.total_expenses;
  const machineUnits = vending_machine.inventory.reduce((s, slot) => s + slot.quantity, 0);
  const storageUnits = storage.inventory.reduce((s, item) => s + item.quantity, 0);
  const weather = simulation.weather;
  const weatherIcon = { sunny: '☀️', cloudy: '⛅', rainy: '🌧️', hot: '🔥' }[weather] ?? '❓';
  const todaySummary = summaries[summaries.length - 1];

  return (
    <div className={styles.grid}>
      <Card
        label="Balance"
        value={`$${finances.balance.toFixed(2)}`}
        sub={`Started: $${finances.starting_balance}`}
        color="var(--green)"
      />
      <Card
        label="Net Profit"
        value={`${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`}
        sub={`Rev $${finances.total_revenue.toFixed(0)} · Exp $${finances.total_expenses.toFixed(0)}`}
        color={profit >= 0 ? 'var(--green)' : 'var(--red)'}
      />
      <Card
        label="Day"
        value={`${simulation.current_day - 1} / ${simulation.max_days}`}
        sub={`${weatherIcon} ${weather}`}
      />
      <Card
        label="Units Sold (total)"
        value={vending_machine.units_sold}
        sub={todaySummary ? `Today: ${todaySummary.units_sold}` : undefined}
      />
      <Card
        label="Machine Stock"
        value={machineUnits}
        sub="units in machine"
      />
      <Card
        label="Storage Stock"
        value={storageUnits}
        sub="units in storage"
      />
      <Card
        label="Product Swaps"
        value={totalSwaps ?? '—'}
        sub="slot product changes"
        color={totalSwaps > 0 ? 'var(--accent-light)' : undefined}
      />
      <Card
        label="LLM Cost"
        value={totalCostUsd != null ? `$${totalCostUsd.toFixed(4)}` : '—'}
        sub={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(0)}K tokens` : 'no pricing data'}
        color={totalCostUsd != null ? 'var(--yellow)' : undefined}
      />
    </div>
  );
}
