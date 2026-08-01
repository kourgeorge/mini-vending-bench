import { useState } from 'react';
import styles from './AgentMessages.module.css';

export default function AgentMessages({ messages }) {
  const [expanded, setExpanded] = useState(null);
  const [limit, setLimit] = useState(5);

  if (!messages || messages.length === 0) {
    return (
      <div className={styles.root}>
        <h3 className={styles.heading}>Agent Messages</h3>
        <p className={styles.empty}>No messages yet</p>
      </div>
    );
  }

  const reversed = [...messages].reverse();
  const visible = reversed.slice(0, limit);

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Agent Log ({messages.length})</h3>
      <div className={styles.list}>
        {visible.map((msg, i) => {
          const key = msg.timestamp ?? `${msg.day}-${i}`;
          const isOpen = expanded === key;
          const preview = msg.content?.slice(0, 120) + (msg.content?.length > 120 ? '…' : '');
          return (
            <div key={key} className={styles.message}>
              <div
                className={styles.header}
                onClick={() => setExpanded(isOpen ? null : key)}
              >
                <div className={styles.meta}>
                  <span className={styles.day}>Day {msg.day}</span>
                  <span className={`${styles.role} ${styles[msg.role]}`}>{msg.role}</span>
                  <span className={styles.time}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
                <span className={styles.toggle}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen ? (
                <div className={styles.body}>{msg.content}</div>
              ) : (
                <div className={styles.preview}>{preview}</div>
              )}
            </div>
          );
        })}
      </div>
      {limit < reversed.length && (
        <button className={styles.more} onClick={() => setLimit(l => l + 10)}>
          Show more ({reversed.length - limit} remaining)
        </button>
      )}
    </div>
  );
}
