const HEAT = '#f5a623';

const DEFAULTS = {
  zones: [
    { entity: 'climate.living_room', name: 'LR' },
    { entity: 'climate.bedroom', name: 'Bed' },
    { entity: 'climate.garage', name: 'Garage' },
    { entity: 'climate.downstairs', name: 'Lower' },
    { entity: 'climate.office', name: 'Office' },
  ],
  buffer: {
    name: 'Buffer',
    temp: 'sensor.aeco_0982_tank',
    target: 'sensor.aeco_0982_tank_target',
    state: 'sensor.aeco_0982_tank_state',
    pump: 'binary_sensor.aeco_0982_pump_1',
  },
  dhw: {
    name: 'DHW',
    temp: 'sensor.aeco_0982_dhw_tank',
    target: 'sensor.aeco_0982_dhw_tank_target',
    state: 'sensor.aeco_0982_dhw_tank_state',
    pump: 'binary_sensor.aeco_0982_pump_2',
  },
  outdoor: {
    name: 'Outdoor',
    entity: 'sensor.aeco_0982_outdoor',
    wwsd: 'sensor.aeco_0982_wwsd_temperature',
    reset_outdoor: 'sensor.aeco_0982_outdoor_reset_temperature',
  },
  recirc: { name: 'Recirc', entity: 'switch.lower_equipment_room_recirculator_pump' },
  geo: {
    name: 'Geothermal',
    heat_of_extraction: 'sensor.waterfurnace_water_compressor_heat_of_extraction',
    total_power: 'sensor.waterfurnace_water_heat_pump_total_power_usage',
    cop: 'sensor.waterfurnace_water_coefficient_of_power',
    running: 'binary_sensor.waterfurnace_water_blower_running',
  },
};

function fmt(v) {
  if (v == null || v === 'unavailable' || v === 'unknown') return '--';
  return `${Math.round(Number(v))}°`;
}

function fmtD(v) {
  if (v == null || v === 'unavailable' || v === 'unknown') return '--';
  return Number(v).toFixed(1);
}

class HeatingSystemCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._built = false;
  }

  static getConfigElement() {
    return document.createElement('heating-system-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    if (!config) throw new Error('Config required');
    const cz = config.zones || [];
    this._config = {
      zones: cz.length > 0 ? cz : DEFAULTS.zones,
      buffer: { ...DEFAULTS.buffer, ...(config.buffer || {}) },
      dhw: { ...DEFAULTS.dhw, ...(config.dhw || {}) },
      outdoor: { ...DEFAULTS.outdoor, ...(config.outdoor || {}) },
      recirc: { ...DEFAULTS.recirc, ...(config.recirc || {}) },
      geo: { ...DEFAULTS.geo, ...(config.geo || {}) },
    };
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._update();
  }

  getCardSize() {
    return 6;
  }

  _build() {
    const c = this._config;
    const n = c.zones.length;

    const cardW = 108, cardH = 62, zGap = 18, margin = 18;
    const outW = 96, outH = 54, bufW = 148, bufH = 70;
    const dhwW = 148, dhwH = 70, recW = 88, recH = 54;
    const geoW = 180, geoH = 78;
    const g1 = 20, g2 = 120, g3 = 18;

    const zoneRowW = n * cardW + Math.max(0, n - 1) * zGap;
    const row2W = outW + g1 + bufW + g2 + dhwW + g3 + recW;
    const W = Math.max(zoneRowW + 2 * margin, row2W + 2 * margin);
    const H = 360;

    const zLeft = (W - zoneRowW) / 2;
    const zp = Array.from({ length: n }, (_, i) => {
      const x = zLeft + i * (cardW + zGap);
      return { x, cx: x + cardW / 2 };
    });

    const r2 = (W - row2W) / 2;
    const ox = r2, ocx = ox + outW / 2;
    const bx = r2 + outW + g1, bcx = bx + bufW / 2;
    const dx = bx + bufW + g2, dcx = dx + dhwW / 2;
    const rx = dx + dhwW + g3, rcx = rx + recW / 2;

    const busY = 108;
    const busPoints = zp.map(z => z.cx).concat(bcx).sort((a, b) => a - b);
    let busPipes = '';
    for (let i = 0; i < busPoints.length - 1; i++) {
      busPipes += `
        <line id="bus${i}" x1="${busPoints[i]}" y1="${busY}" x2="${busPoints[i + 1]}" y2="${busY}" class="pipe"/>`;
    }
    this._zoneBusSegs = zp.map(z => {
      const lo = Math.min(z.cx, bcx);
      const hi = Math.max(z.cx, bcx);
      const segs = [];
      for (let k = 0; k < busPoints.length - 1; k++) {
        if (busPoints[k] >= lo && busPoints[k + 1] <= hi) segs.push(k);
      }
      return segs;
    });

    const r2y = 138;
    const tankBot = r2y + bufH;
    const tankCy = r2y + bufH / 2;
    const sideY = Math.round(tankCy - outH / 2);
    const connY = tankCy;

    const gcx = (bcx + dcx) / 2;
    const gx = gcx - geoW / 2;
    const geoTop = 268;
    const pipeKneeY = Math.round((tankBot + geoTop) / 2);
    const spread = 40;
    const geL = gcx - spread, geR = gcx + spread;
    const col1 = gcx - 50, col2 = gcx, col3 = gcx + 50;

    let zoneCards = '';
    let zonePipes = '';
    for (let i = 0; i < n; i++) {
      const z = zp[i];
      zoneCards += `
        <g data-entity="${c.zones[i].entity}" class="click">
          <rect id="zr${i}" x="${z.x}" y="16" width="${cardW}" height="${cardH}" rx="7" class="box"/>
          <text x="${z.cx}" y="35" text-anchor="middle" class="label">${c.zones[i].name}</text>
          <text id="zt${i}" x="${z.cx}" y="58" text-anchor="middle" class="temp">--</text>
          <text id="zs${i}" x="${z.cx}" y="73" text-anchor="middle" class="set">--</text>
        </g>`;
      zonePipes += `
        <line id="zpv${i}" x1="${z.cx}" y1="78" x2="${z.cx}" y2="${busY}" class="pipe"/>`;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --hsc-surface: var(--card-background-color, var(--ha-card-background, #1e2130));
          --hsc-idle: var(--divider-color, #2a3040);
          --hsc-text: var(--primary-text-color, #e0e2ea);
          --hsc-muted: var(--secondary-text-color, #6b7590);
          --hsc-dim: var(--disabled-text-color, #3d4a5c);
        }
        ha-card { overflow: hidden; }
        svg {
          width: 100%; display: block;
          font-family: 'Segoe UI', Roboto, sans-serif;
        }
        .box {
          fill: var(--hsc-surface);
          stroke: var(--hsc-idle);
          stroke-width: 1;
        }
        .pipe {
          fill: none;
          stroke: var(--hsc-idle);
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .pipe-j {
          fill: none;
          stroke: var(--hsc-idle);
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .label {
          font-size: 13px; text-transform: uppercase;
          letter-spacing: 0.05em; fill: var(--hsc-muted);
        }
        .temp { font-size: 22px; font-weight: 600; fill: var(--hsc-text); }
        .temp-lg { font-size: 20px; font-weight: 600; fill: var(--hsc-text); }
        .temp-sm { font-size: 18px; font-weight: 600; fill: var(--hsc-text); }
        .set { font-size: 11px; fill: var(--hsc-muted); }
        .val { font-size: 14px; font-weight: 600; fill: var(--hsc-text); }
        .sub {
          font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.05em; fill: var(--hsc-muted);
        }
        .unit { font-size: 9px; fill: var(--hsc-muted); }
        .status { font-size: 11px; font-weight: 600; fill: var(--hsc-dim); }
        .wwsd { font-size: 11px; fill: var(--hsc-muted); }
        .click { cursor: pointer; }
      </style>
      <ha-card>
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

          <!-- Pipes (behind boxes) -->
          ${zonePipes}
          ${busPipes}
          <line id="trunk" x1="${bcx}" y1="${busY}" x2="${bcx}" y2="${r2y}" class="pipe"/>

          <line id="ob" x1="${ox + outW}" y1="${connY}" x2="${bx}" y2="${connY}" class="pipe"/>

          <line id="rc" x1="${dx + dhwW}" y1="${connY}" x2="${rx}" y2="${connY}" class="pipe"/>

          <polyline id="pbg" points="${bcx},${tankBot} ${bcx},${pipeKneeY} ${geL},${pipeKneeY} ${geL},${geoTop}" class="pipe-j"/>
          <polyline id="pdg" points="${dcx},${tankBot} ${dcx},${pipeKneeY} ${geR},${pipeKneeY} ${geR},${geoTop}" class="pipe-j"/>

          <!-- Zone cards -->
          ${zoneCards}

          <!-- Outdoor -->
          <g data-entity="${c.outdoor.entity}" class="click">
            <rect id="or" x="${ox}" y="${sideY}" width="${outW}" height="${outH}" rx="7" class="box"/>
            <text x="${ocx}" y="${sideY + 19}" text-anchor="middle" class="label">${c.outdoor.name}</text>
            <text id="ot" x="${ocx}" y="${sideY + 37}" text-anchor="middle" class="temp-sm">--</text>
            <text id="ow" x="${ocx}" y="${sideY + 50}" text-anchor="middle" class="wwsd"></text>
          </g>

          <!-- Buffer tank -->
          <g data-entity="${c.buffer.state}" class="click">
            <rect id="br" x="${bx}" y="${r2y}" width="${bufW}" height="${bufH}" rx="8" class="box"/>
            <text x="${bcx}" y="${r2y + 19}" text-anchor="middle" class="label">${c.buffer.name}</text>
            <text id="bt" x="${bcx}" y="${r2y + 42}" text-anchor="middle" class="temp-lg">--</text>
            <text id="bs" x="${bcx}" y="${r2y + 57}" text-anchor="middle" class="set">--</text>
          </g>

          <!-- DHW tank -->
          <g data-entity="${c.dhw.state}" class="click">
            <rect id="dr" x="${dx}" y="${r2y}" width="${dhwW}" height="${dhwH}" rx="8" class="box"/>
            <text x="${dcx}" y="${r2y + 19}" text-anchor="middle" class="label">${c.dhw.name}</text>
            <text id="dt" x="${dcx}" y="${r2y + 42}" text-anchor="middle" class="temp-lg">--</text>
            <text id="ds" x="${dcx}" y="${r2y + 57}" text-anchor="middle" class="set">--</text>
          </g>

          <!-- Recirc -->
          <g data-entity="${c.recirc.entity}" class="click">
            <rect id="rr" x="${rx}" y="${sideY}" width="${recW}" height="${recH}" rx="7" class="box"/>
            <text x="${rcx}" y="${sideY + 19}" text-anchor="middle" class="label">${c.recirc.name}</text>
            <text id="rs" x="${rcx}" y="${sideY + 37}" text-anchor="middle" class="temp-sm">OFF</text>
          </g>

          <!-- Geothermal -->
          <g data-entity="${c.geo.running}" class="click">
            <rect id="gr" x="${gx}" y="${geoTop}" width="${geoW}" height="${geoH}" rx="8" class="box"/>
            <text x="${gcx}" y="${geoTop + 19}" text-anchor="middle" class="label">${c.geo.name}</text>

            <text x="${col1}" y="${geoTop + 36}" text-anchor="middle" class="sub">HoE</text>
            <text id="gh" x="${col1}" y="${geoTop + 52}" text-anchor="middle" class="val">--</text>
            <text x="${col1}" y="${geoTop + 64}" text-anchor="middle" class="unit">kW</text>

            <text x="${col2}" y="${geoTop + 36}" text-anchor="middle" class="sub">POWER</text>
            <text id="gp" x="${col2}" y="${geoTop + 52}" text-anchor="middle" class="val">--</text>
            <text x="${col2}" y="${geoTop + 64}" text-anchor="middle" class="unit">kW</text>

            <text x="${col3}" y="${geoTop + 36}" text-anchor="middle" class="sub">COP</text>
            <text id="gc" x="${col3}" y="${geoTop + 52}" text-anchor="middle" class="val">--</text>
          </g>

        </svg>
      </ha-card>`;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._el = {
      z: Array.from({ length: n }, (_, i) => ({
        r: $(`zr${i}`), t: $(`zt${i}`), s: $(`zs${i}`),
        pv: $(`zpv${i}`),
      })),
      bus: Array.from({ length: busPoints.length - 1 }, (_, i) => $(`bus${i}`)),
      trunk: $('trunk'),
      ob: $('ob'), or: $('or'), ow: $('ow'),
      br: $('br'), bt: $('bt'), bs: $('bs'),
      dr: $('dr'), dt: $('dt'), ds: $('ds'),
      ot: $('ot'),
      rr: $('rr'), rc: $('rc'), rs: $('rs'),
      gr: $('gr'), gh: $('gh'), gp: $('gp'), gc: $('gc'),
      pbg: $('pbg'), pdg: $('pdg'),
    };

    this.shadowRoot.querySelectorAll('[data-entity]').forEach((el) => {
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          detail: { entityId: el.dataset.entity },
          bubbles: true,
          composed: true,
        }));
      });
    });
  }

  _update() {
    const h = this._hass;
    const c = this._config;
    const e = this._el;
    const v = (id) => h.states[id]?.state;

    let anyCalling = false;
    const callingSegs = new Set();
    for (let i = 0; i < c.zones.length; i++) {
      const ent = h.states[c.zones[i].entity];
      const calling = ent?.attributes?.hvac_action === 'heating';
      if (calling) {
        anyCalling = true;
        for (const s of this._zoneBusSegs[i]) callingSegs.add(s);
      }

      const disabled = ent?.state === 'off';
      const zi = e.z[i];
      zi.r.style.stroke = calling ? HEAT : '';
      zi.r.style.strokeWidth = calling ? '1.5' : '';
      zi.t.textContent = fmt(ent?.attributes?.current_temperature);
      zi.t.style.fill = disabled ? 'var(--hsc-dim)' : '';
      zi.s.textContent = disabled ? 'OFF' : fmt(ent?.attributes?.temperature);
      zi.s.style.fill = calling ? HEAT : '';
      zi.pv.style.stroke = calling ? HEAT : '';
    }
    for (let k = 0; k < e.bus.length; k++) {
      e.bus[k].style.stroke = callingSegs.has(k) ? HEAT : '';
    }
    e.trunk.style.stroke = anyCalling ? HEAT : '';

    const bufHeat = v(c.buffer.state) === 'Heat';
    e.br.style.stroke = bufHeat ? HEAT : '';
    e.br.style.strokeWidth = bufHeat ? '1.5' : '';
    e.bt.textContent = fmt(v(c.buffer.temp));
    e.bs.textContent = fmt(v(c.buffer.target));

    const dhwHeat = v(c.dhw.state) === 'Heat';
    e.dr.style.stroke = dhwHeat ? HEAT : '';
    e.dr.style.strokeWidth = dhwHeat ? '1.5' : '';
    e.dt.textContent = fmt(v(c.dhw.temp));
    e.ds.textContent = fmt(v(c.dhw.target));

    e.ot.textContent = fmt(v(c.outdoor.entity));
    const outdoor = Number(v(c.outdoor.entity));
    const wwsd = Number(v(c.outdoor.wwsd));
    const aboveWwsd = !isNaN(outdoor) && !isNaN(wwsd) && outdoor >= wwsd;
    e.ob.style.stroke = aboveWwsd ? '' : HEAT;
    const resetOut = Number(v(c.outdoor.reset_outdoor));
    e.ow.textContent = (!isNaN(resetOut) && !isNaN(wwsd)) ? `${fmt(resetOut)} to ${fmt(wwsd)}` : '';

    const recOn = v(c.recirc.entity) === 'on';
    e.rr.style.stroke = recOn ? HEAT : '';
    e.rr.style.strokeWidth = recOn ? '1.5' : '';
    e.rc.style.stroke = recOn ? HEAT : '';
    e.rs.textContent = recOn ? 'ON' : 'OFF';

    const geoOn = v(c.geo.running) === 'on';
    e.gr.style.stroke = geoOn ? HEAT : '';
    e.gr.style.strokeWidth = geoOn ? '1.5' : '';
    e.gh.textContent = fmtD(v(c.geo.heat_of_extraction));
    e.gp.textContent = fmtD(v(c.geo.total_power));
    e.gc.textContent = fmtD(v(c.geo.cop));

    e.pbg.style.stroke = bufHeat ? HEAT : '';
    e.pdg.style.stroke = dhwHeat ? HEAT : '';
  }
}

class HeatingSystemCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = config;
    this._rendered = false;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._render();
    } else {
      this.shadowRoot.querySelectorAll('ha-entity-picker').forEach((p) => {
        p.hass = hass;
      });
    }
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _render() {
    const c = this._config;
    const buf = { ...DEFAULTS.buffer, ...(c.buffer || {}) };
    const dhw = { ...DEFAULTS.dhw, ...(c.dhw || {}) };
    const out = { ...DEFAULTS.outdoor, ...(typeof c.outdoor === 'string' ? { entity: c.outdoor } : c.outdoor || {}) };
    const rec = { ...DEFAULTS.recirc, ...(typeof c.recirc === 'string' ? { entity: c.recirc } : c.recirc || {}) };
    const geo = { ...DEFAULTS.geo, ...(c.geo || {}) };
    const zones = (c.zones && c.zones.length > 0) ? c.zones : DEFAULTS.zones;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
          color: var(--primary-text-color, #212121);
        }
        details {
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        summary {
          padding: 10px 12px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          background: var(--secondary-background-color, #fafafa);
          user-select: none;
        }
        .section { padding: 8px 12px 12px; }
        .field {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .field label {
          min-width: 80px;
          font-size: 13px;
          color: var(--secondary-text-color, #727272);
          flex-shrink: 0;
        }
        .field ha-entity-picker { flex: 1; }
        .field input[type="text"] {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
        }
        .zone-row {
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 8px;
        }
        .zone-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .zone-header span {
          font-size: 13px;
          font-weight: 500;
        }
        .btn {
          padding: 4px 12px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: var(--secondary-background-color, #fafafa);
          color: var(--primary-text-color, #212121);
          font-size: 12px;
          cursor: pointer;
        }
        .btn:hover { background: var(--divider-color, #e0e0e0); }
        .btn-remove {
          border: none;
          background: none;
          color: var(--error-color, #db4437);
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .add-row { margin-top: 4px; }
      </style>

      <details open>
        <summary>Zones</summary>
        <div class="section" id="zones-section"></div>
      </details>

      <details>
        <summary>Buffer Tank</summary>
        <div class="section" id="buffer-section"></div>
      </details>

      <details>
        <summary>DHW Tank</summary>
        <div class="section" id="dhw-section"></div>
      </details>

      <details>
        <summary>Outdoor</summary>
        <div class="section" id="outdoor-section"></div>
      </details>

      <details>
        <summary>Recirc</summary>
        <div class="section" id="recirc-section"></div>
      </details>

      <details>
        <summary>Geothermal</summary>
        <div class="section" id="geo-section"></div>
      </details>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);

    this._buildZones($('zones-section'), zones);
    this._buildGroup($('buffer-section'), 'buffer', buf, [
      ['name', 'Name', 'text'],
      ['temp', 'Temp', 'sensor'],
      ['target', 'Target', 'sensor'],
      ['state', 'State', 'sensor'],
      ['pump', 'Pump', 'binary_sensor'],
    ]);
    this._buildGroup($('dhw-section'), 'dhw', dhw, [
      ['name', 'Name', 'text'],
      ['temp', 'Temp', 'sensor'],
      ['target', 'Target', 'sensor'],
      ['state', 'State', 'sensor'],
      ['pump', 'Pump', 'binary_sensor'],
    ]);
    this._buildGroup($('outdoor-section'), 'outdoor', out, [
      ['name', 'Name', 'text'],
      ['entity', 'Entity', 'sensor'],
    ]);
    this._buildGroup($('outdoor-section'), 'outdoor', out, [
      ['wwsd', 'WWSD', 'sensor'],
      ['reset_outdoor', 'Reset Outdoor', 'sensor'],
    ]);
    this._buildGroup($('recirc-section'), 'recirc', rec, [
      ['name', 'Name', 'text'],
      ['entity', 'Entity', 'switch'],
    ]);
    this._buildGroup($('geo-section'), 'geo', geo, [
      ['name', 'Name', 'text'],
      ['running', 'Running', 'binary_sensor'],
      ['heat_of_extraction', 'HoE', 'sensor'],
      ['total_power', 'Power', 'sensor'],
      ['cop', 'COP', 'sensor'],
    ]);
    this._rendered = true;
  }

  _buildZones(container, zones) {
    zones.forEach((z, i) => {
      const row = document.createElement('div');
      row.className = 'zone-row';

      const header = document.createElement('div');
      header.className = 'zone-header';
      header.innerHTML = `<span>Zone ${i + 1}</span>`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove zone';
      removeBtn.addEventListener('click', () => {
        const updated = [...(this._config.zones || DEFAULTS.zones)];
        updated.splice(i, 1);
        this._config = { ...this._config, zones: updated };
        this._fire();
        this._rendered = false;
        this._render();
      });
      header.appendChild(removeBtn);
      row.appendChild(header);

      const nameField = this._makeTextField('Name', z.name || '', (val) => {
        const updated = [...(this._config.zones || DEFAULTS.zones)];
        updated[i] = { ...updated[i], name: val };
        this._config = { ...this._config, zones: updated };
        this._fire();
      });
      row.appendChild(nameField);

      const entityField = this._makeEntityField('Entity', z.entity || '', ['climate'], (val) => {
        const updated = [...(this._config.zones || DEFAULTS.zones)];
        updated[i] = { ...updated[i], entity: val };
        this._config = { ...this._config, zones: updated };
        this._fire();
      });
      row.appendChild(entityField);

      container.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn add-row';
    addBtn.textContent = '+ Add Zone';
    addBtn.addEventListener('click', () => {
      const updated = [...(this._config.zones || DEFAULTS.zones)];
      updated.push({ entity: '', name: '' });
      this._config = { ...this._config, zones: updated };
      this._fire();
      this._rendered = false;
      this._render();
    });
    container.appendChild(addBtn);
  }

  _buildGroup(container, key, values, fields) {
    for (const [prop, label, type] of fields) {
      if (type === 'text') {
        container.appendChild(this._makeTextField(label, values[prop] || '', (val) => {
          const group = { ...(this._config[key] || {}), [prop]: val };
          this._config = { ...this._config, [key]: group };
          this._fire();
        }));
      } else {
        container.appendChild(this._makeEntityField(label, values[prop] || '', [type], (val) => {
          const group = { ...(this._config[key] || {}), [prop]: val };
          this._config = { ...this._config, [key]: group };
          this._fire();
        }));
      }
    }
  }

  _makeTextField(label, value, onChange) {
    const div = document.createElement('div');
    div.className = 'field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    div.appendChild(lbl);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('change', (ev) => onChange(ev.target.value));
    div.appendChild(input);
    return div;
  }

  _makeEntityField(label, value, domains, onChange) {
    const div = document.createElement('div');
    div.className = 'field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    div.appendChild(lbl);
    const picker = document.createElement('ha-entity-picker');
    picker.hass = this._hass;
    picker.value = value;
    picker.includeDomains = domains;
    picker.allowCustomEntity = true;
    picker.addEventListener('value-changed', (ev) => {
      onChange(ev.detail.value || '');
    });
    div.appendChild(picker);
    return div;
  }
}

customElements.define('heating-system-card-editor', HeatingSystemCardEditor);
customElements.define('heating-system-card', HeatingSystemCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'heating-system-card',
  name: 'Heating System Card',
  description: 'Visual diagram of a hydronic heating system',
});
