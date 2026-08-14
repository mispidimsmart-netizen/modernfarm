/**
 * Flux.ai ডিজাইন প্যাকেজ — সব ইনপুট/আউটপুট ফাইল একটি ZIP এ।
 * অ্যাডমিন → PCB ডিজাইন ট্যাব থেকে এক ক্লিকে ডাউনলোড।
 */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  FLUX_BOARD,
  PIN_MAP,
  GROUP_LABELS,
  COMPONENTS,
  EXPORT_FILES,
  FINAL_CHECKLIST,
  COMPLIANCE_CHECKLIST,
  PROMPTS,
} from '@/data/fluxPcbGuide';
import { BOM_ITEMS, BOM_REVISION, BOM_BOARD_NAME, BOM_TOTAL_QTY, bomToCsv } from '@/data/fluxBom';

const stamp = () => new Date().toISOString().slice(0, 10);

export function buildPinMapCsv(): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['GPIO', 'Define', 'Group', 'Role', 'Note'].map(esc).join(',');
  const rows = PIN_MAP.map((p) =>
    [p.gpio, p.define, GROUP_LABELS[p.group], p.role, p.note ?? ''].map(esc).join(','),
  );
  return [header, ...rows].join('\n');
}

export function buildNetlistHints(): string {
  const lines = [
    `# ${BOM_BOARD_NAME} (${BOM_REVISION}) — Net / connection hints for Flux.ai`,
    `# Board: ${FLUX_BOARD}`,
    '',
    ...PIN_MAP.map((p) => `U1.GPIO${p.gpio}  ->  ${p.define}  # ${p.role}${p.note ? ` | ${p.note}` : ''}`),
    '',
    '# Power nets: VIN_5V (J3) -> U1.VIN, ULN2803A.COM, relay coils',
    '# PS1 (MP1584) : 5V -> 4V0 for M1 (SIM800L), C1 1000uF at M1 VCC',
    '# AC section   : TB9(L) -> F1 -> RV1 -> K1..K8 COM ; earth stud TB10',
    '# Isolation    : >=3mm air / >=8mm creepage + milled slot between AC and DC',
  ];
  return lines.join('\n');
}

export function buildComplianceMarkdown(): string {
  const sev: Record<string, string> = { blocker: 'BLOCKER', major: 'MAJOR', advisory: 'ADVISORY' };
  const out: string[] = [`# Compliance checklist — ${BOM_BOARD_NAME} ${BOM_REVISION}`, ''];
  for (const section of COMPLIANCE_CHECKLIST) {
    out.push(`## ${section.title}`);
    for (const item of section.items) out.push(`- [ ] (${sev[item.severity]}) ${item.text}`);
    out.push('');
  }
  out.push('## Final design checklist', ...FINAL_CHECKLIST.map((c) => `- [ ] ${c}`));
  return out.join('\n');
}

export function buildPromptsText(): string {
  return PROMPTS.map((p) => `${'='.repeat(70)}\n# ${p.title}\n# ${p.hint}\n${'='.repeat(70)}\n\n${p.text}`)
    .join('\n\n\n');
}

export function buildReadme(): string {
  return [
    `# ${BOM_BOARD_NAME} — Flux.ai design package (${BOM_REVISION})`,
    `Generated: ${stamp()} | Nexiot Labs`,
    '',
    `Board: ${FLUX_BOARD}`,
    `BOM lines: ${BOM_ITEMS.length} | Total parts: ${BOM_TOTAL_QTY}`,
    '',
    '## প্যাকেজে যা আছে',
    '- `01_BOM/bom_full.csv` — সম্পূর্ণ BOM (designator, MPN, footprint, supplier PN)',
    '- `01_BOM/bom_readable.md` — বাংলা ব্যাখ্যাসহ পার্টস তালিকা',
    '- `02_PinMap/pin_map.csv` — ESP32 GPIO ↔ ফাংশন ম্যাপ (ফার্মওয়্যারের সাথে হুবহু)',
    '- `02_PinMap/netlist_hints.txt` — Flux.ai এ নেট বানানোর গাইড',
    '- `03_Prompts/flux_prompts.txt` — Schematic / Layout / Review / Compliance প্রম্পট',
    '- `04_Compliance/compliance_checklist.md` — ERC/DRC, clearance, protection, coating, test point',
    '- `05_Manufacturing/required_outputs.md` — ফ্যাব হাউসে যে ফাইলগুলো পাঠাতে হবে',
    '- `05_Manufacturing/assembly_notes.md` — অ্যাসেম্বলি নির্দেশনা',
    '',
    '## ব্যবহারের ধাপ',
    '1. Flux.ai এ নতুন প্রজেক্ট খুলে `03_Prompts` এর Schematic প্রম্পট Copilot এ পেস্ট করুন।',
    '2. `01_BOM/bom_full.csv` ইমপোর্ট করে পার্ট/ফুটপ্রিন্ট মিলিয়ে নিন।',
    '3. `02_PinMap` ধরে প্রতিটি নেট যাচাই করুন — কোনো GPIO দুইবার নয়।',
    '4. Layout প্রম্পট চালান, তারপর Compliance প্রম্পট দিয়ে অডিট করুন।',
    '5. `04_Compliance` চেকলিস্টে ০টি BLOCKER থাকলে `05_Manufacturing` অনুযায়ী ফাইল এক্সপোর্ট করুন।',
    '',
    '> সতর্কতা: বোর্ডে অনবোর্ড AC→DC নেই। 5V/3A বাহ্যিক অ্যাডাপ্টার বাধ্যতামূলক।',
  ].join('\n');
}

