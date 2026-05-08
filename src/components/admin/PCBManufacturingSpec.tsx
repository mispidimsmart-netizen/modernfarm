import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Cpu, Zap, Shield, Box, CircuitBoard, Loader2, Plug, FileArchive } from 'lucide-react';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageOrientation, LevelFormat,
} from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// ===========================================================================
// SOURCE-OF-TRUTH DATA  (matches public/esp32-industrial.ino v8.2 + memory)
// ===========================================================================

const PROJECT = {
  name: 'FarmEye Industrial Controller',
  version: 'PCB Rev 1.0  /  Firmware v8.2',
  vendor: 'Nexiot Labs',
  productCode: 'FE-CTRL-8CH-V1',
  enclosure: 'IP66 ABS, 300 × 200 × 130 mm, wall-mount, transparent lid',
};

const GPIO_MAP: Array<[string, string, string, string]> = [
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

const BOM: Array<{ ref: string; qty: number; part: string; spec: string; package: string; notes: string }> = [
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

const POWER_TREE = [
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

const SAFETY_NOTES = [
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

const TEST_CHECKLIST = [
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
const MAINS_TERMINALS: Array<{ pin: string; label: string; color: string; wire: string; notes: string }> = [
  { pin: 'J1-1', label: 'L  (Live / Phase)',    color: 'বাদামী (Brown) / লাল',  wire: '1.5 mm² stranded', notes: '10A fuse F1 + MOV1 → SMPS L, Relay COM bus' },
  { pin: 'J1-2', label: 'N  (Neutral)',          color: 'নীল (Blue) / কালো',     wire: '1.5 mm² stranded', notes: 'Direct → SMPS N, Load N return bus' },
  { pin: 'J1-3', label: 'PE (Protective Earth)', color: 'সবুজ-হলুদ (Green/Yellow)', wire: '1.5 mm² stranded', notes: 'Enclosure metal, DIN rail, every load chassis — MANDATORY' },
];

// Per-relay output terminal block J2 (3-pos per channel, 10A)
const RELAY_OUTPUTS: Array<{ ch: string; gpio: string; load: string; com: string; no: string; nc: string; fuse: string }> = [
  { ch: 'CH1', gpio: 'GPIO 25', load: 'Exhaust Fan',     com: 'L (via F2 5A)', no: 'Fan L-in',     nc: '— (খালি)', fuse: 'F2' },
  { ch: 'CH2', gpio: 'GPIO 26', load: 'Ceiling Fan',     com: 'L (via F3 5A)', no: 'Fan L-in',     nc: '— (খালি)', fuse: 'F3' },
  { ch: 'CH3', gpio: 'GPIO 27', load: 'Light',           com: 'L (via F4 5A)', no: 'Light L-in',   nc: '— (খালি)', fuse: 'F4' },
  { ch: 'CH4', gpio: 'GPIO 14', load: 'Heater (>1kW)',   com: 'L (via F5 5A) → KM1 coil A1', no: 'KM1 A2 / Heater L (small)', nc: '— (খালি)', fuse: 'F5  +  CJX2-1210 contactor' },
  { ch: 'CH5', gpio: 'GPIO 12', load: 'Fogger Pump',     com: 'L (via F6 5A)', no: 'Fogger L-in',  nc: '— (খালি)', fuse: 'F6' },
  { ch: 'CH6', gpio: 'GPIO 13', load: 'Alarm / Siren',   com: '12V+ (DC)',     no: 'Buzzer/Siren +', nc: '— (খালি)', fuse: '— (DC, fuse on 12V rail)' },
  { ch: 'CH7', gpio: 'GPIO 15', load: 'Sprinkler Valve', com: 'L (via F8 5A)', no: 'Valve L-in',   nc: '— (খালি)', fuse: 'F8' },
  { ch: 'CH8', gpio: 'GPIO 33', load: 'Circulation Fan', com: 'L (via F9 5A)', no: 'Fan L-in',     nc: '— (খালি)', fuse: 'F9' },
];

const WIRING_RULES = [
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

type ConnRow = { pin: string; signal: string; colorHex: string; colorName: string; awg: string; notes: string };
type ConnGroup = { id: string; title: string; subtitle: string; pitch: string; rows: ConnRow[] };

const CONNECTOR_MAP: ConnGroup[] = [
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

// ===========================================================================
// DOCX GENERATORS — Word output (Bengali-safe, fonts never break)
// ===========================================================================

const BRAND = '1F7A3E';
const BRAND_LIGHT = 'F0F8F4';

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function txt(text: string, opts: { bold?: boolean; size?: number; color?: string; font?: string } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    size: opts.size ?? 20, // half-points → 10pt default
    color: opts.color,
    font: opts.font ?? 'Nirmala UI', // Bengali-safe font
  });
}

function p(text: string, opts: { bold?: boolean; size?: number; color?: string; bullet?: boolean; spacing?: number } = {}) {
  return new Paragraph({
    children: [txt(text, { bold: opts.bold, size: opts.size, color: opts.color })],
    bullet: opts.bullet ? { level: 0 } : undefined,
    spacing: { after: opts.spacing ?? 80 },
  });
}

function heading(text: string, level: 1 | 2 = 2) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    shading: { fill: BRAND_LIGHT, type: ShadingType.CLEAR, color: 'auto' },
    children: [txt(text, { bold: true, size: level === 1 ? 28 : 24, color: BRAND })],
  });
}

function coverTitle(text: string, sub: string, version: string, code: string, vendor: string) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { fill: BRAND, type: ShadingType.CLEAR, color: 'auto' },
      spacing: { before: 0, after: 0 },
      children: [txt(text, { bold: true, size: 44, color: 'FFFFFF' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { fill: BRAND, type: ShadingType.CLEAR, color: 'auto' },
      spacing: { after: 0 },
      children: [txt(sub, { size: 22, color: 'FFFFFF' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { fill: BRAND, type: ShadingType.CLEAR, color: 'auto' },
      spacing: { after: 240 },
      children: [txt(`${version}   |   ${code}   |   ${vendor}`, { size: 18, color: 'FFFFFF' })],
    }),
  ];
}

function buildTable(head: string[], rows: string[][], colWidths: number[]) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: head.map((h, i) => new TableCell({
      borders: cellBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: BRAND, type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [txt(h, { bold: true, color: 'FFFFFF', size: 18 })] })],
    })),
  });
  const bodyRows = rows.map((row, idx) => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders: cellBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: idx % 2 === 0
        ? { fill: 'FAFAFA', type: ShadingType.CLEAR, color: 'auto' }
        : { fill: 'FFFFFF', type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [txt(cell, { size: 16 })] })],
    })),
  }));
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

