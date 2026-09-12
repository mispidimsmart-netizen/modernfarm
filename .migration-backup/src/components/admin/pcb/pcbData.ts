// Source-of-truth PCB data (matches public/esp32-industrial.ino v8.2 + memory).
export const PROJECT = {
  name: 'FarmEye Industrial Controller',
  version: 'PCB Rev 1.0  /  Firmware v8.2',
  vendor: 'Nexiot Labs',
  productCode: 'FE-CTRL-8CH-V1',
  enclosure: 'IP66 ABS, 300 × 200 × 130 mm, wall-mount, transparent lid',
};

export const GPIO_MAP: Array<[string, string, string, string]> = [
  // GPIO, Function, Direction, Notes
  ['GPIO 25', 'Relay IN1 — Exhaust Fan', 'OUT', 'Active LOW, opto-isolated'],
  ['GPIO 26', 'Relay IN2 — Ceiling Fan', 'OUT', 'Active LOW'],
  ['GPIO 27', 'Relay IN3 — Light', 'OUT', 'Active LOW'],
  ['GPIO 14', 'Relay IN4 — Heater', 'OUT', 'Active LOW, contactor for >1kW'],
  ['GPIO 12', 'Relay IN5 — Fogger', 'OUT', 'Active LOW (avoid pull-up at boot)'],
  ['GPIO 13', 'Relay IN6 — Alarm/Siren', 'OUT', 'Active LOW'],
  ['GPIO 15', 'Relay IN7 — Sprinkler', 'OUT', 'Active LOW (boot strap pin – 10k pull-down)'],
  ['GPIO 33', 'Relay IN8 — Circulation Fan', 'OUT', 'Active LOW'],
  ['GPIO 4',  'DHT22 #1 (Inside)', 'IN/OUT', '4.7k pull-up to 3V3'],
  ['GPIO 16', 'DHT22 #2 (Outside)', 'IN/OUT', '10k pull-up to 3V3 (RX2 reused)'],
  ['GPIO 34', 'MQ-137 NH3 sensor', 'ADC IN', 'ADC1_CH6, input only'],
  ['GPIO 35', 'ZMPT101B AC voltage', 'ADC IN', 'ADC1_CH7, input only'],
  ['GPIO 36 / VP', 'LDR (light)', 'ADC IN', 'ADC1_CH0, optional'],
  ['GPIO 18', 'YF-S201 water flow', 'IN (pulse)', 'Hardware ISR, 10k pull-up'],
  ['GPIO 32', 'Manual Override Button', 'IN', 'Internal pull-up, debounce 50 ms'],
  ['GPIO 2',  'Status LED (on-board)', 'OUT', 'Heartbeat / fault code'],
  ['GPIO 23', 'SIM800L TX (ESP RX)', 'IN', '3.3V logic, level OK'],
  ['GPIO 19', 'SIM800L RX (ESP TX)', 'OUT', 'Use 1k+2k divider to 2.8V'],
  ['GPIO 5',  'SIM800L RST', 'OUT', 'Active LOW reset pulse'],
  ['EN', 'Reset button', 'IN', '10k pull-up + 100nF to GND'],
  ['3V3 / GND / VIN (5V)', 'Power rails', '—', '1000 µF on VIN, 100 nF near ESP'],
  ['GPIO 0, 6-11, 16(if WROVER), 17(if WROVER)', 'RESERVED — DO NOT USE', '—', 'Boot strap / SPI flash'],
];

