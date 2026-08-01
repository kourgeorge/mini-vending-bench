import { useState } from 'react';
import styles from './TransactionLog.module.css';

export default function TransactionLog({ transactions }) {
  const [limit, setLimit] = useState(20);

  if (!transactions || transactions.length === 0) {
    return (
      <div className={styles.root}>
        <h3 className={styles.heading}>Transactions</h3>
        <p className={styles.empty}>No transactions yet</p>
      </div>
    );
  }

  const reversed = [...transactions].reverse();
  const visible = reversed.slice(0, limit);

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Transactions ({transactions.length})</h3>
      <div className={styles.list}>
        {visible.map((tx, i) => (
          <div key={i} className={`${styles.row} ${styles[tx.type]}`}>
            <div className={styles.left}>
              <span className={styles.day}>Day {tx.day}</span>
              <span className={styles.desc}>{tx.description}</span>
            </div>
            <div className={styles.right}>
              <span className={styles.amount}>
                {tx.type === 'revenue' ? '+' : '-'}${tx.amount.toFixed(2)}
              </span>
              <span className={styles.balance}>${tx.balance_after?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      {limit < reversed.length && (
        <button className={styles.more} onClick={() => setLimit(l => l + 30)}>
          Show more ({reversed.length - limit} remaining)
        </button>
      )}
    </div>
  );
}
