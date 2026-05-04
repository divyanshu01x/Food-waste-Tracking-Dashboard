/* ============================================================
   ui.js — IoT-SENSE Dashboard
   assets/js/ui.js

   All DOM rendering functions:
   • Device cards strip
   • Weight hero panel
   • HX711 register table
   • ESP32 quick info grid
   • Device details tab
   • ADC stream console
   • HX711 timing SVG diagram
   • Data log table
   • Tab switching / selector buttons
   • Clock
   ============================================================ */

/* ----------------------------------------------------------
   HELPER — builds a single register / info row
   ---------------------------------------------------------- */
function makeRow(name, value, cls = '', rawHTML = false) {
  const valHTML = rawHTML
    ? value
    : `<span class="reg-val${cls ? ' ' + cls : ''}">${value}</span>`;
  return `<div class="reg-row">
            <span class="reg-name">${name}</span>
            ${valHTML}
          </div>`;
}

/* ----------------------------------------------------------
   DEVICE CARDS
   ---------------------------------------------------------- */

/**
 * Render a single device card into a container element.
 * @param {HTMLElement} container - the grid element to append into
 * @param {number}      n         - node index
 * @param {boolean}     full      - true = show IP + uptime fields
 */
function renderDeviceCard(container, n, full = false) {
  const h   = Math.floor(uptimes[n] / 3600);
  const m   = Math.floor((uptimes[n] % 3600) / 60);

  const card = document.createElement('div');
  card.className = 'device-card';
  card.innerHTML = `
    <div class="device-header">
      <span class="device-id">${NODES[n].id}</span>
      <div class="device-status-dot online"></div>
    </div>
    <div class="device-metrics">
      <div class="dev-metric">
        <span class="dev-label">Weight</span>
        <span class="dev-value">${weights[n].toFixed(2)} kg</span>
      </div>
      <div class="dev-metric">
        <span class="dev-label">RSSI</span>
        <span class="dev-value">${rssi[n]} dBm ${signalBarsHTML(n)}</span>
      </div>
      <div class="dev-metric">
        <span class="dev-label">CPU Temp</span>
        <span class="dev-value">${temps[n].toFixed(1)} °C</span>
      </div>
      <div class="dev-metric">
        <span class="dev-label">Free Heap</span>
        <span class="dev-value">${(heaps[n] / 1024).toFixed(0)} KB</span>
      </div>
      ${full ? `
      <div class="dev-metric">
        <span class="dev-label">IP Address</span>
        <span class="dev-value" style="font-size:10px;color:var(--teal)">${NODES[n].ip}</span>
      </div>
      <div class="dev-metric">
        <span class="dev-label">Uptime</span>
        <span class="dev-value">${h}h ${m}m</span>
      </div>` : ''}
    </div>`;
  container.appendChild(card);
}

/**
 * Re-render both device strips (overview + devices tab).
 */
function renderDeviceStrip() {
  const ids = ['deviceStrip', 'deviceStripFull'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    NODES.forEach((_, i) => renderDeviceCard(el, i, id === 'deviceStripFull'));
  });
}

/* ----------------------------------------------------------
   HX711 REGISTER PANEL
   ---------------------------------------------------------- */
function renderHX711Regs() {
  const n   = 0;
  const nd  = NODES[n];
  const raw = adcRaws[n];
  const w   = weights[n];

  const binStr = (raw >>> 0).toString(2).padStart(24, '0');
  const hexStr = '0x' + ((raw >>> 0).toString(16).toUpperCase().padStart(6, '0'));
  const volt   = (raw / Math.pow(2, 23) * 0.0001).toFixed(6);

  document.getElementById('hx711Regs').innerHTML = [
    makeRow('Chip Model',       'HX711 Avia Semiconductor'),
    makeRow('Input Channel',    `Channel ${nd.channel}, Gain ×${nd.gain}`),
    makeRow('Output Data Rate', `${nd.sps} SPS`),
    makeRow('Raw ADC (Dec)',     raw.toLocaleString(),    'green'),
    makeRow('Raw ADC (Hex)',     hexStr,                  'teal'),
    makeRow('Binary (24-bit)',
      `<span class="reg-val bin">${binStr.slice(0,8)} ${binStr.slice(8,16)} ${binStr.slice(16)}</span>`,
      '', true),
    makeRow('Tare Offset',      nd.offset.toLocaleString()),
    makeRow('Cal. Factor',      nd.calFactor.toFixed(2) + ' LSB/kg'),
    makeRow('Calibrated Wt.',   w.toFixed(4) + ' kg',    'green'),
    makeRow('Diff. Voltage',    volt + ' V'),
    makeRow('Status',
      w > CONFIG.overloadThreshold
        ? '<span class="reg-val red">OVERLOAD</span>'
        : '<span class="reg-val green">OK</span>',
      '', true),
  ].join('');
}

/* ----------------------------------------------------------
   WEIGHT HERO PANEL
   ---------------------------------------------------------- */
