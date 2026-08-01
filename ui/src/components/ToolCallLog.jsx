import { useState } from 'react';
import styles from './ToolCallLog.module.css';

const TOOL_COLORS = {
  view_vending_machine: '#6366f1',
  restock_machine: '#22c55e',
  set_price: '#f59e0b',
  empty_slot: '#ef4444',
  get_storage_inventory: '#8b5cf6',
  check_deliveries: '#06b6d4',
  place_order: '#f97316',
  send_email: '#ec4899',
  read_email: '#a78bfa',
  view_inbox: '#a78bfa',
  get_balance: '#22c55e',
  view_transactions: '#64748b',
  get_current_date: '#64748b',
  get_available_products: '#64748b',
  search_suppliers: '#3b82f6',
};

function ToolBadge({ name }) {
  const color = TOOL_COLORS[name] ?? '#94a3b8';
  return (
    <span className={styles.badge} style={{ background: `${color}22`, color }}>
      {name.replace(/_/g, '_\u200b')}
    </span>
  );
}

function StatusDot({ result }) {
  const isError = result?.error || result?.success === false;
  return <span className={isError ? styles.dotError : styles.dotOk} />;
}

export default function ToolCallLog({ toolCalls }) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [limit, setLimit] = useState(30);

  if (!toolCalls || toolCalls.length === 0) {
    return (
      <div className={styles.root}>
        <h3 className={styles.heading}>Tool Calls</h3>
        <p className={styles.empty}>No tool calls logged yet</p>
      </div>
    );
  }

  const reversed = [...toolCalls].reverse();
  const filtered = filter
    ? reversed.filter(c => c.tool.includes(filter))
    : reversed;
  const visible = filtered.slice(0, limit);

  const toolNames = [...new Set(toolCalls.map(c => c.tool))].sort();

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>Tool Calls ({toolCalls.length})</h3>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={e => { setFilter(e.target.value); setLimit(30); }}
        >
          <option value="">All tools</option>
          {toolNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className={styles.list}>
        {visible.map((call, i) => {
          const key = call.timestamp;
          const isOpen = expanded === key;
          const hasArgs = call.args && Object.keys(call.args).length > 0;

          return (
            <div key={key} className={styles.row}>
              <div className={styles.rowHeader} onClick={() => setExpanded(isOpen ? null : key)}>
                <div className={styles.rowLeft}>
                  <StatusDot result={call.result} />
                  <span className={styles.day}>D{call.day}</span>
                  <ToolBadge name={call.tool} />
                  {hasArgs && (
                    <span className={styles.argsPreview}>
                      {Object.entries(call.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')}
                    </span>
                  )}
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.duration}>{call.duration_ms}ms</span>
                  <span className={styles.toggle}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className={styles.detail}>
                  {hasArgs && (
                    <div className={styles.section}>
                      <span className={styles.sectionLabel}>Args</span>
                      <pre className={styles.pre}>{JSON.stringify(call.args, null, 2)}</pre>
                    </div>
                  )}
                  <div className={styles.section}>
                    <span className={styles.sectionLabel}>Result</span>
                    <pre className={styles.pre}>{JSON.stringify(call.result, null, 2)}</pre>
                  </div>
                  <div className={styles.section}>
                    <span className={styles.sectionLabel}>Time</span>
                    <span className={styles.timeText}>{new Date(call.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {limit < filtered.length && (
        <button className={styles.more} onClick={() => setLimit(l => l + 50)}>
          Show more ({filtered.length - limit} remaining)
        </button>
      )}
    </div>
  );
}
