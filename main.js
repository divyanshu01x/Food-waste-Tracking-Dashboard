/* ============================================================
   main.js — IoT-SENSE Dashboard
   assets/js/main.js

   Application entry point.
   Wires together config → state → data → ui → charts.
   Runs the main update loop at CONFIG.updateIntervalMs.
   ============================================================ */

/**
 * One full update cycle:
 *  1. Fetch / simulate sensor data for all nodes
 *  2. Re-render device strip cards
 *  3. Update weight hero panel + threshold bars
 *  4. Refresh HX711 register display
 *  5. Push new data points into both charts
 *  6. Tick the clock
 *  7. Conditionally refresh ADC stream and write log row
 */
async function update() {
  /* 1 — Fetch or simulate data */
  await fetchAllNodes();

  /* 2 — Device cards */
  renderDeviceStrip();

  /* 3 — Weight hero */
  updateWeightDisplay();

  /* 4 — HX711 registers */
  renderHX711Regs();

  /* 5 — Charts */
  updateCharts();

  /* 6 — Clock */
  updateClock();

  /* 7 — Rate-limited panels */
  if (tick % CONFIG.adcStreamRate === 0) updateADCStream();
  if (tick % CONFIG.logRate        === 0) addLogRow();

  tick++;
}

/* ----------------------------------------------------------
   BOOT
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  /* Static panels that only need rendering once */
  renderDeviceStrip();
  renderEspQuickInfo();
  initCharts();

  /* First tick immediately so the UI isn't blank */
  update();

  /* Then repeat on the configured interval */
  setInterval(update, CONFIG.updateIntervalMs);
});