export const BOM: Array<{ ref: string; qty: number; part: string; spec: string; package: string; notes: string }> = [
  // ---- Brain ----
  { ref: 'U1', qty: 1, part: 'ESP32-WROOM-32 DevKit V1 (38-pin)', spec: 'Dual-core 240 MHz, 4 MB flash, Wi-Fi+BT', package: '38-pin DIP socket', notes: 'WROVER variant FORBIDDEN (PSRAM uses GPIO16/17)' },
  { ref: 'U2', qty: 1, part: 'SIM800L GSM module (with antenna)', spec: 'Quad-band 2G, 850/900/1800/1900', package: 'Module + IPEX antenna', notes: 'Needs separate 4.2V/2A buffered supply' },
  // ---- Power ----
  { ref: 'PS1', qty: 1, part: '12V / 3A SMPS adapter (Mean Well RS-15-12 or eqv.)', spec: 'AC 100-240V → DC 12V 3A, ≥36W', package: 'PCB-mount or DIN', notes: 'Powers ESP, relays, contactor coils' },
  { ref: 'PS2', qty: 1, part: 'LM2596 / MP1584 buck converter', spec: '12V → 5V 2A adjustable', package: 'Module', notes: 'Feeds ESP32 VIN' },
  { ref: 'PS3', qty: 1, part: 'TP4056 + 18650 holder OR 4.2V LDO', spec: '4.2V 2A continuous, 4.7A burst', package: 'Module + battery', notes: 'Dedicated for SIM800L (DO NOT share with ESP)' },
  { ref: 'C1',  qty: 1, part: 'Electrolytic capacitor', spec: '1000 µF / 25V, 105°C', package: 'Radial 10×16', notes: 'Across VIN/GND, near ESP' },
  { ref: 'C2',  qty: 1, part: 'Electrolytic capacitor', spec: '470 µF / 6.3V low-ESR', package: 'Radial 8×12', notes: 'Across SIM800L VCC' },
  { ref: 'C3-C10', qty: 8, part: 'Ceramic capacitor', spec: '100 nF / 50V X7R', package: '0805 / through-hole', notes: 'Decoupling on each IC + each DHT22' },
  // ---- Switching ----
  { ref: 'K1',  qty: 1, part: '8-Channel Relay Module (SRD-05VDC-SL-C)', spec: '10A @ 250VAC per channel, opto-isolated, JD-VCC jumper', package: '138 × 56 mm board', notes: 'Active-LOW. JD-VCC → 12V+, VCC → 5V (jumper REMOVED)' },
  { ref: 'KM1', qty: 1, part: 'CJX2-1210 AC contactor', spec: '12A, 220VAC coil OR 24VDC coil', package: 'DIN-rail', notes: 'For heater loads >1000 W' },
  { ref: 'F1',  qty: 1, part: 'Mains fuse holder + 10A fuse', spec: '10A 250VAC slow-blow', package: 'PCB-mount or panel', notes: 'L line input' },
  { ref: 'F2-F9', qty: 8, part: 'Per-channel fuse', spec: '5A 250VAC fast-blow', package: 'PCB clip', notes: 'One per relay output' },
  { ref: 'MOV1', qty: 1, part: 'Metal-oxide varistor', spec: '275V AC, 10mm', package: 'Radial', notes: 'Across L-N at mains input (surge protection)' },
  { ref: 'D1-D8', qty: 8, part: 'Flyback diode', spec: '1N4007', package: 'DO-41', notes: 'Across each contactor coil / DC valve' },
  // ---- Sensors ----
  { ref: 'S1',  qty: 1, part: 'DHT22 / AM2302 — Inside zone', spec: '−40 to +80°C, 0-100% RH, ±0.5°C', package: '4-pin probe', notes: '4.7 kΩ pull-up DATA→3V3, 1m shielded cable max' },
  { ref: 'S2',  qty: 1, part: 'DHT22 / AM2302 — Outside zone', spec: 'Same as S1', package: '4-pin probe', notes: '10 kΩ pull-up (longer cable tolerated)' },
  { ref: 'S3',  qty: 1, part: 'MQ-137 ammonia (NH3) sensor', spec: '5-500 ppm range, analog out', package: 'Module with heater', notes: 'Needs 5V heater. Allow 24h burn-in.' },
  { ref: 'S4',  qty: 1, part: 'YF-S201 water-flow sensor', spec: '1-30 L/min, Hall-effect pulse', package: 'G1/2" inline', notes: '7.5 pulses per litre. Pull-up 10k.' },
  { ref: 'S5',  qty: 1, part: 'ZMPT101B AC voltage sensor', spec: '0-250 VAC, isolated, analog', package: 'Module', notes: 'Mains presence detection only' },
  { ref: 'S6',  qty: 1, part: 'LDR with 10k divider', spec: 'GL5528 + 10k', package: 'PCB / probe', notes: 'Optional — smart lighting' },
  // ---- Protection / Isolation ----
  { ref: 'OK1', qty: 1, part: 'Opto-isolator (extra)', spec: 'PC817, on Manual-Override input', package: 'DIP-4', notes: 'Protects GPIO32 from field wiring' },
  { ref: 'TVS1', qty: 1, part: 'TVS diode array', spec: 'SP3051 or 5V SMAJ5.0CA', package: 'SMA / SMD', notes: 'On ADC inputs (MQ-137, ZMPT)' },
  { ref: 'PTC1', qty: 1, part: 'Resettable fuse on 5V rail', spec: '0.5A PPTC', package: 'Radial', notes: 'Protects ESP from sensor short' },
  // ---- Mechanical ----
  { ref: 'J1',  qty: 1, part: 'Mains terminal block', spec: '3-pos 5.08mm, 16A', package: 'PCB-mount', notes: 'L / N / PE' },
  { ref: 'J2',  qty: 8, part: 'Output terminal block', spec: '3-pos 5.08mm, 10A', package: 'PCB-mount', notes: 'NO / COM / NC per relay' },
  { ref: 'J3',  qty: 6, part: 'Sensor connector', spec: 'JST-XH 4-pin', package: 'PCB-mount', notes: 'Keyed to prevent miswiring' },
  { ref: 'SW1', qty: 1, part: 'Manual override push-button', spec: '12mm IP67, momentary, RED', package: 'Panel-mount', notes: 'Wired through OK1' },
  { ref: 'LED1-3', qty: 3, part: 'Panel indicators', spec: 'GREEN (Power), BLUE (Wi-Fi), RED (Fault)', package: '8mm 12V LED', notes: 'Driven via 1k resistor + transistor' },
  { ref: 'BZ1', qty: 1, part: 'Active buzzer', spec: '12V 90 dB', package: 'Panel-mount', notes: 'Driven from Alarm relay' },
  { ref: 'ENC1', qty: 1, part: 'Enclosure', spec: 'IP66 ABS, 300 × 200 × 130 mm, transparent lid, vent grilles with mesh', package: '—', notes: 'Wall-mount with 4× M4 standoffs for PCB' },
  { ref: 'DIN1', qty: 1, part: 'DIN rail (35 mm) inside enclosure', spec: '150 mm length', package: '—', notes: 'For contactor & SMPS' },
  { ref: 'PG1', qty: 6, part: 'Cable glands PG-9 / PG-13.5', spec: 'IP68', package: '—', notes: 'For sensor + load cables' },
  // ---- Sensor accuracy & EMI filtering ----
  { ref: 'FB1-FB2', qty: 2, part: 'Ferrite bead', spec: '600Ω @ 100 MHz, 1A', package: 'Through-hole / clip-on', notes: 'On each DHT22 DATA line — kills EMI from long shielded cable' },
  { ref: 'NTC1', qty: 1, part: 'NTC inrush thermistor', spec: '5Ω 1A (B57236S)', package: 'Radial', notes: 'Series with MQ-137 heater VCC — limits 5V rail spike at heater turn-on' },
  { ref: 'RC1-RC2', qty: 2, part: 'RC low-pass filter (10kΩ + 100nF)', spec: 'fc ≈ 160 Hz', package: '0805 / through-hole', notes: 'Between MQ-137 AOUT→GPIO34 and ZMPT→GPIO35 — smooths ADC, reduces false alarms' },
  // ---- ESP32 brown-out / restart prevention ----
  { ref: 'C11', qty: 1, part: 'Tantalum capacitor', spec: '100 µF / 10V, low-ESR', package: 'SMD-D / radial', notes: 'Parallel to C1 near ESP VIN — fast transient response (electrolytics are slow)' },
  { ref: 'L1', qty: 1, part: 'Power inductor', spec: '10 µH 2A, shielded', package: 'Through-hole', notes: 'LC filter on PS2 5V output: PS2 → L1 → C12 → ESP — kills buck converter ripple' },
  { ref: 'C12', qty: 1, part: 'Electrolytic capacitor', spec: '470 µF / 10V low-ESR', package: 'Radial 8×12', notes: 'After L1 — final 5V smoothing before ESP' },
  // ---- Voltage fault & power quality ----
  { ref: 'GDT1', qty: 1, part: 'Gas Discharge Tube', spec: '350V, 3-electrode, 5kA', package: 'Radial', notes: 'BEFORE MOV1 on L-N-PE — first stage lightning protection (handles 5kA, MOV handles aftermath)' },
  { ref: 'SC1', qty: 1, part: 'Supercapacitor + diode', spec: '1F 5.5V + 1N5817 schottky', package: 'Radial', notes: 'Across ESP VIN via diode — gives 3-5s ride-through on power loss for safe state save' },
  { ref: 'RD1', qty: 1, part: '12V rail voltage divider', spec: '100kΩ + 33kΩ, 1% metal-film', package: '0805 / through-hole', notes: '12V → GPIO 39 (ADC) — firmware monitors rail health, alerts on droop <11V' },
  { ref: 'Q1', qty: 1, part: 'Reverse-polarity protection', spec: 'IRF4905 P-MOSFET OR SS54 schottky 5A', package: 'TO-220 / SMA', notes: 'In series with 12V input — prevents damage if installer swaps + and −' },
  // ---- EMC / Relay arcing suppression ----
  { ref: 'SN1-SN8', qty: 8, part: 'RC snubber network', spec: '100Ω 1W + 100nF X2 275VAC', package: 'Through-hole', notes: 'Across each relay NO-COM contact — suppresses arc, extends contact life 5×, kills EMI from inductive loads (motors/contactors)' },
  // ---- Thermal management ----
  { ref: 'FAN1', qty: 1, part: 'Enclosure cooling fan', spec: '40×40×10 mm, 12V, ball-bearing, ≥6000h MTBF', package: 'Panel-mount with grille+filter', notes: 'Mounted on enclosure side with intake filter; runs continuously OR thermostat-controlled' },
  { ref: 'TC1', qty: 1, part: 'Thermal cutout switch', spec: '75°C NC bimetallic, 10A', package: 'KSD9700 surface-mount', notes: 'Inside enclosure on heatsink — opens main 12V if box overheats (last-resort safety)' },
  { ref: 'CC1', qty: 1, part: 'Conformal coating spray', spec: 'HumiSeal 1B73 acrylic OR MG Chemicals 422B', package: '340g aerosol', notes: 'Spray entire PCB after assembly — protects from poultry shed humidity, ammonia (NH3), dust' },
];

