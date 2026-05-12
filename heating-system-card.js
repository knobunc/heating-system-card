const IDLE = '#2a3040';
const HEAT = '#f5a623';
const DHW_ACTIVE = '#2d9cff';
const RECIRC_ON = '#27ae60';
const GEO_ON = '#2d9cff';
const SURFACE = '#1e2130';
const BG = '#111318';
const TEXT = '#e0e2ea';
const MUTED = '#6b7590';
const DIM = '#3d4a5c';

const ZONES = [
  { x: 18, cx: 72, hy: 148 },
  { x: 162, cx: 216, hy: 138 },
  { x: 306, cx: 360, hy: 128 },
  { x: 450, cx: 504, hy: 118 },
  { x: 594, cx: 648, hy: 108 },
];

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
      zones: DEFAULTS.zones.map((d, i) => ({ ...d, ...(cz[i] || {}) })),
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

    let zoneCards = '';
    let zonePipes = '';
    for (let i = 0; i < 5; i++) {
      const z = ZONES[i];
      const name = c.zones[i].name;
      const entity = c.zones[i].entity;

      zoneCards += `
        <g data-entity="${entity}" class="click">
          <rect id="zr${i}" x="${z.x}" y="16" width="108" height="62" rx="7"
                fill="${SURFACE}" stroke="${IDLE}" stroke-width="1"/>
          <text x="${z.cx}" y="35" text-anchor="middle" class="label">${name}</text>
          <text id="zt${i}" x="${z.cx}" y="55" text-anchor="middle" class="temp">--</text>
          <text id="zs${i}" x="${z.cx}" y="70" text-anchor="middle" class="set">--</text>
        </g>`;

      zonePipes += `
        <line id="zpv${i}" x1="${z.cx}" y1="78" x2="${z.cx}" y2="${z.hy}"
              stroke="${IDLE}" stroke-width="2.5" stroke-linecap="round"/>
        <line id="zph${i}" x1="${z.cx}" y1="${z.hy}" x2="242" y2="${z.hy}"
              stroke="${IDLE}" stroke-width="2.5" stroke-linecap="round"/>`;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { background: ${BG}; overflow: hidden; }
        svg {
          width: 100%; display: block;
          font-family: 'Segoe UI', Roboto, sans-serif;
        }
        .label {
          font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.05em; fill: ${MUTED};
        }
        .temp { font-size: 22px; font-weight: 600; fill: ${TEXT}; }
        .temp-lg { font-size: 20px; font-weight: 600; fill: ${TEXT}; }
        .temp-sm { font-size: 18px; font-weight: 600; fill: ${TEXT}; }
        .set { font-size: 11px; fill: ${MUTED}; }
        .val { font-size: 14px; font-weight: 600; fill: ${TEXT}; }
        .sub {
          font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.05em; fill: ${MUTED};
        }
        .unit { font-size: 9px; fill: ${MUTED}; }
        .click { cursor: pointer; }
      </style>
      <ha-card>
        <svg viewBox="0 0 720 460" xmlns="http://www.w3.org/2000/svg">

          <!-- Pipes (behind boxes) -->
          ${zonePipes}
          <line id="trunk" x1="242" y1="108" x2="242" y2="185"
                stroke="${IDLE}" stroke-width="2.5" stroke-linecap="round"/>

          <line id="ob" x1="148" y1="225" x2="168" y2="225"
                stroke="${IDLE}" stroke-width="2.5" stroke-linecap="round"/>

          <line id="rc" x1="584" y1="225" x2="602" y2="225"
                stroke="${IDLE}" stroke-width="2.5" stroke-linecap="round"/>

          <polyline id="pbg" points="242,271 242,310 352,310 352,335"
                    fill="none" stroke="${IDLE}" stroke-width="2.5"
                    stroke-linejoin="round" stroke-linecap="round"/>
          <polyline id="pdg" points="510,271 510,310 408,310 408,335"
                    fill="none" stroke="${IDLE}" stroke-width="2.5"
                    stroke-linejoin="round" stroke-linecap="round"/>

          <!-- Zone cards -->
          ${zoneCards}

          <!-- Outdoor -->
          <g data-entity="${c.outdoor}" class="click">
            <rect id="or" x="52" y="198" width="96" height="54" rx="7"
                  fill="${SURFACE}" stroke="${IDLE}" stroke-width="1"/>
            <text x="100" y="214" text-anchor="middle" class="label">OUTDOOR</text>
            <text id="ot" x="100" y="235" text-anchor="middle" class="temp-sm">--</text>
            <text id="ow" x="100" y="248" text-anchor="middle"
                  style="font-size:8px;letter-spacing:0.05em;fill:${DIM}"></text>
          </g>

          <!-- Buffer tank -->
          <g data-entity="${c.buffer.state}" class="click">
            <rect id="br" x="168" y="185" width="148" height="86" rx="8"
                  fill="${SURFACE}" stroke="${IDLE}" stroke-width="1"/>
            <text x="242" y="206" text-anchor="middle" class="label">BUFFER</text>
            <text id="bt" x="242" y="234" text-anchor="middle" class="temp-lg">--</text>
            <text id="bs" x="242" y="256" text-anchor="middle" class="set">--</text>
          </g>

          <!-- DHW tank -->
          <g data-entity="${c.dhw.state}" class="click">
            <rect id="dr" x="436" y="185" width="148" height="86" rx="8"
                  fill="${SURFACE}" stroke="${IDLE}" stroke-width="1"/>
            <text x="510" y="206" text-anchor="middle" class="label">DHW</text>
            <text id="dt" x="510" y="234" text-anchor="middle" class="temp-lg">--</text>
            <text id="ds" x="510" y="256" text-anchor="middle" class="set">--</text>
          </g>

          <!-- Recirc -->
          <g data-entity="${c.recirc}" class="click">
            <rect id="rr" x="602" y="198" width="88" height="54" rx="7"
                  fill="${SURFACE}" stroke="${IDLE}" stroke-width="1"/>
            <text x="646" y="217" text-anchor="middle" class="label">RECIRC</text>
            <text id="rs" x="646" y="240" text-anchor="middle"
                  style="font-size:11px;font-weight:600;fill:${DIM}">OFF</text>
          </g>

          <!-- Geothermal -->
          <g data-entity="${c.geo.running}" class="click">
            <rect id="gr" x="280" y="335" width="240" height="108" rx="8"
                  fill="${SURFACE}" stroke="${IDLE}" stroke-width="1"/>
            <text x="400" y="358" text-anchor="middle" class="label">GEOTHERMAL</text>

            <text x="330" y="390" text-anchor="middle" class="sub">HoE</text>
            <text id="gh" x="330" y="412" text-anchor="middle" class="val">--</text>
            <text x="330" y="428" text-anchor="middle" class="unit">kW</text>

            <text x="400" y="390" text-anchor="middle" class="sub">POWER</text>
            <text id="gp" x="400" y="412" text-anchor="middle" class="val">--</text>
            <text x="400" y="428" text-anchor="middle" class="unit">kW</text>

            <text x="470" y="390" text-anchor="middle" class="sub">COP</text>
            <text id="gc" x="470" y="412" text-anchor="middle" class="val">--</text>
          </g>

        </svg>
      </ha-card>`;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._el = {
      z: Array.from({ length: 5 }, (_, i) => ({
        r: $(`zr${i}`), t: $(`zt${i}`), s: $(`zs${i}`),
        pv: $(`zpv${i}`), ph: $(`zph${i}`),
      })),
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
    for (let i = 0; i < 5; i++) {
      const ent = h.states[c.zones[i].entity];
      const calling = ent?.attributes?.hvac_action === 'heating';
      if (calling) anyCalling = true;

      const disabled = ent?.state === 'off';
      const zi = e.z[i];
      zi.r.setAttribute('stroke', calling ? HEAT : IDLE);
      zi.r.setAttribute('stroke-width', calling ? '1.5' : '1');
      zi.t.textContent = fmt(ent?.attributes?.current_temperature);
      zi.t.style.fill = disabled ? DIM : TEXT;
      zi.s.textContent = fmt(ent?.attributes?.temperature);
      zi.s.style.fill = calling ? HEAT : MUTED;
      zi.pv.setAttribute('stroke', calling ? HEAT : IDLE);
      zi.ph.setAttribute('stroke', calling ? HEAT : IDLE);
    }
    e.trunk.setAttribute('stroke', anyCalling ? HEAT : IDLE);

    const bufHeat = v(c.buffer.state) === 'Heat';
    e.br.setAttribute('stroke', bufHeat ? HEAT : IDLE);
    e.br.setAttribute('stroke-width', bufHeat ? '1.5' : '1');
    e.bt.textContent = fmt(v(c.buffer.temp));
    e.bs.textContent = `SET ${fmt(v(c.buffer.target))}`;

    const dhwHeat = v(c.dhw.state) === 'Heat';
    e.dr.setAttribute('stroke', dhwHeat ? DHW_ACTIVE : IDLE);
    e.dr.setAttribute('stroke-width', dhwHeat ? '1.5' : '1');
    e.dt.textContent = fmt(v(c.dhw.temp));
    e.ds.textContent = `SET ${fmt(v(c.dhw.target))}`;

    e.ot.textContent = fmt(v(c.outdoor));
    const outdoor = Number(v(c.outdoor));
    const wwsd = Number(v(c.buffer.wwsd));
    const aboveWwsd = !isNaN(outdoor) && !isNaN(wwsd) && outdoor >= wwsd;
    e.ob.setAttribute('stroke', aboveWwsd ? IDLE : HEAT);
    e.or.setAttribute('stroke', aboveWwsd ? DIM : IDLE);
    if (aboveWwsd) {
      e.ow.textContent = 'WWSD';
      e.ow.style.fill = DIM;
    } else if (!isNaN(wwsd)) {
      e.ow.textContent = `WWSD ${fmt(wwsd)}`;
      e.ow.style.fill = DIM;
    } else {
      e.ow.textContent = '';
    }

    const recOn = v(c.recirc) === 'on';
    e.rr.setAttribute('stroke', recOn ? RECIRC_ON : IDLE);
    e.rr.setAttribute('stroke-width', recOn ? '1.5' : '1');
    e.rc.setAttribute('stroke', recOn ? RECIRC_ON : IDLE);
    e.rs.textContent = recOn ? 'ON' : 'OFF';
    e.rs.style.fill = recOn ? RECIRC_ON : DIM;

    const geoOn = v(c.geo.running) === 'on';
    e.gr.setAttribute('stroke', geoOn ? GEO_ON : IDLE);
    e.gr.setAttribute('stroke-width', geoOn ? '1.5' : '1');
    e.gh.textContent = fmtD(v(c.geo.heat_of_extraction));
    e.gp.textContent = fmtD(v(c.geo.total_power));
    e.gc.textContent = fmtD(v(c.geo.cop));

    e.pbg.setAttribute('stroke', bufHeat ? HEAT : IDLE);
    e.pdg.setAttribute('stroke', dhwHeat ? DHW_ACTIVE : IDLE);
  }
}

customElements.define('heating-system-card', HeatingSystemCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'heating-system-card',
  name: 'Heating System Card',
  description: 'Visual diagram of a hydronic heating system',
});