async function generateDocx() {
  const { saveAs } = await import('file-saver');

  const children: (Paragraph | Table)[] = [];
  children.push(...coverTitle(PROJECT.name, 'PCB & Enclosure — Manufacturing Specification', PROJECT.version, PROJECT.productCode, PROJECT.vendor));

  // 1. Overview
  children.push(heading('1. Project Overview'));
  children.push(p(`${PROJECT.name} is a single-board IoT controller for poultry farms. It drives 8 mains-rated outputs (fans, heater, light, fogger, sprinkler, alarm, circulation), reads 6 sensor inputs, and falls back to 2G GSM (SIM800L) when Wi-Fi is unavailable. All safety and automation logic runs on-device — the cloud only stores rules.`));
  children.push(p(`Enclosure: ${PROJECT.enclosure}. The PCB is to be designed as a 2-layer board, FR-4 1.6 mm, ENIG finish preferred, minimum trace width 0.3 mm for signals and 2.0 mm (or copper-pour pad) for mains current paths.`));

  // 2. Power tree
  children.push(heading('2. Power Distribution Tree'));
  POWER_TREE.forEach((line) => children.push(p(line, { bullet: true })));

  // 3. GPIO map
  children.push(heading('3. ESP32-WROOM-32 (38-pin) GPIO Assignment'));
  children.push(buildTable(
    ['GPIO', 'Function', 'Dir', 'Notes'],
    GPIO_MAP.map(g => g.map(String)),
    [1400, 3200, 800, 3960],
  ));

  // 4. BOM
  children.push(heading('4. Bill of Materials (BOM)'));
  children.push(buildTable(
    ['Ref', 'Qty', 'Part', 'Specification', 'Package', 'Notes'],
    BOM.map(b => [b.ref, String(b.qty), b.part, b.spec, b.package, b.notes]),
    [900, 600, 2200, 2400, 1500, 1760],
  ));

  // 5. Layout zones
  children.push(heading('5. PCB Layout Zoning'));
  ['ZONE A — 230 VAC MAINS (red silkscreen): Fuse F1, GDT1, MOV1, terminal J1, contactor KM1',
   '── 6 mm slot / isolation barrier ──',
   'ZONE B — Relay board K1 (8-ch) + per-channel fuses F2-F9 + RC snubbers SN1-SN8 + output terminals J2 × 8',
   '── 6 mm slot / isolation barrier ──',
   'ZONE C — Low-voltage logic: PS1 SMPS, PS2 buck + L1/C12 LC filter, PS3 SIM supply, ESP32 38-pin socket, sensor connectors J3 × 6, status LEDs, buzzer, FAN1, TC1',
   'Cable glands enter from the bottom (PG1 × 6). Antenna cable exits via top SMA bulkhead.',
  ].forEach(t => children.push(p(t, { bullet: true })));

  // 6. Safety
  children.push(heading('6. Safety & Compliance Requirements'));
  SAFETY_NOTES.forEach((n) => children.push(p(n, { bullet: true })));

  // 7. Test
  children.push(heading('7. Factory Test Checklist'));
  TEST_CHECKLIST.forEach((n, i) => children.push(p(`${i + 1}. ${n}`)));

  // 8. Deliverables
  children.push(heading('8. Deliverables Required from Manufacturer'));
  [
    'Gerber (RS-274X) + drill files for the 2-layer PCB.',
    'Pick-and-place + BOM in CSV.',
    '3D STEP file of the assembled board.',
    'Hi-Pot and continuity test report per board (serialised).',
    'CE / EMC pre-compliance test report (radiated emissions class B).',
    'Conformal coating (HumiSeal 1B73 or equivalent) applied to entire PCB.',
    'User-replaceable fuses clearly labelled on silkscreen and enclosure label.',
    'Each unit shipped with: 12 V SMPS, 6 sensor cables (DHT × 2, MQ × 1, YF × 1, ZMPT × 1, LDR × 1), GSM antenna, mounting screws, printed quick-start sheet.',
  ].forEach(t => children.push(p(t, { bullet: true })));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Nirmala UI', size: 20 } } },
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `FarmEye_PCB_Manufacturing_Spec_${PROJECT.productCode}.docx`);
}

