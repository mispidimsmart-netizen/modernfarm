/**
 * FarmEye v8 কন্ট্রোলার PCB — Flux.ai ডিজাইন গাইডের একক ডেটা উৎস।
 * সব পিন নম্বর হুবহু `public/esp32-industrial.ino` এর #define থেকে নেওয়া।
 * ফার্মওয়্যার বদলালে src/test/fluxPcbGuide.test.ts ফেল করবে।
 */

export type PinRow = {
  gpio: number;
  define: string;
  role: string;      // বাংলা ব্যাখ্যা
  group: 'relay' | 'sensor' | 'gsm' | 'display' | 'misc';
  note?: string;
};


export const FLUX_BOARD = 'ESP32-WROOM-32 DevKit V1 (38-pin)';

export const PIN_MAP: PinRow[] = [
  // ── 8-চ্যানেল রিলে ──
  { gpio: 25, define: 'FAN_RELAY_PIN', role: 'রিলে IN1 — এক্সহস্ট ফ্যান', group: 'relay' },
  { gpio: 26, define: 'CEILING_FAN_RELAY_PIN', role: 'রিলে IN2 — সিলিং ফ্যান', group: 'relay' },
  { gpio: 27, define: 'LIGHT_RELAY_PIN', role: 'রিলে IN3 — লাইট', group: 'relay' },
  { gpio: 14, define: 'HEATER_RELAY_PIN', role: 'রিলে IN4 — হিটার/ব্রুডার', group: 'relay' },
  { gpio: 12, define: 'FOGGER_RELAY_PIN', role: 'রিলে IN5 — ফগার সোলেনয়েড', group: 'relay', note: 'GPIO12 বুট স্ট্র্যাপিং পিন — বুটে LOW রাখতে হবে (পুল-ডাউন)' },
  { gpio: 13, define: 'ALARM_RELAY_PIN', role: 'রিলে IN6 — অ্যালার্ম/সাইরেন', group: 'relay' },
  { gpio: 15, define: 'SPRINKLER_RELAY_PIN', role: 'রিলে IN7 — ছাদের স্প্রিংকলার', group: 'relay', note: 'বুট স্ট্র্যাপিং পিন — বুটে HIGH থাকে' },
  { gpio: 33, define: 'CIRCULATION_RELAY_PIN', role: 'রিলে IN8 — সার্কুলেশন ফ্যান', group: 'relay' },

  // ── সেন্সর ──
  { gpio: 4, define: 'DHT_PIN', role: 'DHT22 #1 — তাপমাত্রা/আর্দ্রতা', group: 'sensor', note: '10kΩ পুল-আপ 3.3V এ' },
  { gpio: 16, define: 'DHT2_PIN', role: 'DHT22 #2 — দ্বিতীয় জোন', group: 'sensor', note: '10kΩ পুল-আপ 3.3V এ' },
  { gpio: 34, define: 'MQ135_PIN', role: 'MQ-137 অ্যামোনিয়া (AO — অ্যানালগ)', group: 'sensor', note: 'input-only পিন; সেন্সর 5V, AO তে ডিভাইডার দিয়ে ≤3.3V' },
  { gpio: 35, define: 'POWER_SENSE_PIN', role: 'ZMPT101B — AC ভোল্টেজ সেন্স', group: 'sensor', note: 'input-only পিন' },
  { gpio: 36, define: 'LDR_PIN', role: 'LDR — অ্যাম্বিয়েন্ট লাইট (ঐচ্ছিক)', group: 'sensor', note: 'VP / ADC1_CH0, input-only; 10kΩ ডিভাইডার' },
  { gpio: 18, define: 'WATER_FLOW_PIN', role: 'YF-S201 — পানি ফ্লো (পালস)', group: 'sensor', note: 'ইন্টারাপ্ট ইনপুট, 10kΩ পুল-আপ' },

  // ── GSM (SIM800L) ──
  { gpio: 23, define: 'GSM_TX_PIN', role: 'ESP32 TX → SIM800L RX', group: 'gsm', note: 'লেভেল শিফট/ডিভাইডার দিয়ে ~2.8V' },
  { gpio: 19, define: 'GSM_RX_PIN', role: 'ESP32 RX ← SIM800L TX', group: 'gsm' },

  // ── TFT ডিসপ্লে (ILI9341, HSPI রিম্যাপ) ──
  { gpio: 21, define: 'TFT_SCK_PIN', role: 'TFT SCK (SPI ক্লক)', group: 'display' },
  { gpio: 22, define: 'TFT_MOSI_PIN', role: 'TFT MOSI (SPI ডেটা)', group: 'display' },
  { gpio: 17, define: 'TFT_CS_PIN', role: 'TFT CS (চিপ সিলেক্ট)', group: 'display' },
  { gpio: 5, define: 'TFT_DC_PIN', role: 'TFT DC (ডেটা/কমান্ড)', group: 'display', note: 'আগে GSM_RST ছিল — এখন SIM800L RST 10kΩ পুল-আপে 3V3 এ বাঁধা, রিসেট হয় AT+CFUN=1,1 দিয়ে' },

  // ── অন্যান্য ──
  { gpio: 2, define: 'STATUS_LED_PIN', role: 'স্ট্যাটাস LED', group: 'misc', note: '330Ω সিরিজ রেজিস্টর' },
  { gpio: 32, define: 'MANUAL_OVERRIDE_BTN', role: 'ম্যানুয়াল ওভাররাইড বাটন', group: 'misc', note: 'পুশ বাটন → GND, 10kΩ পুল-আপ + 100nF ডিবাউন্স' },
];

