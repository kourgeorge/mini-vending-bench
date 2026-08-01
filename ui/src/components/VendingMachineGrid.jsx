import styles from './VendingMachineGrid.module.css';

export default function VendingMachineGrid({ inventory, rows = 4, slotsPerRow = 3 }) {
  // Build grid map: key = "row-col" → slot data
  const slotMap = {};
  for (const slot of inventory) {
    slotMap[`${slot.row}-${slot.column}`] = slot;
  }

  const grid = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= slotsPerRow; c++) {
      grid.push({ row: r, col: c, slot: slotMap[`${r}-${c}`] ?? null });
    }
  }

  function fillPercent(slot) {
    if (!slot) return 0;
    return Math.round((slot.quantity / (slot.capacity || 10)) * 100);
  }

  function fillColor(pct) {
    if (pct === 0) return 'var(--text-dim)';
    if (pct < 30) return 'var(--red)';
    if (pct < 60) return 'var(--yellow)';
    return 'var(--green)';
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Vending Machine (4×3)</h3>
      <div className={styles.grid}>
        {grid.map(({ row, col, slot }) => {
          const pct = fillPercent(slot);
          return (
            <div
              key={`${row}-${col}`}
              className={`${styles.slot} ${!slot ? styles.empty : ''}`}
              title={slot ? `${slot.product}\n${slot.quantity}/${slot.capacity || 10} units @ $${slot.price}` : 'Empty'}
            >
              <div
                className={styles.fill}
                style={{ height: `${pct}%`, background: fillColor(pct) }}
              />
              <div className={styles.content}>
                {slot ? (
                  <>
                    <span className={styles.product}>{slot.product}</span>
                    <span className={styles.qty} style={{ color: fillColor(pct) }}>
                      {slot.quantity}/{slot.capacity || 10}
                    </span>
                    <span className={styles.price}>${slot.price}</span>
                  </>
                ) : (
                  <span className={styles.emptyLabel}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
