import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import styles from './Chart.module.css';

export default function RevenueChart({ summaries }) {
  if (!summaries || summaries.length === 0) return null;

  let cumRevenue = 0;
  const data = summaries.map(s => {
    cumRevenue += s.revenue || 0;
    return {
      day: `D${s.day}`,
      daily: parseFloat((s.revenue || 0).toFixed(2)),
      cumulative: parseFloat(cumRevenue.toFixed(2)),
    };
  });

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Revenue</h3>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={v => `$${v}`}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
          <Bar dataKey="daily" name="Daily" fill="rgba(99,102,241,0.5)" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="var(--accent-light)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
