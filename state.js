/* ============================================================
   state.js — IoT-SENSE Dashboard
   assets/js/state.js

   Shared mutable state for all modules.
   Do NOT edit initial values here — edit CONFIG / NODES in config.js.
   ============================================================ */

/* Per-node runtime values (index matches NODES array) */
let weights  = [0,       0,       0      ]; // current weight readings (kg)
let adcRaws  = [0,       0,       0      ]; // raw 24-bit HX711 integers
let rssi     = [-62,    -71,     -55     ]; // WiFi RSSI (dBm)
let temps    = [41.2,    38.8,    43.5   ]; // ESP32 internal CPU temp (°C)
let heaps    = [187432,  192104,  183820 ]; // free heap memory (bytes)
let uptimes  = [3600,    7200,    1800   ]; // uptime in seconds

/* Weight history — ring buffer per node (max 1200 samples = 20 min at 1 Hz) */
let history  = [[], [], []];

/* In-memory data log entries (newest first) */
let logData  = [];

/* Chart display settings */
let chartRange    = 60;   // how many seconds of data to show on chart
let selectedNode  = 0;    // which node is highlighted in multi-chart (0-2, 3 = all)

/* Chart instances (populated by charts.js) */
let wChart = null;   // overview weight history chart
let mChart = null;   // multi-node live stream chart

/* Global tick counter incremented each update cycle */
let tick = 0;
