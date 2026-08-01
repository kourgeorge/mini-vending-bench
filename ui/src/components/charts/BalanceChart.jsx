import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import styles from './Chart.module.css';

export default function BalanceChart({ summaries, startingBalance }) {
  if (!summaries || summaries.length === 0) return null;

  const data = summaries.map(s => ({
    day: `D${s.day}`,
    balance: parseFloat(s.balance.toFixed(2)),
  }));

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Balance Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={v => [`$${v}`, 'Balance']}
          />
          {startingBalance && (
            <ReferenceLine y={startingBalance} stroke="var(--text-dim)" strokeDasharray="4 4" label={{ value: 'Start', fill: 'var(--text-dim)', fontSize: 10 }} />
          )}
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--green)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--green)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