export const GROUP_LABELS: Record<PinRow['group'], string> = {
  relay: '৮-চ্যানেল রিলে আউটপুট',
  sensor: 'সেন্সর ইনপুট',
  gsm: 'GSM মডিউল (SIM800L)',
  display: 'TFT ডিসপ্লে (ILI9341 2.4"/2.8")',
  misc: 'অন্যান্য',
};


export type StepItem = { title: string; what: string; done: string };

export const FLUX_STEPS: StepItem[] = [
  {
    title: 'ধাপ ১ — অ্যাকাউন্ট ও প্রজেক্ট তৈরি',
    what: 'flux.ai তে গিয়ে ফ্রি অ্যাকাউন্ট খুলুন → "New Project" → নাম দিন FarmEye_Ctrl_v8 → Blank Project বেছে নিন।',
    done: 'স্ক্রিনে ফাঁকা স্কিম্যাটিক শিট এবং ডান পাশে "Copilot" চ্যাট বক্স দেখা যাবে।',
  },
  {
    title: 'ধাপ ২ — স্কিম্যাটিক প্রম্পট পেস্ট',
    what: 'নিচের "স্কিম্যাটিক নেট-লিস্ট প্রম্পট" কপি করে Copilot চ্যাটে পেস্ট করে Enter দিন।',
    done: 'Copilot কম্পোনেন্ট বসিয়ে তারের (net) সংযোগ তৈরি করবে; কোনো প্রশ্ন করলে উত্তর দিন।',
  },
  {
    title: 'ধাপ ৩ — পিন যাচাই (সবচেয়ে জরুরি)',
    what: 'নিচের পিন ম্যাপ টেবিলের সাথে স্কিম্যাটিকের প্রতিটি GPIO এক এক করে মেলান।',
    done: 'প্রতিটি রিলে/সেন্সরের GPIO নম্বর টেবিলের সাথে ১০০% মিলে গেছে। এক পিনে দুটি কাজ নেই।',
  },
  {
    title: 'ধাপ ৪ — পার্ট/ফুটপ্রিন্ট নির্বাচন',
    what: 'প্রতিটি কম্পোনেন্টে ক্লিক করে বাস্তবে কেনা যায় এমন পার্ট (JLCPCB/LCSC স্টকে আছে) বেছে নিন। স্ক্রু টার্মিনালের পিচ 5.08mm রাখুন।',
    done: 'কোনো কম্পোনেন্টে লাল "No footprint" সতর্কতা নেই।',
  },
  {
    title: 'ধাপ ৫ — বোর্ড লেআউট',
    what: '"PCB" ভিউতে যান → বোর্ড আউটলাইন ১২০ × ১০০ mm → নিচের "লেআউট প্রম্পট" পেস্ট করুন → কম্পোনেন্ট সাজিয়ে রাউট করুন।',
    done: 'বোর্ডের এক পাশে 220V রিলে/টার্মিনাল, অন্য পাশে ESP32 ও সেন্সর; মাঝে পরিষ্কার ফাঁকা জায়গা।',
  },
  {
    title: 'ধাপ ৬ — DRC (ডিজাইন রুল চেক)',
    what: '"রিভিউ/DRC প্রম্পট" পেস্ট করুন এবং Flux-এর DRC টুল চালান। প্রতিটি ত্রুটি ঠিক করুন।',
    done: 'DRC রিপোর্টে ০ error। শুধু warning থাকলে কারণ বুঝে নিন।',
  },
  {
    title: 'ধাপ ৭ — ফাইল এক্সপোর্ট ও অর্ডার',
    what: 'File → Export → Gerber + Drill (ZIP), BOM (CSV), Pick & Place (CSV), Schematic (PDF)। ZIP ফাইলটি JLCPCB বা PCBWay তে আপলোড করুন।',
    done: 'প্রস্তুতকারকের অনলাইন প্রিভিউতে বোর্ডের ছবি ঠিকঠাক দেখাচ্ছে এবং দাম দেখাচ্ছে।',
  },
];

