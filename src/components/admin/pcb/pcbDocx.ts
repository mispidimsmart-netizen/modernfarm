import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  PROJECT, GPIO_MAP, BOM, POWER_TREE, SAFETY_NOTES, TEST_CHECKLIST,
  MAINS_TERMINALS, RELAY_OUTPUTS, WIRING_RULES, CONNECTOR_MAP,
} from './pcbData';

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

export async function generateDocx() {
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

export async function generateWiringDocx() {
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
