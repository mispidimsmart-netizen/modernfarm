import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PROJECT, GPIO_MAP, BOM, CONNECTOR_MAP } from './pcbData';

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

export async function generateGerberZip() {
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