export const POWER_TREE = [
  '230 VAC mains → GDT1 (gas tube) → 10A fuse F1 → MOV1 (surge) → SMPS PS1 (12 V / 3 A)',
  '12 V rail  → Q1 (reverse-polarity protect) → RD1 divider → GPIO 39 (rail monitor)',
  '12 V rail  → JD-VCC of K1 (relay coils, opto-isolated side)',
  '12 V rail  → Buck PS2 → L1+C12 (LC filter) → 5 V rail → ESP32 VIN, MQ-137 heater (via NTC1), sensor pull-ups',
  '12 V rail  → Buck/LDO PS3 → 4.2 V buffered (470 µF C2) → SIM800L VBAT',
  '5 V rail   → C1 (1000 µF bulk) ∥ C11 (100 µF tantalum, fast) → ESP VIN — kills brown-out',
  '5 V rail   → SC1 (1F supercap via diode) → ride-through on power loss (3-5 s)',
  '5 V rail   → AMS1117 on DevKit → 3.3 V (internal) → DHT22 (via FB1/FB2 ferrite), ADCs (via RC1/RC2 filter), GPIO logic',
  'Earth (PE) → enclosure metal parts + DIN rail + every COM that switches mains',
  'Thermal: TC1 (75°C cutout) on 12V supply line + FAN1 (40mm) for box ventilation',
];