export type ComponentItem = { name: string; qty: string; why: string };

export const COMPONENTS: ComponentItem[] = [
  { name: 'ESP32-WROOM-32 DevKit V1 (38-pin) — ফিমেল হেডার', qty: '১ সেট', why: 'মূল "মস্তিষ্ক"। সোল্ডার না করে হেডারে বসানো হয় যাতে নষ্ট হলে সহজে বদলানো যায়।' },
  { name: '৮-চ্যানেল রিলে মডিউল হেডার (অথবা অনবোর্ড রিলে + ULN2803A ড্রাইভার)', qty: '১', why: 'ESP32 এর ছোট সিগন্যাল দিয়ে ফ্যান/হিটার/লাইটের ২২০V লাইন চালু-বন্ধ করে।' },
  { name: 'অপ্টোকাপলার PC817 + 1kΩ রেজিস্টর', qty: '৮', why: 'রিলের দিক থেকে আসা নয়েজ/হাই ভোল্টেজ যেন ESP32 এ না আসে — বৈদ্যুতিক আলাদাকরণ।' },
  { name: 'ফ্লাইব্যাক ডায়োড 1N4007', qty: '৮', why: 'রিলে বন্ধ হওয়ার সময়কার উল্টো ভোল্টেজ শোষণ করে, নাহলে ESP32 রিসেট হয়।' },
  { name: 'স্ক্রু টার্মিনাল 5.08mm (২-পিন/৩-পিন)', qty: '~১২', why: 'বাইরের তার (২২০V লাইন, সেন্সর) স্ক্রু দিয়ে শক্ত করে লাগানোর জন্য।' },
  { name: 'DC ব্যারেল জ্যাক + 5V/3A বাহ্যিক অ্যাডাপ্টার ইনপুট', qty: '১', why: 'বোর্ডে সরাসরি ২২০V→DC না এনে বাইরের অ্যাডাপ্টার ব্যবহার — নিরাপদ ও UPS লাগানো সহজ।' },
  { name: 'বাক কনভার্টার MP1584 (5V → 4.0V, ২A)', qty: '১', why: 'SIM800L GSM মডিউল ৩.৭–৪.২V চায়; 5V দিলে পুড়ে যায়।' },
  { name: 'ইলেক্ট্রোলাইটিক ক্যাপাসিটর 1000µF/16V + 100µF', qty: '২', why: 'GSM কল/SMS পাঠানোর সময় হঠাৎ ২A কারেন্ট টানে — ক্যাপ না থাকলে ESP32 রিবুট হয়।' },
  { name: '100nF সিরামিক ক্যাপ (ডিকাপলিং)', qty: '~৮', why: 'প্রতিটি IC-র পাশে বসিয়ে বিদ্যুতের ছোট ওঠানামা মসৃণ করে।' },
  { name: 'রেজিস্টর 10kΩ (পুল-আপ)', qty: '~৬', why: 'DHT22, ফ্লো সেন্সর ও বাটনের সিগন্যাল স্থির রাখে।' },
  { name: 'ভোল্টেজ ডিভাইডার রেজিস্টর জোড়া (10kΩ + 20kΩ)', qty: '৩ জোড়া', why: 'MQ-137 (5V) ও LDR-এর আউটপুট ৩.৩V এর নিচে নামায় — নাহলে ESP32-র ADC পিন নষ্ট হয়।' },
  { name: 'ফিউজ হোল্ডার + 10A ফিউজ (AC লাইনে)', qty: '১', why: 'শর্ট সার্কিট হলে আগুন লাগার আগেই লাইন কেটে দেয়।' },
  { name: 'MOV 275V (ভ্যারিস্টর)', qty: '১', why: 'বজ্রপাত/স্পাইক ভোল্টেজ থেকে বোর্ড বাঁচায়।' },
  { name: 'স্ট্যাটাস LED (সবুজ) + 330Ω', qty: '১', why: 'বোর্ড চলছে কিনা এক নজরে বোঝার জন্য।' },
  { name: 'পুশ বাটন (ম্যানুয়াল ওভাররাইড) + 100nF', qty: '১', why: 'ইন্টারনেট না থাকলে হাতে ফ্যান/লাইট চালু করার জন্য।' },
  { name: 'মাউন্টিং হোল M3', qty: '৪', why: 'বোর্ড বাক্সে স্ক্রু দিয়ে আটকানোর জন্য।' },
];

