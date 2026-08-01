import styles from './OrderHistory.module.css';

export default function OrderHistory({ orders }) {
  const { pending = [], completed = [] } = orders ?? {};
  const all = [
    ...pending.map(o => ({ ...o, _status: 'pending' })),
    ...completed.map(o => ({ ...o, _status: 'delivered' })),
  ].sort((a, b) => b.order_id - a.order_id);

  if (all.length === 0) {
    return (
      <div className={styles.root}>
        <h3 className={styles.heading}>Orders</h3>
        <p className={styles.empty}>No orders placed yet</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Orders ({all.length})</h3>
      <div className={styles.list}>
        {all.map(order => (
          <div key={order.order_id} className={`${styles.order} ${styles[order._status]}`}>
            <div className={styles.orderHeader}>
              <div className={styles.orderMeta}>
                <span className={styles.orderId}>#{order.order_id}</span>
                <span className={styles.supplier}>{order.supplier}</span>
              </div>
              <div className={styles.orderRight}>
                <span className={`${styles.badge} ${styles[order._status]}`}>
                  {order._status === 'pending' ? '⏳ Pending' : '✓ Delivered'}
                </span>
                <span className={styles.cost}>${order.total_cost?.toFixed(2)}</span>
              </div>
            </div>
            <div className={styles.items}>
              {order.items?.map((item, i) => (
                <span key={i} className={styles.item}>
                  {item.product} ×{item.quantity} @ ${item.price_per_unit}
                </span>
              ))}
            </div>
            <div className={styles.dates}>
              Ordered day {order.order_day}
              {order.delivery_day ? ` · Delivers day ${order.delivery_day}` : ''}
              {order.delivered_day ? ` · Delivered day ${order.delivered_day}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