export const SAFETY_NOTES = [
  '230 VAC and 12 V DC sections separated by ≥6 mm clearance/creepage on PCB.',
  'Two-stage surge protection: GDT1 (handles 5kA lightning) → MOV1 (clamps residual). Without GDT, MOV alone burns out in storms.',
  'Every relay output has its own 5 A fuse (F2–F9) so one short does not kill the box.',
  'Every relay NO-COM contact has an RC snubber (SN1–SN8) — suppresses arcing, extends relay life 5×, prevents EMI from disturbing ESP32/sensors.',
  'JD-VCC jumper on the 8-ch relay board must be REMOVED; coils run from 12 V, opto LEDs from 5 V — preserves opto-isolation.',
  'SIM800L MUST have its own buffered supply (PS3 + C2). Sharing the ESP rail causes brown-outs and modem reboots.',
  'ESP32 brown-out prevention stack: C1 (bulk) + C11 (tantalum, fast) + L1+C12 (LC filter on 5V) + SC1 (supercap ride-through). Firmware must lower brown-out detector eFuse to 2.27V.',
  'Each DHT22 DATA line passes through a ferrite bead (FB1/FB2) and uses shielded cable — without this, long cables pick up motor EMI and give ghost readings.',
  'MQ-137 and ZMPT101B analog outputs go through RC low-pass filter (RC1/RC2) before ADC — prevents false ammonia/voltage alarms from noise spikes.',
  'MQ-137 5V heater has an NTC inrush thermistor (NTC1) in series — without this, heater turn-on causes a 5V dip that resets ESP32.',
  'Reverse-polarity protection (Q1) on 12V input — installer cannot damage the board by swapping + and −.',
  '12V rail health monitored via voltage divider (RD1) on GPIO 39 — firmware logs droops <11V and triggers Voltage Fault alert.',
  'Thermal cutout (TC1, 75°C) opens the 12V supply if enclosure overheats — last-resort safety even if firmware crashes.',
  'Enclosure cooling fan (FAN1) with intake filter mesh — keeps PCB <55°C even in summer poultry shed.',
  'Entire PCB MUST be conformal-coated (CC1) after assembly — poultry shed has corrosive ammonia (NH3) and >80% humidity that kills uncoated boards in 6 months.',
  'GPIO 12 must NOT be pulled HIGH at boot — relay board is active-LOW, so this is naturally safe; do not add external pull-ups.',
  'GPIO 0, 6-11 are reserved for SPI flash. Leave unconnected.',
  'PE (earth) is mandatory — connect to enclosure, DIN rail, and any metal load chassis.',
  'Provide a clearly-labelled main isolator switch on the enclosure exterior.',
  'PCB silkscreen must mark "230 VAC LIVE" zones in red and add IEC 60417 lightning symbol.',
];

