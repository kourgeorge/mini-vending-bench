import styles from './ProductAdaptation.module.css';

/**
 * Compute per-product stats: price range and total slot×days occupied.
 * currentDay is used to estimate ongoing occupancy.
 */
export function computeProductStats(toolCalls, currentDay) {
  const stats = {}; // product -> { prices: [], slots: [{ key, startDay, endDay }] }
  const slotProduct = {}; // "R-C" -> { product, startDay }

  const ensure = p => {
    if (!stats[p]) stats[p] = { prices: [], slots: [] };
  };

  for (const call of toolCalls) {
    if (call.tool === 'restock_machine' && call.result?.success) {
      const { row, column, product } = call.args;
      const price = call.result.slot?.price ?? call.args.price ?? null;
      const key = `${row}-${column}`;
      const prev = slotProduct[key];

      // Close out previous occupancy
      if (prev && prev.product !== product) {
        ensure(prev.product);
        stats[prev.product].slots.push({ key, startDay: prev.startDay, endDay: call.day });
      }

      ensure(product);
      if (price != null) stats[product].prices.push(price);
      slotProduct[key] = { product, startDay: call.day };
    }

    if (call.tool === 'set_price' && call.result?.success) {
      const product = call.result.product;
      if (product) {
        ensure(product);
        stats[product].prices.push(call.result.new_price);
      }
    }

    if (call.tool === 'empty_slot' && call.result?.success) {
      const key = `${call.args.row}-${call.args.column}`;
      const prev = slotProduct[key];
      if (prev) {
        ensure(prev.product);
        stats[prev.product].slots.push({ key, startDay: prev.startDay, endDay: call.day });
        delete slotProduct[key];
      }
    }
  }

  // Close out still-occupied slots
  const today = currentDay ?? 1;
  for (const [key, occ] of Object.entries(slotProduct)) {
    ensure(occ.product);
    stats[occ.product].slots.push({ key, startDay: occ.startDay, endDay: today });
  }

  // Summarise
  return Object.entries(stats).map(([product, { prices, slots }]) => {
    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
    const slotDays = slots.reduce((s, { startDay, endDay }) => s + Math.max(0, endDay - startDay), 0);
    return {
      product,
      minPrice: uniquePrices.length ? uniquePrices[0] : null,
      maxPrice: uniquePrices.length ? uniquePrices[uniquePrices.length - 1] : null,
      slotDays,
      slotCount: slots.length,
    };
  }).sort((a, b) => b.slotDays - a.slotDays);
}

/**
 * Derive product swap history from tool_calls.
 * Returns { totalSwaps, bySlot: { "R-C": [{ day, product, price }] } }
 */
export function computeProductSwaps(toolCalls) {
  const slotHistory = {}; // "R-C" -> [{ day, product, price }]
  const slotCurrent = {}; // "R-C" -> current product
  const slotPrice   = {}; // "R-C" -> latest price

  for (const call of toolCalls) {
    if (call.tool === 'set_price' && call.result?.success) {
      const key = `${call.args.row}-${call.args.column}`;
      slotPrice[key] = call.result.new_price;
      // Update price on the last history entry for this slot if product unchanged
      const hist = slotHistory[key];
      if (hist?.length) hist[hist.length - 1].price = call.result.new_price;
    }

    if (call.tool === 'restock_machine' && call.result?.success) {
      const { row, column, product } = call.args;
      const key = `${row}-${column}`;
      const prev = slotCurrent[key];
      const price = call.result.slot?.price ?? call.args.price ?? null;
      if (prev !== product) {
        if (!slotHistory[key]) slotHistory[key] = [];
        slotHistory[key].push({ day: call.day, product, price });
        slotCurrent[key] = product;
        slotPrice[key] = price;
      }
    }

    if (call.tool === 'empty_slot' && call.result?.success) {
      const { row, column } = call.args;
      delete slotCurrent[`${row}-${column}`];
    }
  }

  const totalSwaps = Object.values(slotHistory).reduce(
    (sum, hist) => sum + Math.max(0, hist.length - 1),
    0
  );

  return { totalSwaps, bySlot: slotHistory };
}

const PRODUCT_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6',
  '#ec4899','#8b5cf6','#06b6d4','#f97316','#a3e635',
  '#e879f9','#fb923c','#34d399','#60a5fa','#fbbf24','#f87171',
];

export default function ProductAdaptation({ toolCalls, currentDay }) {
  const { totalSwaps, bySlot } = computeProductSwaps(toolCalls);
  const productStats = computeProductStats(toolCalls, currentDay);

  const allProducts = [...new Set(Object.values(bySlot).flat().map(e => e.product))].sort();
  const colorMap = Object.fromEntries(allProducts.map((p, i) => [p, PRODUCT_COLORS[i % PRODUCT_COLORS.length]]));

  const slots = Object.entries(bySlot).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>Product Adaptation</h3>
        <div className={styles.swapCount}>
          <span className={styles.swapNum}>{totalSwaps}</span>
          <span className={styles.swapLabel}>product swaps</span>
        </div>
      </div>

      {slots.length === 0 ? (
        <p className={styles.empty}>No restock data yet</p>
      ) : (
        <div className={styles.slots}>
          {slots.map(([key, history]) => {
            const swaps = Math.max(0, history.length - 1);
            return (
              <div key={key} className={styles.slot}>
                <div className={styles.slotHeader}>
                  <span className={styles.slotKey}>Slot {key.replace('-', '·')}</span>
                  <span className={styles.slotSwaps}>
                    {swaps === 0 ? 'no swaps' : `${swaps} swap${swaps > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className={styles.timeline}>
                  {history.map((entry, i) => (
                    <div key={i} className={styles.timelineEntry}>
                      {i > 0 && <span className={styles.arrow}>→</span>}
                      <span
                        className={styles.productChip}
                        style={{ background: `${colorMap[entry.product]}22`, color: colorMap[entry.product], borderColor: `${colorMap[entry.product]}44` }}
                        title={`Day ${entry.day}`}
                      >
                        <span className={styles.chipDay}>D{entry.day}</span>
                        {entry.product}
                        {entry.price != null && (
                          <span className={styles.chipPrice}>${entry.price.toFixed(2)}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {productStats.length > 0 && (
        <div className={styles.statsSection}>
          <div className={styles.statsHead}>
            <span>Product</span>
            <span className={styles.statsRight}>Price Range</span>
            <span className={styles.statsRight}>Slot×Days</span>
          </div>
          {productStats.map(s => (
            <div key={s.product} className={styles.statsRow}>
              <span
                className={styles.statsProduct}
                style={{ color: colorMap[s.product] }}
              >{s.product}</span>
              <span className={styles.statsRight}>
                {s.minPrice != null
                  ? s.minPrice === s.maxPrice
                    ? `$${s.minPrice.toFixed(2)}`
                    : `$${s.minPrice.toFixed(2)} – $${s.maxPrice.toFixed(2)}`
                  : '—'}
              </span>
              <span className={styles.statsRight}>{s.slotDays}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