function buildBomReadable(): string {
  const out = [`# BOM (বাংলা) — ${BOM_BOARD_NAME} ${BOM_REVISION}`, ''];
  for (const i of BOM_ITEMS) {
    out.push(`## ${i.ref} — ${i.value} (x${i.qty})`);
    out.push(`- Part: ${i.mpn} (${i.manufacturer})`);
    out.push(`- Footprint: ${i.footprint} · ${i.mount}`);
    out.push(`- Supplier: ${i.supplier} ${i.supplierPn}`);
    out.push(`- কেন: ${i.note}`, '');
  }
  out.push('---', '## গাইডের সংক্ষিপ্ত পার্টস ব্যাখ্যা', '');
  for (const c of COMPONENTS) out.push(`- **${c.name}** — ${c.qty} — ${c.why}`);
  return out.join('\n');
}

function buildRequiredOutputs(): string {
  return [
    `# Manufacturing outputs — ${BOM_BOARD_NAME} ${BOM_REVISION}`,
    '',
    'Flux.ai থেকে এক্সপোর্ট করে ফ্যাব হাউসে পাঠাতে হবে:',
    '',
    ...EXPORT_FILES.map((f, idx) => `${idx + 1}. **${f.file}**\n   - ${f.why}`),
  ].join('\n');
}

function buildAssemblyNotes(): string {
  return [
    `# Assembly notes — ${BOM_BOARD_NAME} ${BOM_REVISION}`,
    '',
    '- ESP32 DevKit সরাসরি সোল্ডার নয় — 2x19 ফিমেল হেডারে বসাতে হবে।',
    '- ULN2803A DIP-18 সকেটে বসাতে হবে (মাঠে বদলানোর সুবিধার্থে)।',
    '- AC সেকশনে (F1, RV1, TB9, K1..K8 COM) সোল্ডার মাস্ক খোলা রেখে অতিরিক্ত টিন করতে হবে (10A)।',
    '- AC ও DC অংশের মাঝে মিলিং স্লট থাকতে হবে; ন্যূনতম 3mm air / 8mm creepage।',
    '- অ্যাসেম্বলির পর কনফরমাল কোটিং দিতে হবে (অ্যামোনিয়া/আর্দ্রতা), তবে কানেক্টর, ফিউজ হোল্ডার, হেডার ও টেস্ট পয়েন্ট মাস্ক করতে হবে।',
    '- সিল্কস্ক্রিনে: বোর্ড নাম, সংস্করণ, "Nexiot Labs", AC উচ্চ-ভোল্টেজ সতর্কতা চিহ্ন।',
    '- প্রথম পাওয়ার-আপ: ESP32 ও SIM800L না বসিয়ে শুধু রেল ভোল্টেজ (5V, 4.0V, 3V3) টেস্ট পয়েন্টে যাচাই করুন।',
  ].join('\n');
}

/** সব ফাইল সহ ZIP তৈরি করে (ব্রাউজারে ডাউনলোড ট্রিগার ছাড়া) */
export async function buildFluxPackageBlob(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('README.md', buildReadme());
  zip.file('01_BOM/bom_full.csv', bomToCsv());
  zip.file('01_BOM/bom_readable.md', buildBomReadable());
  zip.file('02_PinMap/pin_map.csv', buildPinMapCsv());
  zip.file('02_PinMap/netlist_hints.txt', buildNetlistHints());
  zip.file('03_Prompts/flux_prompts.txt', buildPromptsText());
  zip.file('04_Compliance/compliance_checklist.md', buildComplianceMarkdown());
  zip.file('05_Manufacturing/required_outputs.md', buildRequiredOutputs());
  zip.file('05_Manufacturing/assembly_notes.md', buildAssemblyNotes());
  return zip.generateAsync({ type: 'blob' });
}

export const FLUX_PACKAGE_FILENAME = `FarmEye_v8_Flux_Design_Package_${stamp()}.zip`;

export async function downloadFluxPackage(): Promise<string> {
  const blob = await buildFluxPackageBlob();
  saveAs(blob, FLUX_PACKAGE_FILENAME);
  return FLUX_PACKAGE_FILENAME;
}

export function downloadSingleFile(name: string, content: string, mime = 'text/plain;charset=utf-8') {
  saveAs(new Blob([content], { type: mime }), name);
}