export const TEST_CHECKLIST = [
  'Visual: clearances, no solder bridges, polarised parts oriented correctly.',
  'Hi-Pot: 1500 VAC for 60 s between mains and low-voltage section.',
  'Power-on with no ESP fitted: 12 V, 5 V, 3.3 V, 4.2 V rails within ±5 %.',
  'Reverse-polarity test: feed −12V to input — Q1 must block, no current draw.',
  'Brown-out test: drop 12V to 9V for 100ms while 4 relays are ON — ESP must NOT reboot.',
  'Supercap (SC1) ride-through: pull mains, verify ESP stays alive ≥3 seconds.',
  'Fit ESP32 with factory firmware → status LED heartbeat within 3 s.',
  'Each relay click test via serial command — verify LED on relay board AND no EMI on serial console (snubber check).',
  'DHT22 read both zones with motors running → values within ±1 °C of reference (ferrite bead validation).',
  'MQ-137 burn-in 24 h, then calibrate baseline in clean air. Verify ADC reading is stable (RC filter check).',
  'YF-S201: pour 1 L water → flow counter reads 7.5 ± 0.3 pulses/L.',
  'ZMPT101B: confirm "mains present" flag toggles when input cut. Verify no false trips during relay switching.',
  '12V rail monitor: feed 11V → firmware must log Voltage Fault alert via GPIO 39 ADC.',
  'Thermal cutout (TC1): heat to 80°C with hot air gun — must open 12V circuit.',
  'SIM800L: send test SMS, verify network registration LED blink rate.',
  'Manual override button: holding 3 s puts system in safe state.',
  'Soak test: 48 h continuous run with simulated load cycling every 5 min.',
];

// ---------------------------------------------------------------------------
// TERMINAL WIRING (L / N / PE  +  COM / NO / NC)
// ---------------------------------------------------------------------------