// ===========================================================================
// DOCX GENERATOR — terminal wiring diagram (landscape)
// ===========================================================================

async function generateWiringDocx() {
  const { saveAs } = await import('file-saver');

  const children: (Paragraph | Table)[] = [];
  children.push(...coverTitle('FarmEye — Terminal Wiring Diagram', `L / N / PE input  +  COM / NO / NC outputs`, PROJECT.version, PROJECT.productCode, PROJECT.vendor));

  // 1. Mains
  children.push(heading('1. Mains Input Terminal Block (J1, 3-pos 5.08mm, 16A)'));
  children.push(buildTable(
    ['Pin', 'Label', 'Wire Colour (IEC 60446)', 'Cable', 'Connects To'],
    MAINS_TERMINALS.map(t => [t.pin, t.label, t.color, t.wire, t.notes]),
    [1000, 2800, 3200, 2000, 5000],
  ));

  // 2. Relay outputs
  children.push(heading('2. Relay Output Terminal Blocks (J2 × 8 — COM / NO / NC)'));
  children.push(buildTable(
    ['CH', 'GPIO', 'Load', 'COM', 'NO', 'NC', 'Fuse'],
    RELAY_OUTPUTS.map(r => [r.ch, r.gpio, r.load, r.com, r.no, r.nc, r.fuse]),
    [700, 1100, 2200, 2800, 2800, 2200, 2200],
  ));

  // 3. Schematic
  children.push(heading('3. Single-Channel Wiring Schematic (typical AC load)'));
  [
    '230 VAC L → [F1 10A] → [GDT1] → [MOV1] → RELAY COM → [F2..F9 5A per ch] → NO → LOAD → N',
    'PE → Enclosure / DIN rail / Load chassis (mandatory)',
    'NC = unused (leave open)',
    'ESP32 GPIO → [opto-isolator on K1 board] → Relay coil (active LOW)',
    'Each relay NO-COM has RC snubber (SN1-SN8: 100Ω + 100nF X2) for arc suppression.',
  ].forEach(t => children.push(p(t, { bullet: true })));

  // 4. Wiring rules
  children.push(heading('4. Wiring Rules & Safety'));
  WIRING_RULES.forEach((r, i) => children.push(p(`${i + 1}. ${r}`)));

  // 5. Connector map
  children.push(heading('5. Connector & Wire-Colour Map (every plug, pin-by-pin)'));
  children.push(p('Wire colours follow IEC 60446 for AC power. DC and signal colours are recommended Nexiot Labs convention.'));

  CONNECTOR_MAP.forEach((g) => {
    children.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        txt(`${g.id}  ·  ${g.title}`, { bold: true, size: 22, color: BRAND }),
        txt(`     ${g.subtitle} — ${g.pitch}`, { size: 16, color: '707070' }),
      ],
    }));
    children.push(buildTable(
      ['Pin', 'Signal', 'Wire Colour', 'AWG', 'Notes'],
      g.rows.map(r => [r.pin, r.signal, r.colorName, r.awg, r.notes]),
      [800, 3000, 3200, 1800, 5200],
    ));
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Nirmala UI', size: 20 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `FarmEye_Terminal_Wiring_${PROJECT.productCode}.docx`);
}


// ===========================================================================
// GERBER / DRILL EXCHANGE PACKAGE  (ZIP for the PCB manufacturer)
// ---------------------------------------------------------------------------
// We can't generate the actual binary Gerber / Excellon files inside the
// browser — those come out of KiCad / EAGLE / Altium when the PCB is laid
// out. Instead we ship a complete "manufacturer hand-off package":
//   • README with naming convention (RS-274X) and required layers
//   • BOM as CSV (drop-in for any P&P house)
//   • Connector / wire-colour map as CSV
//   • Empty stub files for every Gerber + Excellon layer named exactly the
//     way most fabs (JLCPCB, PCBWay, Seeed) expect, so the manufacturer
//     replaces the stubs with the real plots and zips the same folder back.
// ===========================================================================

