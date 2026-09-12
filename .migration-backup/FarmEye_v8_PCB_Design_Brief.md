# FarmEye v8 — PCB Design Brief for flux.ai

## 1. Project Identity

| Field | Value |
|---|---|
| Product name | FarmEye Industrial Controller v8 |
| Brand owner | Nexiot Labs |
| Target use | Poultry (Layer/Broiler) farm automation controller |
| MCU | ESP32-WROOM-32 DevKit V1 (38-pin) |
| PCB constraints | Cost-optimized; 2-layer acceptable if required; max 120 mm × 100 mm |
| Environment | Indoor farm control panel; wall-mounted enclosure |

## 2. Power Requirements

| Input | Details |
|---|---|
| Primary | 220 V AC (farm mains) |
| MCU rail | 5 V DC / ≥ 2 A via switching regulator or quality buck |
| Relay coils | 5 V DC, active-LOW, opto-isolated 8-channel relay module |
| Sensor rails | 5 V / 3.3 V as required by sensor (see sensor list) |
| Protection | Fuse on mains/L side; reverse polarity on DC barrel; TVS on inputs |

## 3. GPIO / Pin Map — v8 (Mass-deployed Stable)

### 8-channel relay outputs (active LOW)

| Channel | GPIO | Function | Constant name |
|---|---|---|---|
| IN1 | GPIO 25 | Fan / Exhaust | FAN_RELAY_PIN |
| IN2 | GPIO 26 | Light | LIGHT_RELAY_PIN |
| IN3 | GPIO 27 | Fogger / Cooler | FOGGER_RELAY_PIN |
| IN4 | GPIO 14 | Heater | HEATER_RELAY_PIN |
| IN5 | GPIO 12 | Curtain Up | CURTAIN_UP |
| IN6 | GPIO 13 | Curtain Down | CURTAIN_DOWN |
| IN7 | GPIO 15 | Alarm / Siren | ALARM_RELAY_PIN |
| IN8 | GPIO 33 | Circulation fan | CIRCULATION_RELAY_PIN |

### Sensors (v8)

| Sensor | Pin | Notes |
|---|---|---|
| DHT22 #1 (Temp/Humidity) | GPIO 4 | Digital one-wire |
| DHT22 #2 (Backup) | GPIO 16 | Digital one-wire |
| MQ-137 (Ammonia) | GPIO 34 (analog) | ADC1_CH6 |
| ZMPT101B (AC voltage) | GPIO 35 (analog) | ADC1_CH7 |
| Water flow sensor | GPIO 32 | Pulse input |
| LDR (Light) | GPIO 39 (analog) | ADC1_CH3 |
| Manual override switch | GPIO 23 | INPUT_PULLUP |
| Status LED | GPIO 2 | Onboard LED (optional external indicator) |

### Fixed communication pins

| Function | Pin | Notes |
|---|---|---|
| UART0 / USB Serial | GPIO 1 (TX), GPIO 3 (RX) | Flashing / debug only |
| I2C | Not used in v8 | DHT22 is digital one-wire; no I2C sensors |

## 4. Connector / Silkscreen Plan

| Connector | Label | Count | Notes |
|---|---|---|---|
| J1 | AC 220 V IN | 1 | Fuse-protected screw terminal |
| J2 | RELAY IN1–IN4 | 1 | 4-channel block: Fan, Light, Fogger, Heater |
| J3 | RELAY IN5–IN8 | 1 | 4-channel block: Curtain Up, Curtain Down, Alarm, Circulation |
| J4 | DHT22 #1 | 1 | 3-pin header: VCC, DATA, GND |
| J5 | DHT22 #2 | 1 | 3-pin header: VCC, DATA, GND |
| J6 | MQ-137 NH3 | 1 | 3-pin: VCC, AO, GND |
| J7 | ZMPT101B AC | 1 | 3-pin: VCC, AO, GND |
| J8 | Water flow | 1 | 3-pin: VCC, Pulse, GND |
| J9 | LDR | 1 | 3-pin: VCC, AO, GND |
| J10 | Manual override | 1 | 2-pin screw terminal or push button |
| J11 | Status LED | 1 | 2-pin header with current-limit resistor |
| J12 | USB / Program | 1 | USB-C or micro-USB breakout for ESP32 DevKit |
| J13 | 5 V DC out | 1 | For external sensors / relay module VCC |
| J14 | 3.3 V DC out | 1 | For sensors that need 3.3 V |