export const EXPORT_FILES: { file: string; why: string }[] = [
  { file: 'Gerber ZIP (RS-274X) — সব লেয়ার', why: 'বোর্ডের "নকশা"। প্রস্তুতকারক এটা দিয়েই তামার লাইন ছাপে। সবচেয়ে জরুরি ফাইল।' },
  { file: 'NC Drill ফাইল (.drl / Excellon)', why: 'কোথায় কত মিলিমিটার ছিদ্র হবে তার তালিকা।' },
  { file: 'BOM (Bill of Materials) — CSV', why: 'কোন কম্পোনেন্ট কয়টা লাগবে তার তালিকা। অ্যাসেম্বলি সার্ভিস নিলে বাধ্যতামূলক।' },
  { file: 'Pick & Place / CPL — CSV', why: 'কোন কম্পোনেন্ট বোর্ডের কোন জায়গায় কোন দিকে বসবে। মেশিনে সোল্ডার করাতে লাগে।' },
  { file: 'Schematic PDF', why: 'সার্কিটের নকশা — ইঞ্জিনিয়ার রিভিউ ও ভবিষ্যতে মেরামতের জন্য।' },
  { file: 'বোর্ড আউটলাইন / মেকানিক্যাল ড্রয়িং (DXF/PDF)', why: 'বাক্স (enclosure) বানাতে মাপ লাগে।' },
  { file: 'Assembly README (টেক্সট)', why: 'বিশেষ নির্দেশনা — যেমন "AC সেকশনে স্লট কাটতে হবে", সিল্কস্ক্রিনে Nexiot Labs।' },
];

