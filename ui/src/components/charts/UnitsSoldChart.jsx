import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import styles from './Chart.module.css';

const WEATHER_COLORS = {
  sunny: '#f59e0b',
  hot: '#ef4444',
  cloudy: '#94a3b8',
  rainy: '#3b82f6',
};

export default function UnitsSoldChart({ summaries }) {
  if (!summaries || summaries.length === 0) return null;

  const data = summaries.map(s => ({
    day: `D${s.day}`,
    units: s.units_sold || 0,
    weather: s.weather,
  }));

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Daily Units Sold</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
          <Tooltip
            contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={(v, _n, props) => [v, `Units (${props.payload.weather})`]}
          />
          <Bar dataKey="units" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={WEATHER_COLORS[entry.weather] ?? 'var(--accent)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        {Object.entries(WEATHER_COLORS).map(([w, c]) => (
          <span key={w} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: c }} />
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
