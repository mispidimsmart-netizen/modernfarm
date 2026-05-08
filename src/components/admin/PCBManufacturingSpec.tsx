import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Cpu, Zap, Shield, Box, CircuitBoard, Loader2, Plug } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
];

const POWER_TREE = [
  '230 VAC mains → 10A fuse (F1) → MOV1 (surge) → SMPS PS1 (12 V / 3 A)',
  '12 V rail  → JD-VCC of K1 (relay coils, opto-isolated side)',
  '12 V rail  → Buck PS2 → 5 V rail → ESP32 VIN, MQ-137 heater, sensor pull-ups',
  '12 V rail  → Buck/LDO PS3 → 4.2 V buffered (470 µF C2) → SIM800L VBAT',
  '5 V rail   → AMS1117 on DevKit → 3.3 V (internal) → DHT22, ADCs, GPIO logic',
  'Earth (PE) → enclosure metal parts + DIN rail + every COM that switches mains',
];

const SAFETY_NOTES = [
  '230 VAC and 12 V DC sections separated by ≥6 mm clearance/creepage on PCB.',
  'Every relay output has its own 5 A fuse (F2–F9) so one short does not kill the box.',
  'JD-VCC jumper on the 8-ch relay board must be REMOVED; coils run from 12 V, opto LEDs from 5 V — this preserves opto-isolation.',
  'SIM800L MUST have its own buffered supply (PS3 + C2). Sharing the ESP rail causes brown-outs and modem reboots.',
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
  'Fit ESP32 with factory firmware → status LED heartbeat within 3 s.',
  'Each relay click test via serial command — verify LED on relay board.',
  'DHT22 read both zones → values within ±1 °C of a reference thermometer.',
  'MQ-137 burn-in 24 h, then calibrate baseline in clean air.',
  'YF-S201: pour 1 L water → flow counter reads 7.5 ± 0.3 pulses/L.',
  'ZMPT101B: confirm "mains present" flag toggles when input cut.',
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

// ===========================================================================
// PDF GENERATOR — main spec
// ===========================================================================


function generatePDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ---- Cover ----
  doc.setFillColor(31, 122, 62); // brand teal
  doc.rect(0, 0, pageW, 55, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(PROJECT.name, margin, 25);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('PCB & Enclosure — Manufacturing Specification', margin, 34);
  doc.setFontSize(10);
  doc.text(`${PROJECT.version}   |   Product Code: ${PROJECT.productCode}`, margin, 42);
  doc.text(`Vendor: ${PROJECT.vendor}`, margin, 48);

  doc.setTextColor(0);
  let y = 70;

  const section = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setFillColor(240, 248, 244);
    doc.rect(margin - 2, y - 5, pageW - 2 * margin + 4, 8, 'F');
    doc.setTextColor(31, 122, 62);
    doc.text(title, margin, y);
    doc.setTextColor(0);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const para = (text: string) => {
    const lines = doc.splitTextToSize(text, pageW - 2 * margin);
    if (y + lines.length * 5 > 285) { doc.addPage(); y = 20; }
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  };

  // ---- 1. Overview ----
  section('1. Project Overview');
  para(
    `${PROJECT.name} is a single-board IoT controller for poultry farms. It drives 8 mains-rated outputs (fans, heater, light, fogger, sprinkler, alarm, circulation), reads 6 sensor inputs, and falls back to 2G GSM (SIM800L) when Wi-Fi is unavailable. All safety and automation logic runs on-device — the cloud only stores rules.`
  );
  para(
    `Enclosure: ${PROJECT.enclosure}. The PCB is to be designed as a 2-layer board, FR-4 1.6 mm, ENIG finish preferred, minimum trace width 0.3 mm for signals and 2.0 mm (or copper-pour pad) for mains current paths.`
  );

  // ---- 2. Block diagram (text) ----
  section('2. Power Distribution Tree');
  POWER_TREE.forEach((line) => para('•  ' + line));

  // ---- 3. GPIO map ----
  if (y > 230) { doc.addPage(); y = 20; }
  section('3. ESP32-WROOM-32 GPIO Assignment');
  autoTable(doc, {
    startY: y,
    head: [['GPIO', 'Function', 'Dir', 'Notes']],
    body: GPIO_MAP,
    theme: 'grid',
    headStyles: { fillColor: [31, 122, 62], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 2: { cellWidth: 16 } },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---- 4. BOM ----
  doc.addPage(); y = 20;
  section('4. Bill of Materials (BOM)');
  autoTable(doc, {
    startY: y,
    head: [['Ref', 'Qty', 'Part', 'Specification', 'Package', 'Notes']],
    body: BOM.map((b) => [b.ref, String(b.qty), b.part, b.spec, b.package, b.notes]),
    theme: 'striped',
    headStyles: { fillColor: [31, 122, 62], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 7.8, valign: 'top' },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: 'bold' },
      1: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 25 },
      5: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---- 5. Layout zones ----
  if (y > 230) { doc.addPage(); y = 20; }
  section('5. PCB Layout Zoning (top view)');
  para('The PCB must be partitioned into clearly separated zones:');
  para('  ┌──────────────────────────────────────────────────────┐');
  para('  │  ZONE A  ── 230 VAC MAINS  (red silkscreen)          │');
  para('  │  Fuse F1, MOV1, terminal J1, contactor KM1           │');
  para('  │  ────── 6 mm slot / isolation barrier ──────         │');
  para('  │  ZONE B  ── Relay board K1 (8-ch) + per-ch fuses     │');
  para('  │  Output terminals J2 × 8                             │');
  para('  │  ────── 6 mm slot / isolation barrier ──────         │');
  para('  │  ZONE C  ── Low-voltage logic                        │');
  para('  │  PS1 SMPS, PS2 buck, PS3 SIM supply, ESP32 socket    │');
  para('  │  Sensor connectors J3 × 6, status LEDs, buzzer       │');
  para('  └──────────────────────────────────────────────────────┘');
  para('Cable glands enter from the bottom (PG1 × 6). Antenna cable exits via top SMA bulkhead.');

  // ---- 6. Safety ----
  if (y > 230) { doc.addPage(); y = 20; }
  section('6. Safety & Compliance Requirements');
  SAFETY_NOTES.forEach((n) => para('•  ' + n));

  // ---- 7. Test ----
  if (y > 230) { doc.addPage(); y = 20; }
  section('7. Factory Test Checklist');
  TEST_CHECKLIST.forEach((n, i) => para(`${i + 1}.  ${n}`));

  // ---- 8. Deliverables ----
  if (y > 230) { doc.addPage(); y = 20; }
  section('8. Deliverables Required from Manufacturer');
  [
    'Gerber (RS-274X) + drill files for the 2-layer PCB.',
    'Pick-and-place + BOM in CSV.',
    '3D STEP file of the assembled board.',
    'Hi-Pot and continuity test report per board (serialised).',
    'CE / EMC pre-compliance test report (radiated emissions class B).',
    'User-replaceable fuses clearly labelled on silkscreen and enclosure label.',
    'Each unit shipped with: 12 V SMPS, 6 sensor cables (DHT × 2, MQ × 1, YF × 1, ZMPT × 1, LDR × 1), GSM antenna, mounting screws, printed quick-start sheet.',
  ].forEach((n) => para('•  ' + n));

  // ---- Footer on every page ----
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `${PROJECT.vendor}  •  ${PROJECT.name}  •  ${PROJECT.version}`,
      margin,
      290,
    );
    doc.text(`Page ${i} / ${total}`, pageW - margin, 290, { align: 'right' });
  }

  doc.save(`FarmEye_PCB_Manufacturing_Spec_${PROJECT.productCode}.pdf`);
}

// ===========================================================================
// COMPONENT
// ===========================================================================

export function PCBManufacturingSpec() {
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
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
          <Button
            size="lg"
            onClick={handleDownload}
            disabled={busy}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 shrink-0"
          >
            {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
            PDF ডাউনলোড
          </Button>
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
    </div>
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
