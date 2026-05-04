/* ============================================================
   config.js — IoT-SENSE Dashboard
   assets/js/config.js

   ▶  THIS IS THE ONLY FILE YOU NEED TO EDIT FOR BASIC SETUP.
   ▶  All thresholds, node IDs, IPs, and calibration values live here.
   ============================================================ */

/* ----------------------------------------------------------
   GLOBAL DASHBOARD SETTINGS
   ---------------------------------------------------------- */
const CONFIG = {
  maxCapacity:      4.5,    // kg  — your load cell's rated max capacity
  overloadThreshold:4.3,    // kg  — OVERLOAD alert fires above this value
  warningThreshold: 3.8,    // kg  — WARNING alert fires above this value
  maxLogRows:       500,    // max rows kept in the in-memory data log
  updateIntervalMs: 1000,   // ms  — how often the dashboard refreshes
  adcStreamRate:    2,      // refresh ADC stream panel every N ticks
  logRate:          5,      // write a log entry every N ticks
  useMockData:      true,   // ← set FALSE when connecting real hardware
};

/* ----------------------------------------------------------
   NODE / DEVICE DEFINITIONS
   Add, remove, or edit entries to match your real ESP32s.
   ---------------------------------------------------------- */
const NODES = [
  {
    // ── Node 1 ───────────────────────────────────────────
    id:        'ESP32-A4F2',        // Friendly name shown in the UI
    mac:       'A4:F2:3B:11:CC:01', // From esp_wifi_get_mac() or WiFi.macAddress()
    ip:        '192.168.1.101',     // From WiFi.localIP()
    ssid:      'IoT_Net_5G',        // WiFi network name
    base:      1.2,                 // MOCK ONLY — simulated base weight (kg)
    gain:      128,                 // HX711 gain: 128 (Ch A), 64 (Ch A), 32 (Ch B)
    sps:       80,                  // HX711 output data rate: 80 or 10 SPS
    calFactor: 452.6,               // Calibration factor — LSB per kg
    offset:    82340,               // Tare offset — raw ADC reading at 0 kg
    channel:   'A',                 // HX711 input channel: 'A' or 'B'
  },
  {
    // ── Node 2 ───────────────────────────────────────────
    id:        'ESP32-B8D4',
    mac:       'B8:D4:7A:22:FF:02',
    ip:        '192.168.1.102',
    ssid:      'IoT_Net_5G',
    base:      2.8,
    gain:      64,
    sps:       80,
    calFactor: 451.1,
    offset:    83120,
    channel:   'A',
  },
  {
    // ── Node 3 ───────────────────────────────────────────
    id:        'ESP32-C2E6',
    mac:       'C2:E6:5C:33:AA:03',
    ip:        '192.168.1.103',
    ssid:      'IoT_Net_5G',
    base:      0.6,
    gain:      128,
    sps:       10,
    calFactor: 453.9,
    offset:    81950,
    channel:   'A',
  },
];

/* ----------------------------------------------------------
   HOW TO FIND YOUR CALIBRATION VALUES
   ----------------------------------------------------------
   1. Place ZERO weight on the load cell, read raw HX711 value → that is 'offset'
   2. Place a KNOWN weight (e.g. 1 kg), read raw value again
   3. calFactor = (raw_with_weight - offset) / known_weight_in_kg

   In Arduino:
     long raw = scale.read();
     Serial.println(raw);   // raw at zero → offset
     // place known weight
     raw = scale.read();
     // calFactor = (raw - offset) / knownWeight;
   ---------------------------------------------------------- */

/* ----------------------------------------------------------
   REAL HARDWARE INTEGRATION — choose one approach
   ----------------------------------------------------------

   ── Option A: HTTP polling (simplest) ──────────────────────
   Your ESP32 firmware exposes:
     GET http://<ip>/data
     → { "weight":1.23, "raw":83200, "temp":42.1, "rssi":-63, "heap":185000 }

   In data.js, replace the mock fetch block with:
     async function fetchNode(n) {
       try {
         const res  = await fetch(`http://${NODES[n].ip}/data`);
         const json = await res.json();
         weights[n] = json.weight;
         adcRaws[n] = json.raw;
         temps[n]   = json.temp;
         rssi[n]    = json.rssi;
         heaps[n]   = json.heap;
       } catch (e) {
         console.warn(`Node ${n} unreachable`, e);
       }
     }

   ── Option B: WebSocket (real-time push) ────────────────────
   const ws = new WebSocket('ws://192.168.1.101/ws');
   ws.onmessage = (e) => {
     const d    = JSON.parse(e.data);
     weights[0] = d.weight;
     adcRaws[0] = d.raw;
   };

   ── Option C: MQTT over WebSockets ──────────────────────────
   // Add mqtt.min.js to assets/js/ first
   const client = mqtt.connect('ws://your-broker:8083/mqtt');
   client.subscribe('iot/+/data');
   client.on('message', (topic, msg) => {
     const nodeIndex = parseInt(topic.split('/')[1]) - 1;
     const d         = JSON.parse(msg.toString());
     weights[nodeIndex] = d.weight;
   });
   ---------------------------------------------------------- */