// Mains input terminal block J1 (3-pos, 5.08mm, 16A)
export const MAINS_TERMINALS: Array<{ pin: string; label: string; color: string; wire: string; notes: string }> = [
  { pin: 'J1-1', label: 'L  (Live / Phase)',    color: 'বাদামী (Brown) / লাল',  wire: '1.5 mm² stranded', notes: '10A fuse F1 + MOV1 → SMPS L, Relay COM bus' },
  { pin: 'J1-2', label: 'N  (Neutral)',          color: 'নীল (Blue) / কালো',     wire: '1.5 mm² stranded', notes: 'Direct → SMPS N, Load N return bus' },
  { pin: 'J1-3', label: 'PE (Protective Earth)', color: 'সবুজ-হলুদ (Green/Yellow)', wire: '1.5 mm² stranded', notes: 'Enclosure metal, DIN rail, every load chassis — MANDATORY' },
];

// Per-relay output terminal block J2 (3-pos per channel, 10A)
export const RELAY_OUTPUTS: Array<{ ch: string; gpio: string; load: string; com: string; no: string; nc: string; fuse: string }> = [
  { ch: 'CH1', gpio: 'GPIO 25', load: 'Exhaust Fan',     com: 'L (via F2 5A)', no: 'Fan L-in',     nc: '— (খালি)', fuse: 'F2' },
  { ch: 'CH2', gpio: 'GPIO 26', load: 'Ceiling Fan',     com: 'L (via F3 5A)', no: 'Fan L-in',     nc: '— (খালি)', fuse: 'F3' },
  { ch: 'CH3', gpio: 'GPIO 27', load: 'Light',           com: 'L (via F4 5A)', no: 'Light L-in',   nc: '— (খালি)', fuse: 'F4' },
  { ch: 'CH4', gpio: 'GPIO 14', load: 'Heater (>1kW)',   com: 'L (via F5 5A) → KM1 coil A1', no: 'KM1 A2 / Heater L (small)', nc: '— (খালি)', fuse: 'F5  +  CJX2-1210 contactor' },
  { ch: 'CH5', gpio: 'GPIO 12', load: 'Fogger Pump',     com: 'L (via F6 5A)', no: 'Fogger L-in',  nc: '— (খালি)', fuse: 'F6' },
  { ch: 'CH6', gpio: 'GPIO 13', load: 'Alarm / Siren',   com: '12V+ (DC)',     no: 'Buzzer/Siren +', nc: '— (খালি)', fuse: '— (DC, fuse on 12V rail)' },
  { ch: 'CH7', gpio: 'GPIO 15', load: 'Sprinkler Valve', com: 'L (via F8 5A)', no: 'Valve L-in',   nc: '— (খালি)', fuse: 'F8' },
  { ch: 'CH8', gpio: 'GPIO 33', load: 'Circulation Fan', com: 'L (via F9 5A)', no: 'Fan L-in',     nc: '— (খালি)', fuse: 'F9' },
];

export const WIRING_RULES = [
  'প্রত্যেক লোডের NEUTRAL সরাসরি J1-2 (N) bus-bar এ যাবে — relay দিয়ে কখনো N switch করবেন না।',
  'প্রত্যেক লোডের EARTH (PE) সরাসরি J1-3 bus-bar এ — metal chassis, motor body, contactor frame সব।',
  'Relay শুধু LIVE (L) line switch করে: L → fuse → COM → NO → Load।',
  'NC (Normally Closed) terminal এই ডিজাইনে ব্যবহার হয় না — খালি রাখুন (false-trigger এড়াতে)।',
  'Heater (CH4) 1 kW এর বেশি হলে relay সরাসরি load চালাবে না — CJX2-1210 contactor coil এ যাবে, contactor main contact heater চালাবে।',
  'Alarm (CH6) DC buzzer, তাই COM = 12V+, NO = buzzer +; buzzer − সরাসরি GND এ।',
  'প্রত্যেক wire ferrule দিয়ে crimp করুন — bare strand কখনো terminal এ ঢুকাবেন না।',
  'Mains cable IP66 cable gland (PG-13.5) দিয়ে enclosure এ ঢুকবে; sensor cable PG-9 দিয়ে।',
  'Wire color code IEC 60446 মেনে চলুন: L=বাদামী, N=নীল, PE=সবুজ-হলুদ। অন্য রঙ ব্যবহার করবেন না।',
];

// ---------------------------------------------------------------------------
// CONNECTOR & WIRE-COLOUR MAP  (every plug on the PCB, pin-by-pin, with
// recommended jacket / core colour for the field cable)
// ---------------------------------------------------------------------------

