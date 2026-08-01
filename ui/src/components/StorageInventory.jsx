import styles from './StorageInventory.module.css';

export default function StorageInventory({ inventory }) {
  if (!inventory || inventory.length === 0) {
    return (
      <div className={styles.root}>
        <h3 className={styles.heading}>Storage</h3>
        <p className={styles.empty}>No items in storage</p>
      </div>
    );
  }

  const sorted = [...inventory].sort((a, b) => b.quantity - a.quantity);

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Storage ({inventory.length} products)</h3>
      <ul className={styles.list}>
        {sorted.map(item => (
          <li key={item.product} className={styles.item}>
            <span className={styles.name}>{item.product}</span>
            <span className={styles.qty}>{item.quantity} units</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
