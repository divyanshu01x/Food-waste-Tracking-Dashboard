/* ============================================================
   data.js — IoT-SENSE Dashboard
   assets/js/data.js

   Handles:
   • Mock data simulation (used when CONFIG.useMockData = true)
   • Real hardware fetch hook (swap in your fetch/WebSocket here)
   • Shared helper utilities (timestamp, signal bar count)
   ============================================================ */

/* ----------------------------------------------------------
   UTILITIES
   ---------------------------------------------------------- */

/**
 * Returns current local time as "YYYY-MM-DD HH:MM:SS"
 */
function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Convert RSSI dBm value to 1-4 bar count
 * @param {number} r - RSSI value in dBm
 * @returns {number} bar count 1–4
 */
function rssiToBarCount(r) {
  if (r > -55) return 4;
  if (r > -65) return 3;
  if (r > -75) return 2;
  return 1;
}

/**
 * Build the HTML for a signal-strength bar indicator
 * @param {number} n - node index
 * @returns {string} HTML string
 */
function signalBarsHTML(n) {
  const heights = [5, 8, 11, 14];
  const bars    = rssiToBarCount(rssi[n]);
  return `<span class="signal-bars">${
    heights.map((h, i) =>
      `<span style="height:${h}px" class="${i < bars ? 'active' : ''}"></span>`
    ).join('')
  }</span>`;
}

/* ----------------------------------------------------------
   MOCK DATA SIMULATION
   All functions below return simulated sensor readings.
   Replace each return value with a real hardware read when ready.
   ---------------------------------------------------------- */

/**
 * Simulate a weight reading for a given node.
 * REPLACE: return the parsed weight from your ESP32 HTTP/WS/MQTT response.
 * @param {number} n - node index
 * @returns {number} weight in kg
 */
function simWeight(n) {
  const drift = Math.sin(Date.now() / 8000 + n * 2) * 0.4;
  const noise = (Math.random() - 0.5) * 0.08;
  return Math.max(0, NODES[n].base + drift + noise);
}

/**
 * Simulate a raw HX711 ADC integer from a known weight.
 * REPLACE: return the integer from scale.read() on your ESP32.
 * @param {number} w - weight in kg
 * @param {number} n - node index
 * @returns {number} raw signed 24-bit integer
 */
function simADC(w, n) {
  return Math.round(NODES[n].offset + w * NODES[n].calFactor + (Math.random() - 0.5) * 50);
}

/**
 * Simulate WiFi RSSI with small random walk.
 * REPLACE: return WiFi.RSSI() from your ESP32 JSON response.
 * @param {number} n - node index
 * @returns {number} RSSI in dBm
 */
function simRSSI(n) {
  return rssi[n] + Math.round((Math.random() - 0.5) * 3);
}

/**
 * Simulate ESP32 CPU temperature drift.
 * REPLACE: return temperatureRead() from your ESP32 JSON response.
 * @param {number} n - node index
 * @returns {number} temperature in °C
 */
function simTemp(n) {
  return parseFloat((temps[n] + (Math.random() - 0.5) * 0.1).toFixed(2));
}

/* ----------------------------------------------------------
   MAIN UPDATE — called every CONFIG.updateIntervalMs
   ---------------------------------------------------------- */

/**
 * Fetch or simulate new data for all nodes, then push to state arrays.
 * When CONFIG.useMockData = false, replace the mock block with real reads.
 */
async function fetchAllNodes() {
  for (let i = 0; i < NODES.length; i++) {

    if (CONFIG.useMockData) {
      /* ── MOCK MODE ── */
      weights[i] = simWeight(i);
      adcRaws[i] = simADC(weights[i], i);
      rssi[i]    = simRSSI(i);
      temps[i]   = simTemp(i);
      heaps[i]   = Math.max(100000, heaps[i] + Math.round((Math.random() - 0.5) * 2048));

    } else {
      /* ── REAL HARDWARE MODE ──
         Option A: HTTP polling — uncomment and adapt:

         try {
           const res  = await fetch(`http://${NODES[i].ip}/data`, { signal: AbortSignal.timeout(900) });
           const json = await res.json();
           weights[i] = json.weight;
           adcRaws[i] = json.raw;
           rssi[i]    = json.rssi;
           temps[i]   = json.temp;
           heaps[i]   = json.heap;
         } catch (e) {
           console.warn(`Node ${i} (${NODES[i].id}) unreachable:`, e.message);
         }

         Option B: If using WebSocket or MQTT, data is pushed externally.
         The ws.onmessage / client.on handlers write directly to state arrays,
         so this loop can be left empty (or used just to update uptimes).
      */
    }

    /* Always increment uptime and push to history ring buffer */
    uptimes[i]++;
    history[i].push({ t: timestamp(), w: weights[i] });
    if (history[i].length > 1200) history[i].shift();
  }
}