function updateWeightDisplay() {
  const w   = weights[0];
  const max = CONFIG.maxCapacity;
  const pct = Math.min(100, (w / max) * 100);

  document.getElementById('weightDisplay').textContent = w.toFixed(2);
  document.getElementById('weightBar').style.width     = pct + '%';
  document.getElementById('capBar').style.width        = pct + '%';
  document.getElementById('capPct').textContent        = pct.toFixed(1) + '%';

  /* Overload zone = top 10% of capacity */
  const ovPct = Math.max(0, ((w - max * 0.9) / (max * 0.1)) * 100);
  document.getElementById('ovBar').style.width = Math.min(100, ovPct) + '%';
  document.getElementById('ovPct').textContent = ovPct.toFixed(1) + '%';

  /* Status badge */
  const status = w > CONFIG.overloadThreshold ? 'OVERLOAD'
               : w > CONFIG.warningThreshold  ? 'WARNING'
               : 'STABLE';
  const el = document.getElementById('lcStatus');
  el.textContent = status;
  el.className   = 'panel-badge ' + (
    status === 'STABLE'   ? 'green' :
    status === 'WARNING'  ? ''      : 'red'
  );

  /* Min today */
  const vals = history[0].map(h => h.w);
  if (vals.length) {
    document.getElementById('minVal').textContent = Math.min(...vals).toFixed(2) + ' kg';
  }
}

/* ----------------------------------------------------------
   ESP32 QUICK INFO PANEL (Overview tab)
   ---------------------------------------------------------- */
function renderEspQuickInfo() {
  const nd = NODES[0];
  const items = [
    ['Chip Model',   'ESP32-WROOM-32'],
    ['Flash',        '4 MB SPI'],
    ['SDK',          'ESP-IDF v5.1.2'],
    ['Framework',    'Arduino Core'],
    ['SSID',         nd.ssid],
    ['WiFi Channel', '6'],
    ['MAC Address',  nd.mac],
    ['IP Address',   nd.ip],
    ['CPU Freq',     '240 MHz'],
    ['CPU Cores',    'Dual (Xtensa LX6)'],
    ['RTOS',         'FreeRTOS'],
    ['Task Stack',   '8192 B'],
  ];

  document.getElementById('espQuickInfo').innerHTML = items.map(([k, v]) =>
    `<div class="esp-row">
      <span class="esp-key">${k}</span>
      <span class="esp-val ${['MAC Address','IP Address','SDK'].includes(k) ? 'mono' : ''}">${v}</span>
    </div>`
  ).join('');
}

/* ----------------------------------------------------------
   DEVICE DETAILS TAB — full per-node info panels
   ---------------------------------------------------------- */
