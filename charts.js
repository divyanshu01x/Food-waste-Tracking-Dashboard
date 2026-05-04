/* ============================================================
   charts.js — IoT-SENSE Dashboard
   assets/js/charts.js

   Initialises and updates Chart.js instances:
   • wChart — overview weight history (line, single or multi-node)
   • mChart — live data multi-node comparison
   ============================================================ */

/* Colour palette — one colour per node, matches NODES array order */
const NODE_COLORS = [
  '#f0a030',  // Node 1 — amber
  '#26c0a0',  // Node 2 — teal
  '#4898e8',  // Node 3 — blue
];
const NODE_BG_COLORS = [
  'rgba(240,160,48,0.08)',
  'rgba(38,192,160,0.08)',
  'rgba(72,152,232,0.08)',
];

/* Shared Chart.js options reused by both charts */
function sharedChartOptions() {
  const gridColor = 'rgba(255,255,255,0.05)';
  const tickColor = '#6b7280';
  return {
    responsive:           true,
    maintainAspectRatio:  false,
    animation:            { duration: 0 },   // disable animation for live data
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks:  { color: tickColor, font: { size: 9 }, maxTicksLimit: 7 },
        grid:   { color: gridColor },
        border: { color: 'transparent' },
      },
      y: {
        ticks: {
          color: tickColor,
          font:  { size: 9 },
          callback: v => v.toFixed(1) + 'kg',
        },
        grid:   { color: gridColor },
        border: { color: 'transparent' },
        /* Lock Y axis to load cell range so jumps look meaningful */
        min:    0,
        max:    CONFIG.maxCapacity,
      },
    },
  };
}

/**
 * Initialise both chart instances.
 * Called once on DOMContentLoaded.
 */
function initCharts() {
  /* ── Overview weight history chart ── */
  const wCtx = document.getElementById('weightChart');
  if (wCtx) {
    wChart = new Chart(wCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: NODES.map((nd, i) => ({
          label:           nd.id,
          data:            [],
          borderColor:     NODE_COLORS[i],
          backgroundColor: NODE_BG_COLORS[i],
          borderWidth:     i === 0 ? 2 : 1,
          tension:         0.4,
          fill:            i === 0,     // shade under Node 1 only
          pointRadius:     0,
        })),
      },
      options: sharedChartOptions(),
    });
  }

  /* ── Multi-node live stream chart ── */
  const mCtx = document.getElementById('multiChart');
  if (mCtx) {
    mChart = new Chart(mCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: NODES.map((nd, i) => ({
          label:       nd.id,
          data:        [],
          borderColor: NODE_COLORS[i],
          borderWidth: 1.5,
          tension:     0.4,
          pointRadius: 0,
        })),
      },
      options: sharedChartOptions(),
    });
  }
}

/**
 * Push the latest weight readings into both charts and trim old data.
 * Called every update cycle.
 */
function updateCharts() {
  const label   = timestamp().slice(11, 19);  // "HH:MM:SS"
  const maxPts  = chartRange;

  [wChart, mChart].forEach(ch => {
    if (!ch) return;

    ch.data.labels.push(label);
    NODES.forEach((_, i) => ch.data.datasets[i].data.push(weights[i]));

    /* Remove oldest point when buffer is full */
    if (ch.data.labels.length > maxPts) {
      ch.data.labels.shift();
      ch.data.datasets.forEach(ds => ds.data.shift());
    }

    ch.update('none');   // 'none' skips animation for smooth live updates
  });
}
