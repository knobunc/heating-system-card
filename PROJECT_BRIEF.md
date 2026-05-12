# Heating System Lovelace Card — Project Brief

## Goal

Build a custom Home Assistant Lovelace card as a proper JavaScript/TypeScript
web component, publishable to GitHub and installable via HACS.

## Background

This card was designed in a Claude.ai session. The design is finalized. The
goal now is to implement it as a real custom card rather than a
picture-elements hack with 15 overlay SVGs.

---

## What the card shows

A heating system diagram with three rows:

```
[ LR ] [ Bedroom ] [ Garage ] [ Lower ] [ Office ]

[ Outdoor ] — [ Buffer Tank ]    [ DHW Tank ] — [ Recirc ]

                    [ Geothermal ]
```

### Row 1 — Zone thermostats (5 Ecobee zones)
- Each zone card shows: zone name, current temp, setpoint
- Border turns orange (`#f5a623`) when `hvac_action === 'heating'`
- Setpoint text turns orange when calling, muted when satisfied
- Pipe from each zone card drops down to the buffer tank header line
- Each pipe segment turns orange when that zone is calling

### Row 2 — Tanks
**Buffer tank** (left of center)
- Shows current temp and target temp
- Border turns orange when `sensor.aeco_0982_tank_state === 'Heat'`
- Connected to Outdoor box on its left via a static line
- Outdoor box shows current temp only, no state color

**DHW tank** (right of center)
- Shows current temp and target temp
- Border turns blue (`#2d9cff`) when `sensor.aeco_0982_dhw_tank_state === 'Heat'`
- Connected to Recirc box on its right via a line
- Recirc box border and connector turn green (`#27ae60`) when switch is `on`

### Row 3 — Geothermal
- Always blue border (`#2d9cff`) when `binary_sensor.waterfurnace_water_blower_running === 'on'`
- Shows three sensor values: Heat of Extraction (kW), Total Power (kW), COP
- Two pipe lines drop into it from above: one from buffer (left), one from DHW (right)
- Buffer→Geo pipe turns orange when buffer state is Heat
- DHW→Geo pipe turns blue when DHW state is Heat

---

## Entity IDs

### Zone thermostats
```
climate.living_room
climate.bedroom
climate.garage
climate.downstairs   (displayed as "Lower")
climate.office
```
State driver: `entity.attributes.hvac_action === 'heating'`

### Buffer tank
```
sensor.aeco_0982_tank              # current temp °F
sensor.aeco_0982_tank_target       # setpoint °F
sensor.aeco_0982_tank_state        # 'Heat' or 'Satisfied'
binary_sensor.aeco_0982_pump_1     # buffer circ pump running
```

### DHW tank
```
sensor.aeco_0982_dhw_tank          # current temp °F
sensor.aeco_0982_dhw_tank_target   # setpoint °F
sensor.aeco_0982_dhw_tank_state    # 'Heat' or 'Off'
binary_sensor.aeco_0982_pump_2     # DHW circ pump running
```

### Outdoor
```
sensor.aeco_0982_outdoor           # °F, from HBX ECO-0600 probe
```

### Recirc pump
```
switch.lower_equipment_room_recirculator_pump   # 'on' / 'off'
```

### Geothermal (WaterFurnace via separate integration)
```
sensor.waterfurnace_water_compressor_heat_of_extraction
sensor.waterfurnace_water_heat_pump_total_power_usage
sensor.waterfurnace_water_coefficient_of_power
binary_sensor.waterfurnace_water_blower_running
```

---

## Visual design

Dark theme only (matches HA dark mode):
- Background: `#111318`
- Card surfaces: `#1e2130`
- Borders idle: `#2a3040` at 1px
- Borders active:
  - Heating/calling: `#f5a623` (orange) at 1.5px
  - DHW heating: `#2d9cff` (blue) at 1.5px
  - Recirc running: `#27ae60` (green) at 1.5px
  - Geo running: `#2d9cff` (blue) at 1.5px
- Primary text: `#e0e2ea`
- Muted text: `#6b7590`
- Dimmed text: `#3d4a5c`
- Temp values: 18–24px, weight 600
- Labels: 9px, uppercase, letter-spacing 0.05em
- Corner radius: 7–8px

Pipe colors:
- Idle: `#2a3040`
- Active heat: `#f5a623`
- Active DHW: `#2d9cff`
- Active recirc: `#27ae60`

The diagram is drawn as an inline SVG inside the card's shadow DOM.
Pipes are `<line>` or `<polyline>` elements whose stroke is set reactively.
Box borders are SVG `<rect>` stroke attributes, also set reactively.

