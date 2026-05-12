# Heating System Card

A custom Home Assistant Lovelace card that displays a hydronic heating system diagram with reactive SVG piping.

Shows zone thermostats, buffer tank, DHW tank, outdoor temperature, recirculation pump, and geothermal unit — all with live state-driven colors and click-to-open-more-info.

## Installation

### HACS (recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend** > three-dot menu > **Custom repositories**
3. Add this repo URL with type **Dashboard**
4. Install **Heating System Card**
5. Restart Home Assistant

### Manual

1. Copy `heating-system-card.js` to `config/www/heating-system-card/`
2. Add the resource in **Settings > Dashboards > Resources**:
   ```yaml
   url: /local/heating-system-card/heating-system-card.js
   type: module
   ```
3. Restart Home Assistant

## Configuration

The card includes a visual editor — use the UI to configure zones, entities, and names directly from the dashboard editor. You can also configure via YAML:

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
  name: Buffer
  temp: sensor.aeco_0982_tank
  target: sensor.aeco_0982_tank_target
  state: sensor.aeco_0982_tank_state
  pump: binary_sensor.aeco_0982_pump_1
dhw:
  name: DHW
  temp: sensor.aeco_0982_dhw_tank
  target: sensor.aeco_0982_dhw_tank_target
  state: sensor.aeco_0982_dhw_tank_state
  pump: binary_sensor.aeco_0982_pump_2
outdoor:
  name: Outdoor
  entity: sensor.aeco_0982_outdoor
  wwsd: sensor.aeco_0982_wwsd_temperature
  reset_outdoor: sensor.aeco_0982_outdoor_reset_temperature
recirc:
  name: Recirc
  entity: switch.lower_equipment_room_recirculator_pump
geo:
  name: Geothermal
  heat_of_extraction: sensor.waterfurnace_water_compressor_heat_of_extraction
  total_power: sensor.waterfurnace_water_heat_pump_total_power_usage
  cop: sensor.waterfurnace_water_coefficient_of_power
  running: binary_sensor.waterfurnace_water_blower_running
```

All entity IDs and names above are defaults — you can omit any section to use them, or override individual fields.

Minimal config using all defaults:

```yaml
type: custom:heating-system-card
```

## Features

- **Zone thermostats**: Border, setpoint, and supply pipe turn orange when calling for heat. Only the bus segments between calling zones and the buffer light up. Setpoint shows `OFF` and temperature dims when the thermostat is off (e.g. windows open).
- **Buffer tank**: Border turns orange when tank state is `Heat`. Shows current temp and setpoint.
- **Outdoor reset curve**: The outdoor→buffer connector turns orange when outdoor temp is below the WWSD threshold (reset active). The outdoor box shows the reset range (e.g. `-10° to 55°`).
- **DHW tank**: Border turns orange when tank state is `Heat`. Shows current temp and setpoint.
- **Recirc pump**: Border and connector turn orange when the switch is on.
- **Geothermal**: Border turns orange when the blower is running. Shows Heat of Extraction (kW), Total Power (kW), and COP.
- **Configurable names**: Every box label (zones, buffer, DHW, outdoor, recirc, geothermal) can be renamed via the `name` field in config.
- **Dynamic zone count**: Add or remove zones in config — the layout adjusts automatically.
- **Visual editor**: Configure zones, entities, and names from the HA dashboard UI — no YAML required.
- **Click any box** to open the Home Assistant more-info dialog for that entity.
- **Theme-aware**: Text, borders, and surfaces inherit from HA theme CSS custom properties (`--primary-text-color`, `--secondary-text-color`, `--disabled-text-color`, `--card-background-color`, `--divider-color`). Override `--hsc-*` variables for fine-grained control.

## License

MIT