function renderDeviceDetails() {
  const grid = document.getElementById('deviceDetailGrid');
  if (!grid) return;
  grid.innerHTML = '';

  NODES.forEach((nd, i) => {
    const h   = Math.floor(uptimes[i] / 3600);
    const m   = Math.floor((uptimes[i] % 3600) / 60);

    const div = document.createElement('div');
    div.className = 'panel';
    div.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${nd.id}</span>
        <span class="panel-badge teal">ONLINE</span>
      </div>
      <div class="panel-body">
        <div class="register-grid">
          ${makeRow('MAC Address',  nd.mac)}
          ${makeRow('IP Address',   nd.ip,                         'teal')}
          ${makeRow('SSID',         nd.ssid)}
          ${makeRow('RSSI',         rssi[i] + ' dBm')}
          ${makeRow('CPU Temp',     temps[i].toFixed(1) + ' °C')}
          ${makeRow('Free Heap',    (heaps[i] / 1024).toFixed(0) + ' KB')}
          ${makeRow('Uptime',       h + 'h ' + m + 'm')}
          ${makeRow('HX711 Gain',   '×' + nd.gain)}
          ${makeRow('HX711 SPS',    nd.sps + ' Hz')}
          ${makeRow('HX711 Ch.',    nd.channel)}
          ${makeRow('Cal. Factor',  nd.calFactor.toFixed(2))}
          ${makeRow('Tare Offset',  nd.offset.toLocaleString())}
          ${makeRow('Weight',       weights[i].toFixed(3) + ' kg', 'green')}
          ${makeRow('Raw ADC',      adcRaws[i].toLocaleString())}
        </div>
      </div>`;
    grid.appendChild(div);
  });
}

/* ----------------------------------------------------------
   ADC STREAM CONSOLE
   ---------------------------------------------------------- */
function updateADCStream() {
  const el = document.getElementById('adcStream');
  if (!el) return;

  const n     = 0;
  const nd    = NODES[n];
  const lines = [];

  for (let i = 0; i < 7; i++) {
    const noise = (Math.random() - 0.5) * 100;
    const raw   = Math.round(adcRaws[n] + noise);
    const hex   = (raw >>> 0).toString(16).toUpperCase().padStart(6, '0');
    const wkg   = ((raw - nd.offset) / nd.calFactor).toFixed(4);
    lines.push(
      `[${timestamp().slice(11)}]  ` +
      `ADC=<span style="color:var(--amber)">${raw.toString().padStart(8)}</span>  ` +
      `HEX=<span style="color:var(--muted2)">0x${hex}</span>  ` +
      `W=${wkg}kg`
    );
  }
  el.innerHTML = lines.join('<br>');
}

/* ----------------------------------------------------------
   HX711 PROTOCOL TIMING DIAGRAM (SVG)
   ---------------------------------------------------------- */
function renderTimingViz() {
  const el = document.getElementById('timingViz');
  if (!el) return;

  const pulses = 27, pw = 8, gap = 4, waveH = 30;
  const topSCK = 20, topDOUT = 70;
  const totalW = (pw + gap) * pulses + 20;
  const bits   = '010110110101001101100101110100100';

  let sckPath  = `M0 ${topSCK + waveH}`;
  let doutPath = `M0 ${topDOUT + waveH}`;

  for (let i = 0; i < pulses; i++) {
    const x   = i * (pw + gap) + 20;
    const bit = parseInt(bits[i % bits.length]);
    sckPath  += ` L${x} ${topSCK+waveH} L${x} ${topSCK} L${x+pw} ${topSCK} L${x+pw} ${topSCK+waveH}`;
    const dy  = bit ? 0 : waveH;
    doutPath += ` L${x} ${topDOUT+dy} L${x+pw} ${topDOUT+dy}`;
  }

  el.innerHTML = `
    <svg width="100%" viewBox="0 0 ${totalW} 110" style="overflow:visible">
      <text x="0" y="${topSCK - 4}"  style="font-size:9px;fill:var(--muted);font-family:var(--mono)">PD_SCK</text>
      <text x="0" y="${topDOUT - 4}" style="font-size:9px;fill:var(--muted);font-family:var(--mono)">DOUT</text>
      <path d="${sckPath}"  fill="none" stroke="var(--amber)" stroke-width="1.5"/>
      <path d="${doutPath}" fill="none" stroke="var(--teal)"  stroke-width="1.5"/>
      <text x="22" y="108" style="font-size:8px;fill:var(--muted);font-family:var(--mono)">
        ← 24 data bits + 1-3 control pulses (PD_SCK) →
      </text>
    </svg>`;
}

/* ----------------------------------------------------------
   DATA LOG TABLE
   ---------------------------------------------------------- */
function addLogRow() {
  const n      = 0;
  const w      = weights[n];
  const status = w > CONFIG.overloadThreshold ? 'OVERLOAD'
               : w > CONFIG.warningThreshold  ? 'WARN'
               : 'OK';

  const entry = {
    time:   timestamp(),
    node:   NODES[n].id,
    weight: w,
    adc:    adcRaws[n],
    temp:   temps[n],
    rssi:   rssi[n],
    heap:   heaps[n],
    status,
  };

  logData.unshift(entry);
  if (logData.length > CONFIG.maxLogRows) logData.pop();

  const body = document.getElementById('logBody');
  if (!body) return;

  const cls = status === 'OK' ? 'ok' : status === 'WARN' ? 'warn' : 'err';
  const tr  = document.createElement('tr');
  tr.innerHTML = `
    <td>${entry.time}</td>
    <td>${entry.node}</td>
    <td>${entry.weight.toFixed(3)}</td>
    <td>${entry.adc.toLocaleString()}</td>
    <td>${entry.temp.toFixed(1)}</td>
    <td>${entry.rssi}</td>
    <td>${(entry.heap / 1024).toFixed(0)} KB</td>
    <td class="${cls}">${entry.status}</td>`;

  body.insertBefore(tr, body.firstChild);
  if (body.children.length > 200) body.removeChild(body.lastChild);
  document.getElementById('logCount').textContent = logData.length + ' records';
}

function clearLog() {
  logData = [];
  document.getElementById('logBody').innerHTML  = '';
  document.getElementById('logCount').textContent = '0 records';
}

function exportCSV() {
  const header = 'Timestamp,Node,Weight_kg,Raw_ADC,Temp_C,RSSI_dBm,FreeHeap_B,Status\n';
  const rows   = logData.map(e =>
    `${e.time},${e.node},${e.weight.toFixed(3)},${e.adc},${e.temp.toFixed(1)},${e.rssi},${e.heap},${e.status}`
  ).join('\n');
  const blob   = new Blob([header + rows], { type: 'text/csv' });
  const url    = URL.createObjectURL(blob);
  const a      = Object.assign(document.createElement('a'), { href: url, download: 'iot_data_log.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

/* ----------------------------------------------------------
   TAB SWITCHING & SELECTOR CONTROLS
   ---------------------------------------------------------- */
function switchTab(event, name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'devices') renderDeviceDetails();
  if (name === 'livedata') renderTimingViz();
}

function setRange(btn, secs) {
  document.querySelectorAll('#tab-overview .sel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  chartRange = secs;
}

function setNode(btn, n) {
  document.querySelectorAll('#tab-livedata .sel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedNode = n;
  if (mChart) {
    mChart.data.datasets.forEach((ds, i) => { ds.hidden = n < 3 && i !== n; });
    mChart.update();
  }
}

/* ----------------------------------------------------------
   CLOCK
   ---------------------------------------------------------- */
function updateClock() {
  document.getElementById('clockDisplay').textContent = timestamp().slice(11);
}