export type ConnRow = { pin: string; signal: string; colorHex: string; colorName: string; awg: string; notes: string };
export type ConnGroup = { id: string; title: string; subtitle: string; pitch: string; rows: ConnRow[] };

export const CONNECTOR_MAP: ConnGroup[] = [
  {
    id: 'J1', title: 'J1 — Mains Input', subtitle: '3-pos screw terminal, 16A',
    pitch: '5.08 mm pitch · PCB-mount · cage-clamp',
    rows: [
      { pin: '1', signal: 'L  (Live)',     colorHex: '#8B4513', colorName: 'বাদামী Brown',         awg: '1.5 mm² (16 AWG)', notes: 'IEC 60446 — phase' },
      { pin: '2', signal: 'N  (Neutral)',  colorHex: '#1E40AF', colorName: 'নীল Blue',              awg: '1.5 mm² (16 AWG)', notes: 'Never switched' },
      { pin: '3', signal: 'PE (Earth)',    colorHex: '#16A34A', colorName: 'সবুজ-হলুদ Green/Yellow', awg: '1.5 mm² (16 AWG)', notes: 'Mandatory · stripe pattern' },
    ],
  },
  {
    id: 'J2', title: 'J2 × 8 — Relay Outputs', subtitle: '3-pos per channel, 10A',
    pitch: '5.08 mm pitch · COM / NO / NC',
    rows: [
      { pin: 'A', signal: 'COM',  colorHex: '#000000', colorName: 'কালো Black',     awg: '1.0 mm² (18 AWG)', notes: 'From per-channel fuse (L)' },
      { pin: 'B', signal: 'NO',   colorHex: '#DC2626', colorName: 'লাল Red',         awg: '1.0 mm² (18 AWG)', notes: 'To load Live-in' },
      { pin: 'C', signal: 'NC',   colorHex: '#6B7280', colorName: '— খালি Empty',   awg: '—',                 notes: 'Not used in this design' },
    ],
  },
  {
    id: 'J3-DHT', title: 'J3a / J3b — DHT22 Sensors', subtitle: 'JST-XH 4-pin, keyed',
    pitch: '2.54 mm pitch · shielded cable, max 1 m',
    rows: [
      { pin: '1', signal: 'VCC 3V3', colorHex: '#DC2626', colorName: 'লাল Red',     awg: '24 AWG',  notes: 'Decouple 100 nF at sensor' },
      { pin: '2', signal: 'DATA',    colorHex: '#FACC15', colorName: 'হলুদ Yellow',  awg: '24 AWG',  notes: '4.7k pull-up to 3V3' },
      { pin: '3', signal: 'NC',      colorHex: '#6B7280', colorName: '—',            awg: '—',       notes: 'Leave open' },
      { pin: '4', signal: 'GND',     colorHex: '#000000', colorName: 'কালো Black',   awg: '24 AWG',  notes: 'Tie to logic GND' },
    ],
  },
  {
    id: 'J3-MQ', title: 'J3c — MQ-137 Ammonia', subtitle: 'JST-XH 4-pin',
    pitch: '2.54 mm pitch',
    rows: [
      { pin: '1', signal: 'VCC 5V',  colorHex: '#DC2626', colorName: 'লাল Red',     awg: '22 AWG', notes: 'Heater needs ~150 mA' },
      { pin: '2', signal: 'AOUT',    colorHex: '#FFFFFF', colorName: 'সাদা White',  awg: '24 AWG', notes: 'To GPIO 34 via TVS' },
      { pin: '3', signal: 'DOUT',    colorHex: '#6B7280', colorName: '—',           awg: '—',      notes: 'Not connected' },
      { pin: '4', signal: 'GND',     colorHex: '#000000', colorName: 'কালো Black',  awg: '22 AWG', notes: '' },
    ],
  },
  {
    id: 'J3-YF', title: 'J3d — YF-S201 Water Flow', subtitle: 'JST-XH 3-pin',
    pitch: '2.54 mm pitch',
    rows: [
      { pin: '1', signal: 'VCC 5V',  colorHex: '#DC2626', colorName: 'লাল Red',      awg: '22 AWG', notes: 'Hall sensor supply' },
      { pin: '2', signal: 'PULSE',   colorHex: '#FACC15', colorName: 'হলুদ Yellow',  awg: '24 AWG', notes: 'GPIO 18 ISR · 10k pull-up' },
      { pin: '3', signal: 'GND',     colorHex: '#000000', colorName: 'কালো Black',   awg: '22 AWG', notes: '' },
    ],
  },
  {
    id: 'J3-ZMPT', title: 'J3e — ZMPT101B AC Voltage', subtitle: 'JST-XH 3-pin',
    pitch: '2.54 mm pitch',
    rows: [
      { pin: '1', signal: 'VCC 5V',  colorHex: '#DC2626', colorName: 'লাল Red',     awg: '24 AWG', notes: '' },
      { pin: '2', signal: 'AOUT',    colorHex: '#FFFFFF', colorName: 'সাদা White',  awg: '24 AWG', notes: 'GPIO 35 via TVS' },
      { pin: '3', signal: 'GND',     colorHex: '#000000', colorName: 'কালো Black',  awg: '24 AWG', notes: '' },
    ],
  },
  {
    id: 'J3-LDR', title: 'J3f — LDR (Light)', subtitle: 'JST-XH 2-pin (optional)',
    pitch: '2.54 mm pitch',
    rows: [
      { pin: '1', signal: 'AOUT',    colorHex: '#FACC15', colorName: 'হলুদ Yellow', awg: '24 AWG', notes: 'GPIO 36 (VP) · 10k divider' },
      { pin: '2', signal: 'GND',     colorHex: '#000000', colorName: 'কালো Black',  awg: '24 AWG', notes: '' },
    ],
  },
  {
    id: 'J4', title: 'J4 — SIM800L GSM Module', subtitle: '6-pin Dupont header',
    pitch: '2.54 mm pitch · separate 4.2 V supply',
    rows: [
      { pin: '1', signal: 'VBAT 4.2V', colorHex: '#DC2626', colorName: 'লাল Red',         awg: '20 AWG', notes: 'From PS3 + 470 µF C2' },
      { pin: '2', signal: 'GND',       colorHex: '#000000', colorName: 'কালো Black',      awg: '20 AWG', notes: 'Star-ground to PS3' },
      { pin: '3', signal: 'TXD → ESP RX', colorHex: '#FACC15', colorName: 'হলুদ Yellow',  awg: '24 AWG', notes: 'To GPIO 23' },
      { pin: '4', signal: 'RXD ← ESP TX', colorHex: '#FFFFFF', colorName: 'সাদা White',   awg: '24 AWG', notes: 'From GPIO 19 via 1k+2k divider' },
      { pin: '5', signal: 'RST',       colorHex: '#FB923C', colorName: 'কমলা Orange',     awg: '24 AWG', notes: 'GPIO 5 · active LOW' },
      { pin: '6', signal: 'NET LED',   colorHex: '#16A34A', colorName: 'সবুজ Green',      awg: '24 AWG', notes: 'Optional — panel LED' },
    ],
  },
  {
    id: 'J5', title: 'J5 — Manual Override Button', subtitle: '2-pin screw terminal',
    pitch: '3.5 mm pitch · panel-mount switch',
    rows: [
      { pin: '1', signal: 'BTN → GPIO 32', colorHex: '#DC2626', colorName: 'লাল Red',    awg: '24 AWG', notes: 'Through OK1 opto-isolator' },
      { pin: '2', signal: 'GND',           colorHex: '#000000', colorName: 'কালো Black', awg: '24 AWG', notes: 'Internal pull-up · 50 ms debounce' },
    ],
  },
  {
    id: 'J6', title: 'J6 — 12 V DC Power Input', subtitle: '2-pin screw terminal, 5A',
    pitch: '5.08 mm pitch · from PS1 SMPS',
    rows: [
      { pin: '1', signal: '+12 V',  colorHex: '#DC2626', colorName: 'লাল Red',    awg: '18 AWG', notes: 'Feeds JD-VCC + PS2 buck' },
      { pin: '2', signal: 'GND',    colorHex: '#000000', colorName: 'কালো Black', awg: '18 AWG', notes: 'Common DC ground' },
    ],
  },
];

// ===========================================================================
