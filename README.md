# IoT-SENSE Dashboard
**ESP32 · HX711 · Load Cell Real-Time Monitor**

A clean, dark-themed web dashboard that visualises live weight data from one or more ESP32 microcontrollers connected to HX711 ADC chips and strain-gauge load cells.

---

## Project Structure

```
iot-sense/
│
├── index.html              ← HTML structure (no inline CSS or JS)
├── assets/
│   ├── css/
│   │   └── style.css       ← All styles and CSS variables
│   ├── js/
│   │   ├── config.js       ← ★ Edit this first — hardware settings
│   │   ├── state.js        ← Shared runtime state variables
│   │   ├── data.js         ← Simulation + real hardware fetch hook
│   │   ├── ui.js           ← All DOM rendering functions
│   │   ├── charts.js       ← Chart.js init and live updates
│   │   └── main.js         ← App entry point + update loop
│   └── images/             ← Add logos, icons, or device photos here
└── README.md
```

---

## Quick Start (Mock / Demo Mode)

No hardware required — just open `index.html` in any modern browser.

```bash
# Option A: directly open the file
open index.html

# Option B: serve locally (avoids CORS issues when fetching real ESP32 data)
npx serve .
# or
python3 -m http.server 8080
```

> ⚠️ If you plan to use HTTP polling to fetch data from ESP32, you **must** use a local server (`npx serve` / `python3 -m http.server`), not `file://`. Browsers block cross-origin requests from `file://`.

---

## Configuration

### Step 1 — Edit `assets/js/config.js`

```js
const CONFIG = {
  maxCapacity:       4.5,   // ← your load cell's rated max (kg)
  overloadThreshold: 4.3,   // ← OVERLOAD alert threshold (kg)
  warningThreshold:  3.8,   // ← WARNING alert threshold (kg)
  updateIntervalMs:  1000,  // ← refresh rate in milliseconds
  useMockData:       true,  // ← set false for real hardware
};
```

### Step 2 — Update `NODES` array in `config.js`

Replace the placeholder values with your real device details:

```js
const NODES = [
  {
    id:        'MY-ESP32-01',       // friendly name shown in UI
    mac:       'AA:BB:CC:DD:EE:FF', // from WiFi.macAddress()
    ip:        '192.168.1.101',     // from WiFi.localIP()
    ssid:      'YourWiFiNetwork',
    gain:      128,                 // HX711 gain: 128, 64, or 32
    sps:       80,                  // HX711 output rate: 80 or 10
    calFactor: 452.6,               // LSB per kg (see calibration below)
    offset:    82340,               // raw ADC value at zero weight
    channel:   'A',                 // HX711 channel: 'A' or 'B'
  },
  // add more nodes as needed...
];
```

---

## Connecting Real Hardware

### Option A — HTTP Polling (Simplest)

1. Set `useMockData: false` in `CONFIG`
2. In `assets/js/data.js`, uncomment the HTTP fetch block inside `fetchAllNodes()`
3. Flash your ESP32 with firmware that exposes:

```
GET http://<ESP32_IP>/data
```
Response format:
```json
{ "weight": 1.23, "raw": 83200, "temp": 42.1, "rssi": -63, "heap": 185000 }
```

**Minimal Arduino firmware snippet:**
```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <HX711.h>

HX711 scale;
WebServer server(80);

void setup() {
  scale.begin(DOUT_PIN, SCK_PIN);
  scale.set_scale(452.6);   // your calFactor
  scale.tare();
  WiFi.begin("SSID", "PASSWORD");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  server.on("/data", []() {
    float weight = scale.get_units(3);   // average of 3 readings
    String json = "{\"weight\":" + String(weight, 3) +
                  ",\"raw\":"    + String((long)scale.read()) +
                  ",\"temp\":"   + String(temperatureRead(), 1) +
                  ",\"rssi\":"   + String(WiFi.RSSI()) +
                  ",\"heap\":"   + String(ESP.getFreeHeap()) + "}";
    server.send(200, "application/json", json);
  });
  server.begin();
}

void loop() { server.handleClient(); }
```

---

### Option B — WebSocket (Real-Time Push)

```js
// In assets/js/data.js or main.js:
const ws = new WebSocket('ws://192.168.1.101/ws');
ws.onmessage = (e) => {
  const d    = JSON.parse(e.data);
  weights[0] = d.weight;
  adcRaws[0] = d.raw;
  temps[0]   = d.temp;
  rssi[0]    = d.rssi;
  heaps[0]   = d.heap;
};
```

---

### Option C — MQTT over WebSockets

```html
<!-- Add to index.html before your scripts -->
<script src="https://cdn.jsdelivr.net/npm/mqtt/dist/mqtt.min.js"></script>
```
```js
const client = mqtt.connect('ws://your-broker-ip:8083/mqtt');
client.subscribe('iot/+/data');
client.on('message', (topic, msg) => {
  const nodeIndex = parseInt(topic.split('/')[1]) - 1;  // iot/1/data → node 0
  const d         = JSON.parse(msg.toString());
  weights[nodeIndex] = d.weight;
  adcRaws[nodeIndex] = d.raw;
});
```

---

## HX711 Calibration

Finding `calFactor` and `offset` for your specific load cell:

```cpp
// 1. With nothing on the scale, read the raw value:
long zeroRaw = scale.read_average(10);
// → this is your 'offset'

// 2. Place a known weight (e.g. a 1 kg calibration weight):
long knownRaw = scale.read_average(10);

// 3. Calculate:
float calFactor = (knownRaw - zeroRaw) / knownWeightKg;
```

Then set these values in `NODES[n].offset` and `NODES[n].calFactor` inside `config.js`.

---

## Dashboard Features

| Tab | Contents |
|---|---|
| **Overview** | Live weight hero, capacity bar, HX711 registers, weight history chart, ESP32 system info |
| **Live Data** | Multi-node comparison chart, raw ADC console stream, PD_SCK/DOUT timing diagram |
| **Device Details** | Per-node full info: MAC, IP, RSSI, temp, heap, uptime, calibration values |
| **Data Log** | Timestamped readings table with Export CSV and Clear buttons |

---

## HX711 Wiring Reference

```
HX711 Pin   →   ESP32 Pin
──────────────────────────
VCC         →   3.3V
GND         →   GND
DOUT        →   GPIO 16 (configurable)
PD_SCK      →   GPIO 17 (configurable)

Load Cell   →   HX711
E+          →   E+
E-          →   E-
A+          →   A+
A-          →   A-
```

---

## Customisation Tips

- **Change theme colours** — edit the `:root` CSS variables at the top of `assets/css/style.css`
- **Add more nodes** — push additional objects to the `NODES` array in `config.js`
- **Remove nodes** — delete entries from `NODES`; the UI adjusts automatically
- **Change chart colours** — edit `NODE_COLORS` in `assets/js/charts.js`
- **Log to a database** — in `data.js → fetchAllNodes()`, POST to your backend after reading

---

## Dependencies

| Library | Version | Source |
|---|---|---|
| Chart.js | 4.4.1 | cdnjs.cloudflare.com |
| JetBrains Mono | latest | Google Fonts |
| Syne | latest | Google Fonts |

All loaded via CDN — no `npm install` needed.

---

## License

MIT — free to use, modify, and distribute.