## 5. Safety & Layout Rules

1. Keep all 220 V AC traces on the bottom layer and away from signal headers.
2. Relay NO/COM/NC screw terminals must be separated from low-voltage side by ≥ 3 mm creepage.
3. Add a fuse holder (5×20 mm) and a clear label: “220 V AC — fuse 5 A”.
4. Add a green/red status LED and a small buzzer footprint next to the alarm relay (optional).
5. Silkscreen must show both Bengali and English labels for each terminal.
6. Provide a clear “ESP32 v8” revision text on the copper/silk layer.
7. Mounting holes: 4× M3, corner placed, electrically isolated.

## 6. flux.ai Prompt — Copy & Paste

Use this block directly on https://www.flux.ai as the design prompt:

```text
Design a 2-layer PCB for an ESP32-WROOM-32 DevKit V1 poultry farm automation controller.

MCU: ESP32-WROOM-32 DevKit V1 (38-pin header, 0.1" pitch).

8-channel relay outputs (active LOW, 5 V coil, opto-isolated):
- IN1 / FAN_EXHAUST -> GPIO25
- IN2 / LIGHT -> GPIO26
- IN3 / FOGGER -> GPIO27
- IN4 / HEATER -> GPIO14
- IN5 / CURTAIN_UP -> GPIO12
- IN6 / CURTAIN_DOWN -> GPIO13
- IN7 / ALARM -> GPIO15
- IN8 / CIRCULATION -> GPIO33

Sensors and inputs:
- DHT22 #1 temp/humidity -> DATA=GPIO4
- DHT22 #2 backup -> DATA=GPIO16
- MQ-137 ammonia analog -> AO=GPIO34
- ZMPT101B AC voltage analog -> AO=GPIO35
- Water flow pulse -> GPIO32
- LDR light analog -> GPIO39
- Manual override switch -> GPIO23 (INPUT_PULLUP)
- Status LED -> GPIO2

Power:
- 220 V AC input, fused 5 A
- 5 V DC / 2 A switching regulator for MCU and relay module
- 3.3 V LDO for sensor power
- Reverse-polarity protection on DC input

Layout rules:
- Board size: maximum 120 mm × 100 mm
- 2-layer, cost optimized
- All high-voltage traces on bottom layer, kept away from low-voltage signal headers
- Minimum 3 mm creepage between AC relay terminals and low-voltage copper
- Screw terminals for relay outputs (NO/COM/NC)
- 4× M3 mounting holes in corners
- Silkscreen labels in English and Bengali
- Clear silkscreen: "FarmEye v8" and "Nexiot Labs"

Deliverables:
- Gerber files
- Drill file
- Bill of Materials (BOM)
- Pick and place file
- 3D render
```

## 7. Outputs to Request from flux.ai

- `gerber.zip` — all layers, drill, outline, solder mask, silkscreen
- `NC_drill.drl` — plated and non-plated holes
- `BOM.xlsx` — components with manufacturer part numbers
- `PickAndPlace.csv` — centroid file for SMD assembly (if any)
- `3D.step` or rendered PNG — for mechanical fit check

## 8. After PCB Fabrication Checklist

- [ ] Compare every GPIO in the final copper layout against `public/esp32-industrial.ino` (v8 firmware).
- [ ] Verify `src/pages/PinMapPage.tsx` still shows v8 labels as printed on the board.
- [ ] Flash v8 firmware and read the boot banner: `INDUSTRIAL CONTROLLER v8`.
- [ ] Toggle each relay from the FarmEye app and confirm the correct physical load responds.
- [ ] Test all sensors (DHT22, MQ-137, ZMPT101B, water flow, LDR) and confirm readings appear in the dashboard.
- [ ] Run a 24-hour burn-in test before farm deployment.

---

Prepared for Nexiot Labs. For questions, refer to the v8 firmware source `public/esp32-industrial.ino` and the in-app Pin Map page `/pin-map`.