export const FINAL_CHECKLIST: string[] = [
  'প্রতিটি GPIO নম্বর পিন ম্যাপ টেবিলের সাথে হুবহু মিলেছে, কোনো পিন দুইবার ব্যবহার হয়নি।',
  'GPIO 34/35/36 শুধু ইনপুট — ওখানে কোনো আউটপুট/রিলে সংযুক্ত করা হয়নি।',
  'GPIO 12 এ পুল-ডাউন আছে (বুটে LOW), GPIO 15 ও GPIO 5 বুটে HIGH থাকে।',
  'MQ-137 ও LDR-এর অ্যানালগ লাইনে ভোল্টেজ ডিভাইডার আছে (৩.৩V এর বেশি নয়)।',
  'প্রতিটি রিলেতে ফ্লাইব্যাক ডায়োড ও অপ্টো আইসোলেশন আছে।',
  'AC (২২০V) ট্র্যাক ও DC অংশের মাঝে ন্যূনতম ৩ mm ফাঁক এবং কাটা স্লট আছে।',
  'AC ট্র্যাকের প্রস্থ ≥ ২.৫ mm (১০A এর জন্য), সোল্ডার মাস্ক খোলা রেখে টিন করার ব্যবস্থা।',
  'SIM800L এর পাশে 1000µF ক্যাপ আছে এবং সরবরাহ 4.0V (5V নয়)।',
  'সেন্সর কানেক্টর পাওয়ার সাপ্লাই/রিলের তাপ থেকে দূরে বসানো হয়েছে।',
  'সিল্কস্ক্রিনে বোর্ডের নাম, সংস্করণ (v8) এবং "Nexiot Labs" লেখা আছে।',
  'DRC রিপোর্টে ০টি error।',
];

// ── কপি-পেস্ট প্রম্পট (ফার্মওয়্যার-মিলানো) ──

const relayLines = PIN_MAP.filter((p) => p.group === 'relay')
  .map((p, i) => `- Relay IN${i + 1} <- ESP32 GPIO${p.gpio} (${p.define})`)
  .join('\n');

export const PROMPT_SCHEMATIC = `You are a senior hardware engineer. Create a professional-grade schematic for an industrial poultry-farm controller board named "FarmEye Controller v8" by Nexiot Labs.

MCU: ${FLUX_BOARD} mounted on female headers (through-hole, not soldered down).
Power input: EXTERNAL 5V / 3A DC adapter via barrel jack (DO NOT put any AC-DC converter on this board).
Add reverse-polarity protection (P-MOSFET) and a 5V input fuse (2A resettable).

=== 8-CHANNEL RELAY OUTPUTS (active-LOW opto-isolated) ===
${relayLines}
Each relay channel: PC817 optocoupler + 1k series resistor, ULN2803A driver, 1N4007 flyback diode, 10A/250VAC relay, 5.08mm screw terminal (COM/NO/NC).
GPIO12 must have a 10k pull-down (boot strapping pin). GPIO15 and GPIO5 must idle HIGH at boot.

=== SENSOR INPUTS ===
- DHT22 #1 data -> GPIO4 (10k pull-up to 3V3), 3-pin screw terminal
- DHT22 #2 data -> GPIO16 (10k pull-up to 3V3), 3-pin screw terminal
- MQ-137 ammonia analog AO -> GPIO34 via 10k/20k divider (sensor powered from 5V, heater current up to 150mA), input-only pin
- ZMPT101B AC voltage sense output -> GPIO35 (input-only), 3-pin header, add 3V3 clamp diodes
- LDR ambient light -> GPIO36 (VP, ADC1_CH0) via 10k divider to 3V3, 2-pin terminal, optional/DNP-friendly
- YF-S201 water-flow pulse -> GPIO18 with 10k pull-up to 3V3 and 100nF filter, 3-pin terminal

=== GSM MODULE (SIM800L) ===
- ESP32 GPIO23 (TX) -> SIM800L RXD through 1k/2k divider (3.3V -> ~2.8V)
- SIM800L TXD -> ESP32 GPIO19 (RX) direct
- ESP32 GPIO5 -> SIM800L RST
- SIM800L VCC from a dedicated MP1584 buck set to 4.0V / 2A fed from the 5V input
- Add 1000uF/16V electrolytic + 100uF + 100nF right at the SIM800L supply pins
- Provide a 2.54mm header for the SIM800L module and an SMA/IPEX antenna pad

=== MISC ===
- Status LED (green) on GPIO2 with 330R
- Manual override push button on GPIO32 to GND, 10k pull-up to 3V3, 100nF debounce
- 100nF decoupling near every IC; common GND star point near the barrel jack
- 4x M3 mounting holes, board size 120 x 100 mm

Constraints: do NOT reassign any GPIO. Every net name must state the function (e.g. RLY_EXHAUST_GPIO25). Use parts that are in stock at LCSC/JLCPCB. Add a title block: "FarmEye Controller v8 — Nexiot Labs".`;

