const HEAT = '#f5a623';
const GEO_ON = '#2d9cff';

const DEFAULTS = {
  zones: [
    { entity: 'climate.living_room', name: 'LR' },
    { entity: 'climate.bedroom', name: 'Bed' },
    { entity: 'climate.garage', name: 'Garage' },
    { entity: 'climate.downstairs', name: 'Lower' },
    { entity: 'climate.office', name: 'Office' },
  ],
  buffer: {
    temp: 'sensor.aeco_0982_tank',
    target: 'sensor.aeco_0982_tank_target',
    state: 'sensor.aeco_0982_tank_state',
    pump: 'binary_sensor.aeco_0982_pump_1',
    wwsd: 'sensor.aeco_0982_wwsd_temperature',
    min_target: 'sensor.aeco_0982_min_tank_temperature',
    max_target: 'sensor.aeco_0982_max_tank_temperature',
    reset_outdoor: 'sensor.aeco_0982_outdoor_reset_temperature',
  },
  dhw: {
    temp: 'sensor.aeco_0982_dhw_tank',
    target: 'sensor.aeco_0982_dhw_tank_target',
    state: 'sensor.aeco_0982_dhw_tank_state',
    pump: 'binary_sensor.aeco_0982_pump_2',
  },
  outdoor: 'sensor.aeco_0982_outdoor',
  recirc: 'switch.lower_equipment_room_recirculator_pump',
  geo: {
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
      outdoor: config.outdoor || DEFAULTS.outdoor,
      recirc: config.recirc || DEFAULTS.recirc,
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
    const busX1 = Math.min(zp[0].cx, bcx);
    const busX2 = Math.max(zp[n - 1].cx, bcx);

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
          <line id="bus" x1="${busX1}" y1="${busY}" x2="${busX2}" y2="${busY}" class="pipe"/>
          <line id="trunk" x1="${bcx}" y1="${busY}" x2="${bcx}" y2="${r2y}" class="pipe"/>

          <line id="ob" x1="${ox + outW}" y1="${connY}" x2="${bx}" y2="${connY}" class="pipe"/>

          <line id="rc" x1="${dx + dhwW}" y1="${connY}" x2="${rx}" y2="${connY}" class="pipe"/>

          <polyline id="pbg" points="${bcx},${tankBot} ${bcx},${pipeKneeY} ${geL},${pipeKneeY} ${geL},${geoTop}" class="pipe-j"/>
          <polyline id="pdg" points="${dcx},${tankBot} ${dcx},${pipeKneeY} ${geR},${pipeKneeY} ${geR},${geoTop}" class="pipe-j"/>

          <!-- Zone cards -->
          ${zoneCards}

          <!-- Outdoor -->
          <g data-entity="${c.outdoor}" class="click">
            <rect id="or" x="${ox}" y="${sideY}" width="${outW}" height="${outH}" rx="7" class="box"/>
            <text x="${ocx}" y="${sideY + 19}" text-anchor="middle" class="label">OUTDOOR</text>
            <text id="ot" x="${ocx}" y="${sideY + 37}" text-anchor="middle" class="temp-sm">--</text>
            <text id="ow" x="${ocx}" y="${sideY + 50}" text-anchor="middle" class="wwsd"></text>
          </g>

          <!-- Buffer tank -->
          <g data-entity="${c.buffer.state}" class="click">
            <rect id="br" x="${bx}" y="${r2y}" width="${bufW}" height="${bufH}" rx="8" class="box"/>
            <text x="${bcx}" y="${r2y + 19}" text-anchor="middle" class="label">BUFFER</text>
            <text id="bt" x="${bcx}" y="${r2y + 42}" text-anchor="middle" class="temp-lg">--</text>
            <text id="bs" x="${bcx}" y="${r2y + 57}" text-anchor="middle" class="set">--</text>
          </g>

          <!-- DHW tank -->
          <g data-entity="${c.dhw.state}" class="click">
            <rect id="dr" x="${dx}" y="${r2y}" width="${dhwW}" height="${dhwH}" rx="8" class="box"/>
            <text x="${dcx}" y="${r2y + 19}" text-anchor="middle" class="label">DHW</text>
            <text id="dt" x="${dcx}" y="${r2y + 42}" text-anchor="middle" class="temp-lg">--</text>
            <text id="ds" x="${dcx}" y="${r2y + 57}" text-anchor="middle" class="set">--</text>
          </g>

          <!-- Recirc -->
          <g data-entity="${c.recirc}" class="click">
            <rect id="rr" x="${rx}" y="${sideY}" width="${recW}" height="${recH}" rx="7" class="box"/>
            <text x="${rcx}" y="${sideY + 19}" text-anchor="middle" class="label">RECIRC</text>
            <text id="rs" x="${rcx}" y="${sideY + 37}" text-anchor="middle" class="status">OFF</text>
          </g>

          <!-- Geothermal -->
          <g data-entity="${c.geo.running}" class="click">
            <rect id="gr" x="${gx}" y="${geoTop}" width="${geoW}" height="${geoH}" rx="8" class="box"/>
            <text x="${gcx}" y="${geoTop + 19}" text-anchor="middle" class="label">GEOTHERMAL</text>

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
      bus: $('bus'), trunk: $('trunk'),
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
    for (let i = 0; i < c.zones.length; i++) {
      const ent = h.states[c.zones[i].entity];
      const calling = ent?.attributes?.hvac_action === 'heating';
      if (calling) anyCalling = true;

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
    e.bus.style.stroke = anyCalling ? HEAT : '';
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

    e.ot.textContent = fmt(v(c.outdoor));
    const outdoor = Number(v(c.outdoor));
    const wwsd = Number(v(c.buffer.wwsd));
    const aboveWwsd = !isNaN(outdoor) && !isNaN(wwsd) && outdoor >= wwsd;
    e.ob.style.stroke = aboveWwsd ? '' : HEAT;
    const resetOut = Number(v(c.buffer.reset_outdoor));
    e.ow.textContent = (!isNaN(resetOut) && !isNaN(wwsd)) ? `${fmt(resetOut)} to ${fmt(wwsd)}` : '';

    const recOn = v(c.recirc) === 'on';
    e.rr.style.stroke = recOn ? HEAT : '';
    e.rr.style.strokeWidth = recOn ? '1.5' : '';
    e.rc.style.stroke = recOn ? HEAT : '';
    e.rs.textContent = recOn ? 'ON' : 'OFF';
    e.rs.style.fill = recOn ? HEAT : '';

    const geoOn = v(c.geo.running) === 'on';
    e.gr.style.stroke = geoOn ? GEO_ON : '';
    e.gr.style.strokeWidth = geoOn ? '1.5' : '';
    e.gh.textContent = fmtD(v(c.geo.heat_of_extraction));
    e.gp.textContent = fmtD(v(c.geo.total_power));
    e.gc.textContent = fmtD(v(c.geo.cop));

    e.pbg.style.stroke = bufHeat ? HEAT : '';
    e.pdg.style.stroke = dhwHeat ? HEAT : '';
  }
}

customElements.define('heating-system-card', HeatingSystemCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'heating-system-card',
  name: 'Heating System Card',
  description: 'Visual diagram of a hydronic heating system',
});
