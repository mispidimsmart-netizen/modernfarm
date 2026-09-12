/**
 * FarmEye Controller v8.3.0 — সম্পূর্ণ BOM (footprint + part number সহ)।
 * Flux.ai / JLCPCB / LCSC এ সরাসরি ইমপোর্ট করার জন্য উপযোগী।
 * পিন নম্বর ও কম্পোনেন্ট গণনা `src/data/fluxPcbGuide.ts` এর সাথে সামঞ্জস্যপূর্ণ থাকতে হবে।
 */

export type BomItem = {
  ref: string;          // Reference designator (U1, K1..K8, R1..)
  qty: number;
  value: string;        // Value / description
  mpn: string;          // Manufacturer part number
  manufacturer: string;
  footprint: string;    // KiCad/Flux footprint name
  mount: 'THT' | 'SMD' | 'Module';
  supplier: string;     // LCSC / Mouser / local
  supplierPn: string;
  note: string;         // বাংলা ব্যাখ্যা
};

export const BOM_REVISION = 'v8.3.0';
export const BOM_BOARD_NAME = 'FarmEye Controller v8';

export const BOM_ITEMS: BomItem[] = [
  // ── কোর ──
  {
    ref: 'U1', qty: 1, value: 'ESP32-WROOM-32 DevKit V1 (38-pin)', mpn: 'ESP32-DEVKITV1-38P',
    manufacturer: 'Espressif (generic)', footprint: 'Module_ESP32_DevKitV1_38P_2x19_2.54mm',
    mount: 'Module', supplier: 'LCSC', supplierPn: 'C473008',
    note: 'মূল কন্ট্রোলার — সোল্ডার নয়, ফিমেল হেডারে বসবে।',
  },
  {
    ref: 'J1,J2', qty: 2, value: '19-pin female header 2.54mm', mpn: 'PLS-19',
    manufacturer: 'Generic', footprint: 'PinHeader_1x19_P2.54mm_Vertical',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C124413',
    note: 'ESP32 DevKit খুলে-লাগানোর সকেট।',
  },
  {
    ref: 'U2', qty: 1, value: 'ULN2803A Darlington driver (relay opto/LED)', mpn: 'ULN2803APG',
    manufacturer: 'Toshiba', footprint: 'DIP-18_W7.62mm_Socket',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C7420',
    note: 'প্যানেল ইন্ডিকেটর LED ড্রাইভার — DIP সকেটে বসবে।',
  },
  {
    ref: 'XU2', qty: 1, value: 'DIP-18 IC socket', mpn: 'DIP-18-SOCKET',
    manufacturer: 'Generic', footprint: 'DIP-18_W7.62mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C72124',
    note: 'ULN2803A নষ্ট হলে সহজে বদলানোর জন্য।',
  },

  // ── পাওয়ার ──
  {
    ref: 'J3', qty: 1, value: 'DC barrel jack 5.5x2.1mm (5V/3A in)', mpn: 'DC-005-2.0A',
    manufacturer: 'Generic', footprint: 'BarrelJack_Horizontal',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C16214',
    note: 'বাইরের 5V/3A অ্যাডাপ্টার ইনপুট (বোর্ডে AC→DC নেই)।',
  },
  {
    ref: 'PS1', qty: 1, value: 'MP1584EN buck module (5V → 4.0V, 2A)', mpn: 'MP1584EN-MODULE',
    manufacturer: 'MPS (module)', footprint: 'Module_MP1584_22x17mm',
    mount: 'Module', supplier: 'LCSC', supplierPn: 'C143452',
    note: 'SIM800L এর জন্য 4.0V — 5V দিলে মডিউল পুড়বে।',
  },
  {
    ref: 'F1', qty: 1, value: 'Fuse holder + 10A 250VAC cartridge (5x20mm)', mpn: 'FH-5X20-PCB',
    manufacturer: 'Generic', footprint: 'Fuseholder_Cylinder-5x20mm_Littelfuse_560',
    mount: 'THT', supplier: 'Mouser', supplierPn: '576-0031.3811',
    note: 'AC লাইনে শর্ট প্রোটেকশন।',
  },
  {
    ref: 'RV1', qty: 1, value: 'MOV varistor 275VAC (14D471K)', mpn: 'S14K275',
    manufacturer: 'EPCOS/TDK', footprint: 'RV_Disc_D15mm_W4.4mm_P7.5mm',
    mount: 'THT', supplier: 'Mouser', supplierPn: '871-B72214S0271K101',
    note: 'বজ্রপাত/সার্জ শোষণ।',
  },
  {
    ref: 'C1', qty: 1, value: '1000µF / 16V electrolytic', mpn: 'EEUFR1C102',
    manufacturer: 'Panasonic', footprint: 'CP_Radial_D10.0mm_P5.00mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C3374',
    note: 'GSM এর 2A পিক কারেন্ট বাফার।',
  },
  {
    ref: 'C2', qty: 1, value: '100µF / 16V electrolytic', mpn: 'EEUFR1C101',
    manufacturer: 'Panasonic', footprint: 'CP_Radial_D6.3mm_P2.50mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C2686',
    note: '5V রেল স্মুথিং।',
  },
  {
    ref: 'C3-C10', qty: 8, value: '100nF X7R ceramic (decoupling)', mpn: 'CC0805KRX7R9BB104',
    manufacturer: 'YAGEO', footprint: 'C_0805_2012Metric',
    mount: 'SMD', supplier: 'LCSC', supplierPn: 'C49678',
    note: 'প্রতিটি IC ও কানেক্টরের পাশে ডিকাপলিং।',
  },
  {
    ref: 'TP1-TP8', qty: 8, value: 'Test point pad 1.5mm (3V3, 5V, 4V0, GND, TX, RX, ADC, RELAY_EN)',
    mpn: 'TESTPOINT-1.5MM', manufacturer: 'N/A', footprint: 'TestPoint_Pad_D1.5mm',
    mount: 'THT', supplier: 'N/A', supplierPn: '-',
    note: 'কমপ্লায়েন্স চেকলিস্ট অনুযায়ী প্রতিটি রেলে টেস্ট পয়েন্ট বাধ্যতামূলক।',
  },

  // ── রিলে সেকশন ──
  {
    ref: 'K1-K8', qty: 8, value: 'Relay SPDT 5V coil, 10A/250VAC', mpn: 'SRD-05VDC-SL-C',
    manufacturer: 'Songle', footprint: 'Relay_SPDT_SRD_Series_Form_C',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C39091',
    note: 'ফ্যান/হিটার/লাইট/ফগার/অ্যালার্ম/স্প্রিংকলার/সার্কুলেশন।',
  },
  {
    ref: 'OK1-OK8', qty: 8, value: 'Optocoupler PC817C', mpn: 'PC817X1CSP9F',
    manufacturer: 'Sharp', footprint: 'DIP-4_W7.62mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C6580',
    note: 'ESP32 ও রিলে ড্রাইভের মধ্যে গ্যালভানিক আইসোলেশন।',
  },
  {
    ref: 'D1-D8', qty: 8, value: 'Flyback diode 1N4007 1000V 1A', mpn: '1N4007',
    manufacturer: 'DiodesInc', footprint: 'D_DO-41_SOD81_P10.16mm_Horizontal',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C64898',
    note: 'রিলে কয়েলের ব্যাক-EMF শোষণ।',
  },
  {
    ref: 'Q1-Q8', qty: 8, value: 'NPN transistor 2N2222A (relay coil drive)', mpn: 'PN2222A',
    manufacturer: 'onsemi', footprint: 'TO-92_Inline',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C111607',
    note: 'অপ্টো আউটপুট থেকে রিলে কয়েল চালায়।',
  },
  {
    ref: 'R1-R8', qty: 8, value: '1kΩ 1/4W (opto LED series)', mpn: 'CFR-25JB-52-1K',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22935',
    note: 'PC817 ইনপুট কারেন্ট সীমিত করে।',
  },
  {
    ref: 'R9-R16', qty: 8, value: '4.7kΩ 1/4W (transistor base)', mpn: 'CFR-25JB-52-4K7',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C23162',
    note: 'ট্রানজিস্টর বেস রেজিস্টর।',
  },
  {
    ref: 'TB1-TB8', qty: 8, value: 'Screw terminal 3-pin 5.08mm (NO/COM/NC)', mpn: 'KF128-5.08-3P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_5.08mm_3x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C8280',
    note: 'প্রতিটি রিলের ২২০V আউটপুট তার।',
  },
  {
    ref: 'TB9', qty: 1, value: 'Screw terminal 2-pin 5.08mm (AC Live/Neutral in)', mpn: 'KF128-5.08-2P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_5.08mm_2x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C8279',
    note: 'রিলে COM ফিড AC ইনপুট (ফিউজের পরে)।',
  },
  {
    ref: 'TB10', qty: 1, value: 'Earth stud/terminal M4 + ring lug', mpn: 'EARTH-M4-STUD',
    manufacturer: 'Generic', footprint: 'MountingHole_4.3mm_M4_Pad',
    mount: 'THT', supplier: 'local', supplierPn: '-',
    note: 'বাক্স ও AC সেকশনের আর্থিং — নিরাপত্তার জন্য বাধ্যতামূলক।',
  },

  // ── সেন্সর ইনপুট ──
  {
    ref: 'TB11,TB12', qty: 2, value: 'Screw terminal 3-pin 3.5mm (DHT22 #1/#2)', mpn: 'KF128-3.5-3P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_3.5mm_3x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C474881',
    note: 'GPIO4 ও GPIO16 — VCC/DATA/GND।',
  },
  {
    ref: 'TB13', qty: 1, value: 'Screw terminal 4-pin 3.5mm (MQ-137 ammonia)', mpn: 'KF128-3.5-4P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_3.5mm_4x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C474882',
    note: '5V সেন্সর, AO → ডিভাইডার → GPIO34।',
  },
  {
    ref: 'TB14', qty: 1, value: 'Screw terminal 3-pin 3.5mm (ZMPT101B AC sense)', mpn: 'KF128-3.5-3P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_3.5mm_3x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C474881',
    note: 'GPIO35 (input-only)।',
  },
  {
    ref: 'TB15', qty: 1, value: 'Screw terminal 3-pin 3.5mm (YF-S201 water flow)', mpn: 'KF128-3.5-3P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_3.5mm_3x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C474881',
    note: 'পালস ইনপুট GPIO18, 10kΩ পুল-আপ।',
  },
  {
    ref: 'TB16', qty: 1, value: 'Screw terminal 2-pin 3.5mm (LDR, optional)', mpn: 'KF128-3.5-2P',
    manufacturer: 'Cixi Kefa', footprint: 'TerminalBlock_3.5mm_2x',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C474880',
    note: 'GPIO36 (VP) — 10kΩ ডিভাইডার।',
  },
  {
    ref: 'R17-R22', qty: 6, value: '10kΩ 1/4W pull-up (DHT x2, flow, button, GSM_RST, LDR)',
    mpn: 'CFR-25JB-52-10K', manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22859',
    note: 'সিগন্যাল স্থিতিশীল রাখে; SIM800L RST কে 3V3 এ ধরে রাখে।',
  },
  {
    ref: 'R23,R25,R27', qty: 3, value: '10kΩ divider top (MQ-137, LDR, ZMPT)', mpn: 'CFR-25JB-52-10K',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22859',
    note: '5V অ্যানালগ → ≤3.3V নামানোর ডিভাইডার।',
  },
  {
    ref: 'R24,R26,R28', qty: 3, value: '20kΩ divider bottom', mpn: 'CFR-25JB-52-20K',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22975',
    note: 'ADC পিন সুরক্ষার জন্য বাধ্যতামূলক।',
  },
  {
    ref: 'R29', qty: 1, value: '10kΩ pull-down on GPIO12 (boot strap)', mpn: 'CFR-25JB-52-10K',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22859',
    note: 'GPIO12 বুটে LOW না থাকলে ESP32 বুট হবে না।',
  },

  // ── GSM ──
  {
    ref: 'M1', qty: 1, value: 'SIM800L GSM module + header', mpn: 'SIM800L-V2',
    manufacturer: 'SIMCom (module)', footprint: 'Module_SIM800L_2x6_2.54mm',
    mount: 'Module', supplier: 'LCSC', supplierPn: 'C70535',
    note: 'সাপ্লাই 4.0V (PS1 থেকে), পাশে C1 1000µF।',
  },
  {
    ref: 'R30,R31', qty: 2, value: 'Level shift divider 1kΩ + 2.2kΩ (ESP TX → SIM RX)',
    mpn: 'CFR-25JB-52-2K2', manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22962',
    note: '3.3V → ~2.8V, SIM800L UART সেফ।',
  },
  {
    ref: 'ANT1', qty: 1, value: 'GSM antenna IPEX + SMA pigtail', mpn: 'GSM-ANT-IPEX',
    manufacturer: 'Generic', footprint: 'Conn_SMA_Edge',
    mount: 'THT', supplier: 'local', supplierPn: '-',
    note: 'বাক্সের বাইরে মাউন্ট করতে হবে।',
  },

  // ── ডিসপ্লে ও ইন্ডিকেটর (v8.3.0) ──
  {
    ref: 'DS1', qty: 1, value: 'ILI9341 2.8" SPI TFT 320x240', mpn: 'MSP2807',
    manufacturer: 'Generic', footprint: 'PinHeader_1x09_P2.54mm_Vertical',
    mount: 'Module', supplier: 'LCSC', supplierPn: 'C2887581',
    note: 'SCK=21, MOSI=22, CS=17, DC=5, RST→EN, LED→3V3+100Ω।',
  },
  {
    ref: 'R32', qty: 1, value: '100Ω 1/4W (TFT backlight series)', mpn: 'CFR-25JB-52-100R',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22775',
    note: 'ব্যাকলাইট কারেন্ট সীমিত (~100mA)।',
  },
  {
    ref: 'J4', qty: 1, value: 'IDC box header 2x5 2.54mm (panel LED ribbon)', mpn: 'IDC-10P-BOX',
    manufacturer: 'Generic', footprint: 'IDC-Header_2x05_P2.54mm_Vertical',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C3406',
    note: 'ঢাকনার LED বোর্ডে রিবন কেবল।',
  },
  {
    ref: 'LED1-LED10', qty: 10, value: 'Panel-mount LED 5mm + holder (8 relay + power + cloud)',
    mpn: 'LED-5MM-PANEL', manufacturer: 'Generic', footprint: 'LED_D5.0mm',
    mount: 'THT', supplier: 'local', supplierPn: '-',
    note: 'ULN2803A দিয়ে ড্রাইভ, প্রতিটিতে 470Ω।',
  },
  {
    ref: 'R33-R42', qty: 10, value: '470Ω 1/4W (panel LED series)', mpn: 'CFR-25JB-52-470R',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22812',
    note: 'প্যানেল LED কারেন্ট লিমিট।',
  },
  {
    ref: 'LED0', qty: 1, value: 'Onboard status LED green 3mm', mpn: 'LED-3MM-GRN',
    manufacturer: 'Generic', footprint: 'LED_D3.0mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C2296',
    note: 'GPIO2 স্ট্যাটাস LED + R43 330Ω।',
  },
  {
    ref: 'R43', qty: 1, value: '330Ω 1/4W (status LED)', mpn: 'CFR-25JB-52-330R',
    manufacturer: 'YAGEO', footprint: 'R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C22804',
    note: 'GPIO2 LED সিরিজ রেজিস্টর।',
  },
  {
    ref: 'SW1', qty: 1, value: 'Push button 6x6mm (manual override)', mpn: 'TS-1088-AR02016',
    manufacturer: 'XKB', footprint: 'SW_PUSH_6mm',
    mount: 'THT', supplier: 'LCSC', supplierPn: 'C393942',
    note: 'GPIO32 → GND, 10kΩ পুল-আপ + C11 100nF ডিবাউন্স।',
  },
  {
    ref: 'C11', qty: 1, value: '100nF debounce cap', mpn: 'CC0805KRX7R9BB104',
    manufacturer: 'YAGEO', footprint: 'C_0805_2012Metric',
    mount: 'SMD', supplier: 'LCSC', supplierPn: 'C49678',
    note: 'বাটনের বাউন্স দূর করে।',
  },

  // ── মেকানিক্যাল ──
  {
    ref: 'H1-H4', qty: 4, value: 'M3 mounting hole + nylon standoff', mpn: 'M3-STANDOFF-10MM',
    manufacturer: 'Generic', footprint: 'MountingHole_3.2mm_M3',
    mount: 'THT', supplier: 'local', supplierPn: '-',
    note: 'DIN/বাক্সে বোর্ড ফিক্স করার জন্য।',
  },
  {
    ref: 'ENC1', qty: 1, value: 'IP65 enclosure 250x200x100mm + DIN rail', mpn: 'IP65-250200100',
    manufacturer: 'Generic', footprint: 'N/A (mechanical)',
    mount: 'Module', supplier: 'local', supplierPn: '-',
    note: 'ধুলা/অ্যামোনিয়া থেকে সুরক্ষা; TFT ঢাকনায় বসবে।',
  },
];

export const BOM_TOTAL_QTY = BOM_ITEMS.reduce((sum, i) => sum + i.qty, 0);

/** BOM → CSV (JLCPCB/LCSC ইমপোর্ট-বান্ধব হেডার) */
export function bomToCsv(items: BomItem[] = BOM_ITEMS): string {
  const header = [
    'Designator', 'Qty', 'Value/Description', 'MPN', 'Manufacturer',
    'Footprint', 'Mount', 'Supplier', 'Supplier PN', 'Note',
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = items.map((i) =>
    [i.ref, i.qty, i.value, i.mpn, i.manufacturer, i.footprint, i.mount, i.supplier, i.supplierPn, i.note]
      .map(esc).join(','),
  );
  return [header.map(esc).join(','), ...rows].join('\n');
}