export const PROMPT_LAYOUT = `Now lay out the PCB for "FarmEye Controller v8" like a professional EMC-aware industrial design.

Board: 2-layer, 1.6mm FR4, 2oz copper, 120 x 100 mm, HASL finish, green mask, white silkscreen.

Zoning (strict):
1. Right-hand third = MAINS ZONE: all 8 relays, AC screw terminals, fuse holder, MOV.
2. Left-hand two-thirds = LOW VOLTAGE ZONE: ESP32, sensors, SIM800L, buck converter.
3. Between the zones keep a >= 3 mm clearance corridor with a milled slot (routed cutout) under the optocouplers.

Rules:
- AC traces >= 2.5 mm wide for 10A, mask-opened and tinned; no AC copper under the ESP32.
- 5V rail >= 1.5 mm, 3V3 rail >= 0.8 mm, signal traces 0.3 mm.
- Solid GND pour on the bottom layer for the low-voltage zone only; do NOT pour ground into the mains zone.
- Place the 1000uF bulk cap within 10 mm of the SIM800L supply pins; keep GSM RF away from analog sensor traces.
- Keep the analog nets (GPIO34/35/36) short, away from relay traces and from the buck converter switch node.
- Place sensor screw terminals on the board edge far from the relay/heat area.
- Silkscreen: label every terminal in plain words (EXHAUST FAN, CEILING FAN, LIGHT, HEATER, FOGGER, ALARM, SPRINKLER, CIRCULATION), mark AC danger with a warning triangle, print "FarmEye Controller v8 — Nexiot Labs".
- 4x M3 mounting holes 5 mm from each corner, keep-out 6 mm radius.`;

export const PROMPT_REVIEW = `Act as an independent senior PCB review engineer and audit this "FarmEye Controller v8" design before manufacturing. Report findings as a numbered list with severity (BLOCKER / MAJOR / MINOR).

Check specifically:
1. Every ESP32 GPIO assignment against this list: relays 25,26,27,14,12,13,15,33; sensors DHT22=4 and 16, MQ-137=34, ZMPT101B=35, LDR=36, flow=18; GSM TX=23, RX=19, RST=5; LED=2; override button=32. Flag any conflict or duplicate.
2. GPIO34/35/36 are input-only — confirm nothing drives them.
3. Boot strapping pins: GPIO12 must be LOW at boot, GPIO15/GPIO5 HIGH, GPIO2 must not be held HIGH by the LED circuit during boot.
4. Mains clearance and creepage >= 3 mm, AC trace ampacity for 10A, fuse and MOV placement.
5. SIM800L supply: 4.0V rail, bulk capacitance, inrush handling, level shifting on the UART.
6. ADC input protection: no node can exceed 3.3V.
7. Flyback diodes and opto isolation present on all 8 relay channels.
8. Thermal: relay coil heat and buck converter heat away from DHT22/MQ-137 terminals.
9. Ground strategy, decoupling, and EMI on the switching node.
10. DFM: minimum trace/space, annular ring, silkscreen over pads, footprint availability at LCSC.

Then run DRC and list every clearance violation in the mains section with its coordinates.`;

export const PROMPTS: { id: string; title: string; hint: string; text: string }[] = [
  { id: 'schematic', title: '১. স্কিম্যাটিক নেট-লিস্ট প্রম্পট', hint: 'ধাপ ২ — Copilot চ্যাটে প্রথমে এটি পেস্ট করুন', text: PROMPT_SCHEMATIC },
  { id: 'layout', title: '২. লেআউট ও রাউটিং প্রম্পট', hint: 'ধাপ ৫ — স্কিম্যাটিক ঠিক হওয়ার পর', text: PROMPT_LAYOUT },
  { id: 'review', title: '৩. প্রফেশনাল রিভিউ ও DRC প্রম্পট', hint: 'ধাপ ৬ — অর্ডারের আগে বাধ্যতামূলক', text: PROMPT_REVIEW },
];