---

## Implementation approach

### Card type
Standard Lovelace custom card — a `customElements.define`'d class extending
`HTMLElement`, using a shadow DOM. No framework required; plain JS is fine.
TypeScript is acceptable if preferred.

### Rendering strategy
Single SVG drawn programmatically (or as a tagged template literal).
On each `hass` setter call, update only the stroke/fill attributes that need
to change — do not re-render the full SVG.

### Config schema
The card should accept a YAML config that allows entity IDs to be overridden,
so it's reusable. Suggested schema:

```yaml
type: custom:heating-system-card
zones:
  - entity: climate.living_room
    name: LR
  - entity: climate.bedroom
    name: Bed
  - entity: climate.garage
    name: Garage
  - entity: climate.downstairs
    name: Lower
  - entity: climate.office
    name: Office
buffer:
  temp: sensor.aeco_0982_tank
  target: sensor.aeco_0982_tank_target
  state: sensor.aeco_0982_tank_state
  pump: binary_sensor.aeco_0982_pump_1
dhw:
  temp: sensor.aeco_0982_dhw_tank
  target: sensor.aeco_0982_dhw_tank_target
  state: sensor.aeco_0982_dhw_tank_state
  pump: binary_sensor.aeco_0982_pump_2
outdoor: sensor.aeco_0982_outdoor
recirc: switch.lower_equipment_room_recirculator_pump
geo:
  heat_of_extraction: sensor.waterfurnace_water_compressor_heat_of_extraction
  total_power: sensor.waterfurnace_water_heat_pump_total_power_usage
  cop: sensor.waterfurnace_water_coefficient_of_power
  running: binary_sensor.waterfurnace_water_blower_running
```

### GitHub / HACS structure
```
heating-system-card/
  heating-system-card.js     # built/bundled card file
  src/
    heating-system-card.ts   # (if using TS)
  hacs.json
  README.md
  LICENSE
```

`hacs.json`:
```json
{
  "name": "Heating System Card",
  "render_readme": true
}
```

The card file must self-register:
```js
customElements.define('heating-system-card', HeatingSystemCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'heating-system-card',
  name: 'Heating System Card',
  description: 'Visual diagram of a hydronic heating system'
});
```

### Lovelace resources entry
```yaml
resources:
  - url: /local/heating-system-card/heating-system-card.js
    type: module
```

---

## SVG layout geometry

The SVG viewBox is `0 0 720 460`. All coordinates below are in that space.

### Zone cards (row 1)
Five cards, each 108×62, spaced 36px apart, starting at x=18, y=16:
- LR:      x=18,  center-x=72
- Bedroom: x=162, center-x=216
- Garage:  x=306, center-x=360
- Lower:   x=450, center-x=504
- Office:  x=594, center-x=648

### Zone → Buffer pipes
Each zone drops a vertical line from y=78 to a horizontal header, then the
header runs to x=242 and drops into the buffer top at y=185.
Header y-positions (staggered to avoid overlap):
- Office:  y=108
- Lower:   y=118
- Garage:  y=128
- Bedroom: y=138
- LR:      y=148
Vertical drop from header into buffer: x=242, y=108 → y=185

### Buffer tank
Rect: x=168, y=185, width=148, height=86, rx=8
Center: x=242, y=228

### Outdoor box
Rect: x=52, y=198, width=96, height=54, rx=7
Connects to buffer with horizontal line at y=225

### DHW tank
Rect: x=436, y=185, width=148, height=86, rx=8
Center: x=510, y=228

### Recirc box
Rect: x=602, y=198, width=88, height=54, rx=7
Connects to DHW right edge with horizontal line at y=228

### Buffer → Geo pipe
x=242, y=271 → y=310 → x=352, y=310 → y=335

### DHW → Geo pipe
x=510, y=271 → y=310 → x=408, y=310 → y=335

### Geothermal box
Rect: x=280, y=335, width=240, height=108, rx=8

---

## Notes

- The card is for personal use but should be clean enough to share on HACS
- No need for an editor UI (no `getConfigElement`)
- Temperatures are always °F
- The `hvac_action` attribute on Ecobee climate entities drives zone calling
  state, not the `state` field itself
- `sensor.aeco_0982_tank_state` values are exactly 'Heat' and 'Satisfied'
  (capital H and S)
- `sensor.aeco_0982_dhw_tank_state` values are exactly 'Heat' and 'Off'
- Recirc is a `switch`, so state is lowercase 'on' / 'off'
- `binary_sensor.waterfurnace_water_blower_running` is 'on' / 'off'