function csvEscape(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildBomCsv(): string {
  const head = ['Ref', 'Qty', 'Part', 'Specification', 'Package', 'Notes'];
  const rows = BOM.map((b) => [b.ref, b.qty, b.part, b.spec, b.package, b.notes].map(csvEscape).join(','));
  return [head.join(','), ...rows].join('\n');
}

function buildConnectorCsv(): string {
  const head = ['Connector', 'Title', 'Pin', 'Signal', 'WireColourHex', 'WireColourName', 'AWG', 'Notes'];
  const rows: string[] = [];
  CONNECTOR_MAP.forEach((g) => {
    g.rows.forEach((r) => {
      rows.push([g.id, g.title, r.pin, r.signal, r.colorHex, r.colorName, r.awg, r.notes].map(csvEscape).join(','));
    });
  });
  return [head.join(','), ...rows].join('\n');
}

function buildGpioCsv(): string {
  const head = ['GPIO', 'Function', 'Direction', 'Notes'];
  const rows = GPIO_MAP.map((g) => g.map(csvEscape).join(','));
  return [head.join(','), ...rows].join('\n');
}

// Stub layer files — manufacturer replaces these with the real plots.
// The header is valid RS-274X so the file opens (empty board) in any viewer.
function gerberStub(layerName: string): string {
  return [
    'G04 ' + layerName + ' (PLACEHOLDER — replace with real plot from KiCad/EAGLE)*',
    'G04 Project: ' + PROJECT.name + ' ' + PROJECT.version + '*',
    '%FSLAX46Y46*%',
    '%MOMM*%',
    '%LPD*%',
    '%ADD10C,0.100000*%',
    'D10*',
    'M02*',
    '',
  ].join('\n');
}

function drillStub(): string {
  return [
    '; PLACEHOLDER Excellon drill — replace with real NC drill file',
    '; Project: ' + PROJECT.name + ' ' + PROJECT.version,
    'M48',
    'METRIC,LZ',
    'T1C0.300',
    'T2C0.800',
    'T3C1.000',
    'T4C3.200',
    '%',
    'M30',
    '',
  ].join('\n');
}

const GERBER_LAYERS: Array<{ file: string; desc: string }> = [
  { file: 'FarmEye_Ctrl-F_Cu.gbr',     desc: 'Top copper (signal + 2 mm mains traces)' },
  { file: 'FarmEye_Ctrl-B_Cu.gbr',     desc: 'Bottom copper (GND pour + return paths)' },
  { file: 'FarmEye_Ctrl-F_Mask.gbs',   desc: 'Top solder mask' },
  { file: 'FarmEye_Ctrl-B_Mask.gbs',   desc: 'Bottom solder mask' },
  { file: 'FarmEye_Ctrl-F_Silkscreen.gbo', desc: 'Top silkscreen — RED for 230 VAC zone, white elsewhere' },
  { file: 'FarmEye_Ctrl-B_Silkscreen.gbo', desc: 'Bottom silkscreen' },
  { file: 'FarmEye_Ctrl-F_Paste.gbp',  desc: 'Top paste (only if SMD reflow ordered)' },
  { file: 'FarmEye_Ctrl-Edge_Cuts.gm1', desc: 'Board outline + 6 mm isolation slots between zones A/B/C' },
];

function buildReadme(): string {
  const lines = [
    '═══════════════════════════════════════════════════════════════════',
    `  ${PROJECT.name}`,
    `  ${PROJECT.version}   |   Product Code: ${PROJECT.productCode}`,
    `  Vendor: ${PROJECT.vendor}`,
    '═══════════════════════════════════════════════════════════════════',
    '',
    'GERBER / DRILL EXCHANGE PACKAGE — MANUFACTURER HAND-OFF',
    '',
    'This ZIP is the contractual hand-off folder between Nexiot Labs and',
    'the PCB manufacturer.  Do NOT rename any file — JLCPCB / PCBWay /',
    'Seeed / Allpcb auto-detection depends on the exact suffixes below.',
    '',
    '───────────────────────────────────────────────────────────────────',
    'FOLDER LAYOUT',
    '───────────────────────────────────────────────────────────────────',
    '  /gerber/           ← replace stubs with real RS-274X plots',
    '  /drill/            ← replace stub with real Excellon (.drl)',
    '  /pick-and-place/   ← optional CPL file, top + bottom',
    '  /docs/',
    '       BOM.csv               ← Bill of Materials (authoritative)',
    '       CONNECTORS.csv        ← every plug, pin & wire colour',
    '       GPIO_MAP.csv          ← ESP32-WROOM-32 pin assignment',
    '       README.txt            ← this file',
    '',
    '───────────────────────────────────────────────────────────────────',
    'GERBER LAYERS (RS-274X, metric, 4.6 format)',
    '───────────────────────────────────────────────────────────────────',
    ...GERBER_LAYERS.map((l) => `  ${l.file.padEnd(34)} — ${l.desc}`),
    '',
    'Drill file:',
    '  FarmEye_Ctrl.drl              — Excellon, mm, leading-zero',
    '',
    '───────────────────────────────────────────────────────────────────',
    'BOARD STACK-UP',
    '───────────────────────────────────────────────────────────────────',
    '  Layers ............ 2',
    '  Material .......... FR-4, Tg ≥ 130 °C',
    '  Thickness ......... 1.6 mm ± 10 %',
    '  Outer copper ...... 1 oz (35 µm) — request 2 oz on mains traces',
    '  Surface finish .... ENIG (preferred) or HASL lead-free',
    '  Solder mask ....... matte black or green',
    '  Silkscreen ........ white + RED ink for 230 VAC warning zone',
    '  Min trace / space . 0.3 mm signal, 2.0 mm mains, 6 mm A↔B↔C slot',
    '  Min hole .......... 0.3 mm',
    '  Edge clearance .... 0.5 mm',
    '',
    '───────────────────────────────────────────────────────────────────',
    'COMPLIANCE & TEST DELIVERABLES (per board, serialised)',
    '───────────────────────────────────────────────────────────────────',
    '  • Hi-Pot 1500 VAC for 60 s between mains and low-voltage section',
    '  • Continuity report on PE bus',
    '  • CE / EMC pre-compliance report (radiated emissions class B)',
    '  • Visual inspection log',
    '',
    '───────────────────────────────────────────────────────────────────',
    'CONTACT',
    '───────────────────────────────────────────────────────────────────',
    '  Nexiot Labs — engineering@nexiotlabs.com',
    '  Quote any deviation BEFORE production.  No silent substitutions.',
    '',
    '═══════════════════════════════════════════════════════════════════',
    `  Generated from FarmEye admin dashboard on ${new Date().toISOString().split('T')[0]}`,
    '═══════════════════════════════════════════════════════════════════',
    '',
  ];
  return lines.join('\n');
}

async function generateGerberZip() {
  const zip = new JSZip();

  // Root README
  zip.file('README.txt', buildReadme());

  // /docs
  const docs = zip.folder('docs')!;
  docs.file('README.txt', buildReadme());
  docs.file('BOM.csv', buildBomCsv());
  docs.file('CONNECTORS.csv', buildConnectorCsv());
  docs.file('GPIO_MAP.csv', buildGpioCsv());

  // /gerber stubs
  const gerberFolder = zip.folder('gerber')!;
  GERBER_LAYERS.forEach((l) => gerberFolder.file(l.file, gerberStub(l.desc)));

  // /drill stub
  const drillFolder = zip.folder('drill')!;
  drillFolder.file('FarmEye_Ctrl.drl', drillStub());

  // /pick-and-place placeholder
  const cplFolder = zip.folder('pick-and-place')!;
  cplFolder.file(
    'FarmEye_Ctrl-top-pos.csv',
    'Designator,Val,Package,Mid X,Mid Y,Rotation,Layer\n# Replace with real CPL from EDA\n',
  );
  cplFolder.file(
    'FarmEye_Ctrl-bottom-pos.csv',
    'Designator,Val,Package,Mid X,Mid Y,Rotation,Layer\n# Replace with real CPL from EDA\n',
  );

  // Manifest
  zip.file(
    'MANIFEST.json',
    JSON.stringify(
      {
        product: PROJECT.name,
        productCode: PROJECT.productCode,
        version: PROJECT.version,
        vendor: PROJECT.vendor,
        generatedAt: new Date().toISOString(),
        contents: {
          gerberLayers: GERBER_LAYERS.map((l) => l.file),
          drillFiles: ['drill/FarmEye_Ctrl.drl'],
          docs: ['docs/README.txt', 'docs/BOM.csv', 'docs/CONNECTORS.csv', 'docs/GPIO_MAP.csv'],
          pickAndPlace: ['pick-and-place/FarmEye_Ctrl-top-pos.csv', 'pick-and-place/FarmEye_Ctrl-bottom-pos.csv'],
        },
        notes:
          'Gerber & drill files in this archive are PLACEHOLDER stubs. The PCB manufacturer (or the EDA designer) MUST replace them with the real plots before fabrication. CSV docs are authoritative and must not be modified without a Nexiot Labs change-order.',
      },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  saveAs(blob, `FarmEye_Gerber-Drill_Package_${PROJECT.productCode}.zip`);
}


export function PCBManufacturingSpec() {
  const [busy, setBusy] = useState(false);
  const [busyWiring, setBusyWiring] = useState(false);
  const [busyZip, setBusyZip] = useState(false);

  const handleDownload = async () => {
    try {
      setBusy(true);
      generatePDF();
      toast.success('PDF ডাউনলোড হয়েছে — ম্যানুফ্যাকচারারকে দিন');
    } catch (e) {
      console.error(e);
      toast.error('PDF তৈরিতে সমস্যা হয়েছে');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadWiring = async () => {
    try {
      setBusyWiring(true);
      generateWiringPDF();
      toast.success('ওয়্যারিং ডায়াগ্রাম PDF ডাউনলোড হয়েছে');
    } catch (e) {
      console.error(e);
      toast.error('PDF তৈরিতে সমস্যা হয়েছে');
    } finally {
      setBusyWiring(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setBusyZip(true);
      await generateGerberZip();
      toast.success('Gerber/Drill ZIP ডাউনলোড হয়েছে — ম্যানুফ্যাকচারারকে দিন');
    } catch (e) {
      console.error(e);
      toast.error('ZIP তৈরিতে সমস্যা হয়েছে');
    } finally {
      setBusyZip(false);
    }
  };

  const downloadText = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    saveAs(blob, filename);
  };

  const docDownloads = [
    {
      key: 'bom',
      label: 'BOM (Bill of Materials)',
      desc: 'সম্পূর্ণ পার্টস তালিকা — ম্যানুফ্যাকচারারের কেনাকাটার জন্য',
      filename: `FarmEye_BOM_${PROJECT.productCode}.csv`,
      mime: 'text/csv',
      build: buildBomCsv,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: 'gpio',
      label: 'GPIO Map (পিন অ্যাসাইনমেন্ট)',
      desc: 'ESP32-WROOM-32 38-pin সব পিনের ফাংশন ও সংযোগ',
      filename: `FarmEye_GPIO_MAP_${PROJECT.productCode}.csv`,
      mime: 'text/csv',
      build: buildGpioCsv,
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      key: 'conn',
      label: 'Connector Map (তারের রঙ)',
      desc: 'প্রতিটি কানেক্টরের পিন, সিগন্যাল, ও তারের রঙ',
      filename: `FarmEye_CONNECTORS_${PROJECT.productCode}.csv`,
      mime: 'text/csv',
      build: buildConnectorCsv,
      icon: <Plug className="w-4 h-4" />,
    },
  ];

  return (
    <Tabs defaultValue="spec" className="space-y-4">
      <TabsList className="grid grid-cols-2 w-full max-w-md">
        <TabsTrigger value="spec" className="gap-2"><CircuitBoard className="w-4 h-4" />PCB স্পেসিফিকেশন</TabsTrigger>
        <TabsTrigger value="wiring" className="gap-2"><Plug className="w-4 h-4" />টার্মিনাল ওয়্যারিং</TabsTrigger>
      </TabsList>

      <TabsContent value="spec" className="space-y-4 mt-0">
      {/* Hero / download card */}
      <Card className="bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border-emerald-500/30">
        <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
              <CircuitBoard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PCB ম্যানুফ্যাকচারিং স্পেসিফিকেশন</h2>
              <p className="text-sm text-emerald-200/80 mt-1">
                {PROJECT.name} — {PROJECT.version}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                সম্পূর্ণ BOM, GPIO ম্যাপ, লে-আউট জোন, সেফটি ও টেস্ট চেকলিস্ট সহ একটি প্রোডাকশন-রেডি PDF — সরাসরি ম্যানুফ্যাকচারারকে দিন।
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              size="lg"
              onClick={handleDownload}
              disabled={busy}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
            >
              {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
              PDF ডাউনলোড
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleDownloadZip}
              disabled={busyZip}
              className="border-emerald-500/40 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/60 hover:text-white"
            >
              {busyZip ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileArchive className="w-5 h-5 mr-2" />}
              Gerber/Drill ZIP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual document downloads */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Download className="w-5 h-5 text-emerald-400" />
            পৃথক ডকুমেন্টস ডাউনলোড
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            ম্যানুফ্যাকচারারকে আলাদাভাবে নির্দিষ্ট ফাইল পাঠাতে চাইলে এখান থেকে ডাউনলোড করুন। সম্পূর্ণ প্যাকেজের জন্য উপরের PDF / ZIP ব্যবহার করুন।
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docDownloads.map((d) => (
            <button
              key={d.key}
              onClick={() => {
                try {
                  downloadText(d.filename, d.build(), d.mime);
                  toast.success(`${d.label} ডাউনলোড হয়েছে`);
                } catch (e) {
                  console.error(e);
                  toast.error('ফাইল তৈরিতে সমস্যা হয়েছে');
                }
              }}
              className="text-left rounded-xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-900/40 hover:border-emerald-500/50 transition-colors p-4 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  {d.icon}
                  <span className="text-sm font-semibold text-white">{d.label}</span>
                </div>
                <Download className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{d.desc}</p>
              <p className="text-[10px] text-emerald-500/70 mt-2 font-mono truncate">{d.filename}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* On-screen preview */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-emerald-400" />
            ডকুমেন্ট প্রিভিউ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-3">
            {/* 1. Overview */}
            <SpecSection icon={<Box className="w-4 h-4" />} title="১. প্রকল্প পরিচিতি">
              <KV k="পণ্যের নাম" v={PROJECT.name} />
              <KV k="ভার্সন" v={PROJECT.version} />
              <KV k="প্রোডাক্ট কোড" v={PROJECT.productCode} />
              <KV k="ভেন্ডর" v={PROJECT.vendor} />
              <KV k="এনক্লোজার" v={PROJECT.enclosure} />
              <p className="text-xs text-slate-400 mt-2">
                2-layer FR-4, 1.6 mm, ENIG ফিনিশ। সিগন্যাল ট্রেস ≥ 0.3 mm, মেইনস কারেন্ট পাথ ≥ 2.0 mm বা copper-pour।
              </p>
            </SpecSection>

            {/* 2. Power tree */}
            <SpecSection icon={<Zap className="w-4 h-4" />} title="২. পাওয়ার ট্রি">
              <ul className="text-xs text-slate-300 space-y-1.5">
                {POWER_TREE.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-400">▸</span>
                    <span className="font-mono">{p}</span>
                  </li>
                ))}
              </ul>
            </SpecSection>

            {/* 3. GPIO */}
            <SpecSection icon={<Cpu className="w-4 h-4" />} title="৩. ESP32-WROOM-32 GPIO ম্যাপ">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-emerald-300 border-b border-white/10">
                      <th className="py-2 pr-3">GPIO</th>
                      <th className="py-2 pr-3">ফাংশন</th>
                      <th className="py-2 pr-3">Dir</th>
                      <th className="py-2">নোট</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {GPIO_MAP.map(([g, f, d, n], i) => (
                      <tr key={i} className="border-b border-white/5 align-top">
                        <td className="py-1.5 pr-3 font-mono text-emerald-200">{g}</td>
                        <td className="py-1.5 pr-3">{f}</td>
                        <td className="py-1.5 pr-3"><Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{d}</Badge></td>
                        <td className="py-1.5 text-slate-400">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SpecSection>

            {/* 4. BOM */}
            <SpecSection icon={<FileText className="w-4 h-4" />} title={`৪. বিল অফ মেটেরিয়ালস (${BOM.length} আইটেম)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-emerald-300 border-b border-white/10">
                      <th className="py-2 pr-2">Ref</th>
                      <th className="py-2 pr-2">Qty</th>
                      <th className="py-2 pr-2">Part</th>
                      <th className="py-2 pr-2">Spec</th>
                      <th className="py-2">নোট</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {BOM.map((b, i) => (
                      <tr key={i} className="border-b border-white/5 align-top">
                        <td className="py-1.5 pr-2 font-mono text-emerald-200">{b.ref}</td>
                        <td className="py-1.5 pr-2 text-center">{b.qty}</td>
                        <td className="py-1.5 pr-2">{b.part}</td>
                        <td className="py-1.5 pr-2 text-slate-400">{b.spec}</td>
                        <td className="py-1.5 text-slate-400">{b.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SpecSection>

            {/* 5. Layout */}
            <SpecSection icon={<CircuitBoard className="w-4 h-4" />} title="৫. PCB লে-আউট জোন">
              <pre className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-white/10 overflow-x-auto leading-snug">
{`┌──────────────────────────────────────────────────────┐
│  ZONE A — 230 VAC MAINS  (silkscreen RED)            │
│  F1 fuse, MOV1 surge, J1 input, KM1 contactor        │
│  ━━━━━━━ 6 mm isolation slot ━━━━━━━━━━━━━━━━━━━━    │
│  ZONE B — 8-ch Relay K1 + per-channel fuses F2..F9   │
│  Output terminals J2 × 8  (NO / COM / NC)            │
│  ━━━━━━━ 6 mm isolation slot ━━━━━━━━━━━━━━━━━━━━    │
│  ZONE C — Low-voltage logic                          │
│  PS1 SMPS · PS2 buck · PS3 SIM supply · ESP32 socket │
│  J3 × 6 sensor connectors · LED1-3 · BZ1 buzzer      │
└──────────────────────────────────────────────────────┘
   Cable glands PG1 × 6 enter from BOTTOM
   GSM antenna SMA bulkhead exits TOP`}
              </pre>
            </SpecSection>

            {/* 6. Safety */}
            <SpecSection icon={<Shield className="w-4 h-4" />} title="৬. সেফটি ও কমপ্লায়েন্স">
              <ul className="text-xs text-slate-300 space-y-1.5">
                {SAFETY_NOTES.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-400 shrink-0">⚠</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </SpecSection>

            {/* 7. Test */}
            <SpecSection icon={<FileText className="w-4 h-4" />} title="৭. ফ্যাক্টরি টেস্ট চেকলিস্ট">
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                {TEST_CHECKLIST.map((n, i) => <li key={i}>{n}</li>)}
              </ol>
            </SpecSection>
          </ScrollArea>
        </CardContent>
      </Card>
      </TabsContent>

      {/* ===================== TERMINAL WIRING TAB ===================== */}
      <TabsContent value="wiring" className="space-y-4 mt-0">
        <Card className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 border-amber-500/30">
          <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Plug className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">টার্মিনাল ওয়্যারিং ডায়াগ্রাম</h2>
                <p className="text-sm text-amber-200/80 mt-1">L / N / PE input  ·  COM / NO / NC outputs (8 channels)</p>
                <p className="text-xs text-slate-400 mt-1">
                  ইলেকট্রিশিয়ান বা ম্যানুফ্যাকচারারের জন্য আলাদা PDF — wire color, fuse, contactor সহ পূর্ণ schematic।
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleDownloadWiring}
              disabled={busyWiring}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30 shrink-0"
            >
              {busyWiring ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
              ওয়্যারিং PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Plug className="w-5 h-5 text-amber-400" /> ওয়্যারিং প্রিভিউ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-3">
              {/* Mains input */}
              <SpecSection icon={<Zap className="w-4 h-4" />} title="১. মেইনস ইনপুট টার্মিনাল  J1  (L / N / PE)">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-300 border-b border-white/10">
                        <th className="py-2 pr-3">Pin</th>
                        <th className="py-2 pr-3">Label</th>
                        <th className="py-2 pr-3">Wire Colour</th>
                        <th className="py-2 pr-3">Cable</th>
                        <th className="py-2">Connects To</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {MAINS_TERMINALS.map((t, i) => (
                        <tr key={i} className="border-b border-white/5 align-top">
                          <td className="py-1.5 pr-3 font-mono text-amber-200 font-bold">{t.pin}</td>
                          <td className="py-1.5 pr-3 font-semibold">{t.label}</td>
                          <td className="py-1.5 pr-3">{t.color}</td>
                          <td className="py-1.5 pr-3 text-slate-400">{t.wire}</td>
                          <td className="py-1.5 text-slate-400">{t.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SpecSection>

              {/* Relay outputs */}
              <SpecSection icon={<CircuitBoard className="w-4 h-4" />} title="২. রিলে আউটপুট টার্মিনাল  J2 × 8  (COM / NO / NC)">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-300 border-b border-white/10">
                        <th className="py-2 pr-2">CH</th>
                        <th className="py-2 pr-2">GPIO</th>
                        <th className="py-2 pr-2">Load</th>
                        <th className="py-2 pr-2">COM</th>
                        <th className="py-2 pr-2">NO</th>
                        <th className="py-2 pr-2">NC</th>
                        <th className="py-2">Fuse</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {RELAY_OUTPUTS.map((r, i) => (
                        <tr key={i} className="border-b border-white/5 align-top">
                          <td className="py-1.5 pr-2 font-mono text-amber-200 font-bold">{r.ch}</td>
                          <td className="py-1.5 pr-2 font-mono text-emerald-200">{r.gpio}</td>
                          <td className="py-1.5 pr-2 font-semibold">{r.load}</td>
                          <td className="py-1.5 pr-2 text-slate-300">{r.com}</td>
                          <td className="py-1.5 pr-2 text-slate-300">{r.no}</td>
                          <td className="py-1.5 pr-2 text-slate-500">{r.nc}</td>
                          <td className="py-1.5 text-slate-400">{r.fuse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SpecSection>

              {/* Schematic */}
              <SpecSection icon={<Zap className="w-4 h-4" />} title="৩. সিঙ্গেল-চ্যানেল ওয়্যারিং স্কিম্যাটিক">
                <pre className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-white/10 overflow-x-auto leading-snug">
{`   230 VAC                +-------+         +-----------+        +----------+
   L  o----[ F1 10A ]----| MOV1  |---o-----| RELAY COM |        |   LOAD   |
                          +-------+   |     |           |        | (Fan /   |
                                      |     |    NO o---+--------+ Heater)  |
                                 [F2..F9 5A per ch]    |        |          |
   N  o-----------------------------------------------+--------+--+ N      |
                                                       |          |        |
   PE o--[ Enclosure / DIN rail / Load chassis ]------+----------+ PE      |
                                                                  +--------+

   NC = (not used, leave open)
   ESP32 GPIO --[ opto-isolator on K1 board ]--> Relay coil (active LOW)`}
                </pre>
              </SpecSection>

              {/* Rules */}
              <SpecSection icon={<Shield className="w-4 h-4" />} title="৪. ওয়্যারিং নিয়ম ও সেফটি">
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                  {WIRING_RULES.map((n, i) => <li key={i}>{n}</li>)}
                </ol>
              </SpecSection>

              {/* 5. Connector & wire-colour map */}
              <SpecSection icon={<Plug className="w-4 h-4" />} title="৫. কানেক্টর ও তারের রঙ ম্যাপিং (প্রতিটি প্লাগ, পিন-বাই-পিন)">
                <p className="text-[11px] text-slate-400 mb-3">
                  AC পাওয়ারে IEC 60446 রঙ-কোড। DC ও সিগন্যাল লাইনে Nexiot Labs convention — ফিল্ডে এই রঙ মেনে চললে troubleshooting দ্রুত হয়।
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {CONNECTOR_MAP.map((g) => (
                    <div key={g.id} className="rounded-lg border border-white/10 bg-slate-950/50 overflow-hidden">
                      <div className="px-3 py-2 bg-gradient-to-r from-amber-900/30 to-transparent border-b border-white/10">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-amber-300 font-bold text-xs">{g.id}</span>
                          <span className="text-[10px] text-slate-500">{g.pitch}</span>
                        </div>
                        <div className="text-xs text-slate-200 font-semibold mt-0.5">{g.title}</div>
                        <div className="text-[10px] text-slate-400">{g.subtitle}</div>
                      </div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-white/5">
                            <th className="px-2 py-1 w-8 text-center">Pin</th>
                            <th className="px-2 py-1">Signal</th>
                            <th className="px-2 py-1 w-6"></th>
                            <th className="px-2 py-1">Wire</th>
                            <th className="px-2 py-1 w-16">AWG</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
                          {g.rows.map((r, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 align-middle">
                              <td className="px-2 py-1.5 text-center font-mono text-amber-200 font-bold">{r.pin}</td>
                              <td className="px-2 py-1.5 font-semibold">{r.signal}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className="inline-block w-3.5 h-3.5 rounded-full border border-white/30 shadow-inner"
                                  style={{ backgroundColor: r.colorHex }}
                                  title={r.colorName}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-slate-300">{r.colorName}</td>
                              <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{r.awg}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </SpecSection>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function SpecSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 pb-5 border-b border-white/5 last:border-0">
      <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-xs py-1">
      <span className="text-slate-400 sm:w-32 shrink-0">{k}:</span>
      <span className="text-slate-200">{v}</span>
    </div>
  );
}
