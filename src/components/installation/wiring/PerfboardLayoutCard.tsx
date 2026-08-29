import { useRef, useState } from 'react';
import { CircuitBoard } from 'lucide-react';

import perfboardAssembled from '@/assets/perfboard-assembled.jpg';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/**
 * v8 — Double Sided FR-4 PCB Prototype Board (12 × 18 cm) এর উপর
 * ESP32, রিলে, ফিউজ, সেন্সর, ডিসপ্লে সহ সম্পূর্ণ প্লেসমেন্ট ও ওয়্যারিং ম্যাপ।
 * স্কেল: 5 px = 1 mm  →  600 × 900 viewBox = 120 × 180 mm
 */

const SENSOR_BLOCKS = [
  { y: 120, label: 'J4 · DHT22 #1', pin: 'DATA → GPIO4', color: '#22c55e' },
  { y: 210, label: 'J5 · DHT22 #2', pin: 'DATA → GPIO16', color: '#22c55e' },
  { y: 300, label: 'J6 · MQ-137 NH₃', pin: 'AO → GPIO34', color: '#a855f7' },
  { y: 390, label: 'J7 · ZMPT101B', pin: 'AO → GPIO35', color: '#a855f7' },
  { y: 480, label: 'J8 · YF-S201 ফ্লো', pin: 'PULSE → GPIO18', color: '#0ea5e9' },
  { y: 570, label: 'J9 · LDR + 10kΩ', pin: 'AO → GPIO36 (VP)', color: '#f59e0b' },
  { y: 660, label: 'J10 · ম্যানুয়াল সুইচ', pin: 'GPIO32 (PULLUP)', color: '#64748b' },
];

const RELAY_ROWS = [
  { n: 'IN1', gpio: 'GPIO25', fn: 'এক্সহস্ট ফ্যান' },
  { n: 'IN2', gpio: 'GPIO26', fn: 'সিলিং ফ্যান' },
  { n: 'IN3', gpio: 'GPIO27', fn: 'লাইট' },
  { n: 'IN4', gpio: 'GPIO14', fn: 'হিটার' },
  { n: 'IN5', gpio: 'GPIO12', fn: 'ফগার' },
  { n: 'IN6', gpio: 'GPIO13', fn: 'অ্যালার্ম' },
  { n: 'IN7', gpio: 'GPIO15', fn: 'রুফ স্প্রিংকলার' },
  { n: 'IN8', gpio: 'GPIO33', fn: 'সার্কুলেশন ফ্যান' },
];

const PLACEMENT = [
  ['উপরে বাম (0–35 mm)', 'J1 AC 220V স্ক্রু টার্মিনাল + FBH-01/CH141 ফিউজ হোল্ডার (5A গ্লাস ফিউজ)। AC ট্র্যাক শুধু বোর্ডের নিচের তামার লেয়ারে, কমপক্ষে ৩ mm ফাঁক রাখুন।'],
  ['উপরে মাঝ (25–45 mm)', 'LM2596 বাক মডিউল (12V IN → 5.0V OUT)। আগে মাল্টিমিটারে 5.0V সেট করে তারপর ESP32 লাগাবেন।'],
  ['মাঝ বরাবর (48–115 mm)', 'ESP32-WROOM-32 DevKit V1 (38-পিন) — দুই সারি ফিমেল হেডারে বসান, সরাসরি সোল্ডার করবেন না।'],
  ['বাম কলাম', 'সব সেন্সর স্ক্রু টার্মিনাল (DHT22 ×2, MQ-137, ZMPT101B, YF-S201, LDR, ম্যানুয়াল সুইচ)।'],
  ['ডান কলাম', 'রিলে সিগন্যাল হেডার IN1–IN8 (+ VCC/GND), বাজার/স্ট্যাটাস LED, 5V/3.3V/12V আউট টার্মিনাল।'],
  ['নিচে ডান (120–140 mm)', 'ILI9341 2.8" TFT SPI ডিসপ্লে হেডার — CS=GPIO17, DC=GPIO5, SCK=GPIO21, MOSI=GPIO22, RST=ESP32 EN/3.3V, VCC+LED=3.3V।'],
  ['নিচে মাঝ (146–158 mm)', 'ULN2803A DIP-18 (ঐচ্ছিক ড্রাইভার) + 1000µF ক্যাপাসিটর ESP32 VIN–GND এর পাশে।'],
];

const STEPS = [
  'বোর্ডে প্রথমে সব ফিমেল হেডার ও স্ক্রু টার্মিনাল বসিয়ে সোল্ডার করুন (কম্পোনেন্ট আগে, তার পরে)।',
  'GND বাস (কালো) — বাম গাটারে উপর থেকে নিচ পর্যন্ত একটি মোটা তামার তার/টিনের রেল বানান। সব GND এখানেই আসবে।',
  '3.3V (সবুজ) ও 5V (লাল) রেল একইভাবে বানান — 3.3V আসবে ESP32 এর 3V3 পিন থেকে, 5V আসবে LM2596 OUT+ থেকে।',
  'AC: 220V L → MCB → ফিউজ হোল্ডার → 12V অ্যাডাপ্টার L; N সরাসরি অ্যাডাপ্টার N। ফিউজ শুধু ফেজেই।',
  '12V DC → LM2596 IN+/IN− ; LM2596 OUT+ → ESP32 VIN, OUT− → GND রেল। VIN–GND এ 1000µF ক্যাপ (+ লম্বা পা VIN এ)।',
  'রিলে মডিউলের VCC = 5V রেল, GND = GND রেল, IN1–IN8 = উপরের GPIO টেবিল অনুযায়ী। JD-VCC জাম্পার খুলে আলাদা 12V/5V দিন।',
  'সেন্সরগুলো বাম টার্মিনাল থেকে সংক্ষিপ্ততম পথে ESP32 পিনে টানুন; অ্যানালগ তার (MQ-137, ZMPT101B, LDR) রিলে/AC তার থেকে দূরে রাখুন।',
  'TFT ডিসপ্লের VCC অবশ্যই 3.3V — 5V দিলে মডিউল নষ্ট হবে।',
  'পাওয়ার দেওয়ার আগে মাল্টিমিটারে VIN↔GND ও 3V3↔GND এ শর্ট আছে কিনা চেক করুন।',
];

type HotSpot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  rows: string[];
  /** সুপারিশকৃত তারের রং / কেবল টাইপ */
  wire?: { color: string; text: string };
};

/** বোর্ড-কো-অর্ডিনেটে (translate 30,40 এর ভেতরে) হোভার-যোগ্য অঞ্চল */
const HOTSPOTS: HotSpot[] = [
  {
    id: 'ac',
    x: 18,
    y: 18,
    w: 140,
    h: 62,
    title: 'J1 · AC 220V ইনপুট',
    rows: ['পিন 1 = L (ফেজ) → ফিউজ হোল্ডার IN', 'পিন 2 = N (নিউট্রাল) → 12V অ্যাডাপ্টার N', 'আর্থ থাকলে এনক্লোজার বডিতে'],
    wire: { color: '#8B4513', text: 'L = বাদামী/লাল 1.5 mm² · N = নীল/কালো 1.5 mm² (RV কেবল)' },
  },
  {
    id: 'fuse',
    x: 216,
    y: 18,
    w: 150,
    h: 62,
    title: 'FBH-01 / CH141 ফিউজ হোল্ডার',
    rows: ['IN ← J1 এর L টার্মিনাল', 'OUT → 12V অ্যাডাপ্টারের L', 'ফিউজ: 5A 250V · 5×20mm গ্লাস', 'শুধু ফেজ লাইনে, নিউট্রালে নয়'],
    wire: { color: '#8B4513', text: 'ফিউজ IN/OUT = বাদামী/লাল 1.5 mm² · শর্ট লিংক নয়' },
  },
  {
    id: 'adapter',
    x: 424,
    y: 18,
    w: 158,
    h: 62,
    title: '12V 5A অ্যাডাপ্টার / SMPS',
    rows: ['L ← ফিউজ OUT · N ← J1 এর N', '12V+ → LM2596 IN+ ও 12V রেল', '12V− → GND রেল'],
    wire: { color: '#F97316', text: 'AC = বাদামী/নীল 1.5 mm² · 12V DC = কমলা/হলুদ 18 AWG' },
  },
  {
    id: 'lm2596',
    x: 216,
    y: 104,
    w: 200,
    h: 72,
    title: 'LM2596 বাক মডিউল',
    rows: ['IN+ ← 12V রেল · IN− ← GND রেল', 'OUT+ → 5V রেল ও ESP32 VIN', 'OUT− → GND রেল', 'ESP32 লাগানোর আগে OUT = 5.0V সেট করুন'],
    wire: { color: '#F97316', text: 'IN+ কমলা · IN− কালো · OUT+ লাল · OUT− কালো (22 AWG)' },
  },
  {
    id: 'esp32',
    x: 230,
    y: 240,
    w: 176,
    h: 360,
    title: 'ESP32-WROOM-32 DevKit V1 (38-pin)',
    rows: ['VIN ← LM2596 OUT+ (5V)', 'GND ← GND রেল (একাধিক পিন)', '3V3 → 3.3V রেল (সেন্সর/TFT)', 'ফিমেল হেডারে বসান — সরাসরি সোল্ডার নয়'],
    wire: { color: '#EF4444', text: 'VIN লাল · GND কালো · 3V3 সবুজ · ডুপন্ট কেবল 20 cm' },
  },
  {
    id: 'cap',
    x: 252,
    y: 530,
    w: 30,
    h: 56,
    title: '1000µF ইলেক্ট্রোলাইটিক ক্যাপাসিটর',
    rows: ['+ (লম্বা পা) → ESP32 VIN', '− (ছোট পা / সাদা স্ট্রাইপ) → GND', 'ভোল্টেজ রেটিং ≥ 16V', 'পোলারিটি উল্টো দিলে ফেটে যাবে'],
    wire: { color: '#EF4444', text: '+ লাল · − কালো · খুব ছোট তার, পাশেই সোল্ডার' },
  },
  {
    id: 'buzzer',
    x: 434,
    y: 534,
    w: 148,
    h: 60,
    title: 'বাজার + স্ট্যাটাস LED',
    rows: ['LED অ্যানোড (+) → GPIO2 এর সাথে 220Ω রেজিস্টর', 'LED ক্যাথোড (−) → GND রেল', 'অ্যাক্টিভ বাজার + → 5V রেল, − → রিলে IN6/ALARM (GPIO13) অথবা ULN2803A আউট'],
    wire: { color: '#FDE047', text: 'LED সিগন্যাল হলুদ/সাদা · বাজার VCC লাল · GND কালো' },
  },
  {
    id: 'tft',
    x: 434,
    y: 614,
    w: 148,
    h: 150,
    title: 'ILI9341 2.8" SPI TFT ডিসপ্লে',
    rows: ['VCC → 3.3V রেল (5V দিলে নষ্ট হবে)', 'GND → GND রেল', 'CS → GPIO17 · DC/RS → GPIO5', 'SCK/SCL → GPIO21 · MOSI/SDI → GPIO22', 'RST → ESP32 EN (বা 3.3V) · LED/BL → 3.3V'],
    wire: { color: '#22C55E', text: 'VCC সবুজ · GND কালো · SPI সিগন্যাল নীল/হলুদ · 10 cm ডুপন্ট' },
  },
  {
    id: 'uln',
    x: 216,
    y: 640,
    w: 176,
    h: 70,
    title: 'ULN2803A DIP-18 (ঐচ্ছিক ড্রাইভার)',
    rows: ['IN1–IN8 (পিন 1–8) ← ESP32 GPIO', 'OUT1–OUT8 (পিন 11–18) → প্যানেল LED এর − দিক', 'পিন 9 = GND রেল · পিন 10 (COM) = 12V', 'LED এর + দিক 12V রেলে'],
    wire: { color: '#94A3B8', text: 'IN সাদা/ধূসর · OUT কমলা · COM কমলা · GND কালো' },
  },
  {
    id: 'powerout',
    x: 216,
    y: 740,
    w: 176,
    h: 66,
    title: 'J13/J14 · পাওয়ার আউট টার্মিনাল',
    rows: ['5V ← LM2596 OUT+ (রিলে মডিউল VCC)', '3.3V ← ESP32 3V3 (সেন্সর/TFT)', '12V ← অ্যাডাপ্টার (JD-VCC / প্যানেল LED)', 'GND সব ডিভাইসে কমন হতে হবে'],
    wire: { color: '#111827', text: '5V লাল · 3.3V সবুজ · 12V কমলা · GND কালো · 22 AWG' },
  },
  {
    id: 'gnd-rail',
    x: 160,
    y: 110,
    w: 16,
    h: 740,
    title: 'GND বাস রেল (কালো)',
    rows: ['সব GND এখানেই আসবে — কমন গ্রাউন্ড', 'উৎস: LM2596 OUT− ও ESP32 GND', 'মোটা টিনের রেল/1 mm² তার ব্যবহার করুন'],
    wire: { color: '#111827', text: 'GND = কালো · 1 mm² তার বা মোটা টিনের রেল · কমন স্টার পয়েন্ট' },
  },
  {
    id: '3v3-rail',
    x: 178,
    y: 110,
    w: 12,
    h: 740,
    title: '3.3V রেল (সবুজ)',
    rows: ['উৎস: ESP32 এর 3V3 পিন', 'ব্যবহার: DHT22, LDR ডিভাইডার, TFT VCC', 'সর্বোচ্চ ~500 mA — রিলে চালাবেন না'],
    wire: { color: '#22C55E', text: '3.3V = সবুজ · 22 AWG · শুধু সেন্সর/লজিক, রিলে নয়' },
  },
  {
    id: '5v-rail',
    x: 194,
    y: 110,
    w: 12,
    h: 740,
    title: '5V রেল (লাল)',
    rows: ['উৎস: LM2596 OUT+', 'ব্যবহার: ESP32 VIN, রিলে মডিউল VCC, MQ-137, YF-S201'],
    wire: { color: '#EF4444', text: '5V = লাল · 20–22 AWG · রিলে VCC ও ESP32 VIN এর জন্য যথেষ্ট মোটা' },
  },
  {
    id: '12v-rail',
    x: 412,
    y: 210,
    w: 12,
    h: 640,
    title: '12V রেল (কমলা)',
    rows: ['উৎস: 12V অ্যাডাপ্টার +', 'ব্যবহার: LM2596 IN+, রিলে JD-VCC, ULN2803A COM, প্যানেল LED'],
    wire: { color: '#F97316', text: '12V = কমলা · 18 AWG · অ্যাডাপ্টার থেকে সরাসরি, দীর্ঘ নয়' },
  },
  ...SENSOR_BLOCKS.map((b) => ({
    id: `sensor-${b.y}`,
    x: 18,
    y: b.y,
    w: 132,
    h: 62,
    title: b.label,
    rows: [`সিগন্যাল: ${b.pin}`, 'VCC → রেল (DHT22/LDR = 3.3V · MQ-137/YF-S201 = 5V)', 'GND → GND রেল', 'অ্যানালগ তার AC/রিলে তার থেকে দূরে রাখুন'],
    wire:
      b.label.includes('DHT22') || b.label.includes('LDR')
        ? { color: '#22C55E', text: 'VCC সবুজ · GND কালো · সিগন্যাল হলুদ/নীল · 22 AWG ডুপন্ট' }
        : b.label.includes('MQ-137') || b.label.includes('ZMPT101B') || b.label.includes('YF-S201')
          ? { color: '#EF4444', text: 'VCC লাল · GND কালো · অ্যানালগ সিগন্যাল হলুদ/নীল · শিল্ডেড তার ভালো' }
          : { color: '#64748B', text: 'সুইচ তার ধূসর/সাদা · GND কালো · PULLUP সহ সংযোগ' },
  })),
  ...RELAY_ROWS.map((r, i) => ({
    id: `relay-${r.n}`,
    x: 440,
    y: 250 + i * 34 - 14,
    w: 140,
    h: 30,
    title: `${r.n} · ${r.fn}`,
    rows: [`ESP32 ${r.gpio} → রিলে মডিউলের ${r.n}`, 'অ্যাক্টিভ LOW (LOW = রিলে ON)', 'রিলে VCC = 5V · GND = GND রেল', 'JD-VCC জাম্পার খুলে আলাদা 12V/5V দিন'],
    wire: { color: '#94A3B8', text: `সিগন্যাল ${r.n} = ধূসর/সাদা · VCC লাল · GND কালো · JD-VCC কমলা` },
  })),
];

function PerfboardSvg() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ spot: HotSpot; x: number; y: number } | null>(null);

  const track = (spot: HotSpot) => (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ spot, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
    <svg viewBox="0 0 660 960" className="w-full h-auto rounded-lg border border-border bg-white" role="img" aria-label="FR-4 12x18cm প্রোটোটাইপ বোর্ডে ESP32 v8 ফুল ওয়্যারিং ও প্লেসমেন্ট ডায়াগ্রাম">

      <defs>
        {/* আসল FR-4 ডাবল-সাইডেড পারফবোর্ডের মতো: সবুজ বোর্ডে কপার ডোনাট প্যাড + ড্রিল হোল (2.54mm pitch) */}
        <pattern id="pads" width="12.7" height="12.7" patternUnits="userSpaceOnUse">
          <circle cx="6.35" cy="6.35" r="3.6" fill="#c9932b" stroke="#8a6a14" strokeWidth="0.6" />
          <circle cx="6.35" cy="6.35" r="1.5" fill="#09331f" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="660" height="960" fill="#ffffff" />

      {/* Board */}
      <g transform="translate(30,40)">
        <rect x="0" y="0" width="600" height="900" rx="10" fill="#0d7a4f" stroke="#084d31" strokeWidth="2" />
        <rect x="8" y="8" width="584" height="884" rx="6" fill="url(#pads)" />
        {[[20, 20], [580, 20], [20, 880], [580, 880]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" fill="#ffffff" stroke="#9ca3af" />
        ))}

        {/* হোল-কোঅর্ডিনেট রুলার — হোল গুনে কম্পোনেন্ট বসানোর জন্য */}
        {Array.from({ length: 47 }).map((_, i) => (
          <g key={`col-${i}`}>
            {i % 5 === 0 && <line x1={14.35 + i * 12.7} y1="0" x2={14.35 + i * 12.7} y2="-5" stroke="#374151" strokeWidth="1" />}
            {i % 10 === 0 && (
              <text x={14.35 + i * 12.7} y="-9" fontSize="9" fill="#374151" textAnchor="middle" fontWeight="bold">{i}</text>
            )}
          </g>
        ))}
        {Array.from({ length: 70 }).map((_, j) => (
          <g key={`row-${j}`}>
            {j % 5 === 0 && <line x1="0" y1={14.35 + j * 12.7} x2="-5" y2={14.35 + j * 12.7} stroke="#374151" strokeWidth="1" />}
            {j % 10 === 0 && (
              <text x="-9" y={14.35 + j * 12.7 + 3} fontSize="9" fill="#374151" textAnchor="end" fontWeight="bold">{j}</text>
            )}
          </g>
        ))}

        {/* Bus rails */}
        <line x1="168" y1="60" x2="168" y2="860" stroke="#111827" strokeWidth="6" />
        <rect x="140" y="86" width="82" height="18" rx="3" fill="#ffffff" opacity="0.92" />
        <text x="146" y="99" fontSize="11" fill="#111827" fontWeight="bold">GND</text>
        <line x1="184" y1="60" x2="184" y2="860" stroke="#16a34a" strokeWidth="5" />
        <text x="176" y="99" fontSize="11" fill="#16a34a" fontWeight="bold">3V3</text>
        <line x1="200" y1="60" x2="200" y2="860" stroke="#ef4444" strokeWidth="5" />
        <text x="203" y="99" fontSize="11" fill="#ef4444" fontWeight="bold">5V</text>
        <line x1="418" y1="200" x2="418" y2="860" stroke="#f97316" strokeWidth="5" />
        <text x="404" y="196" fontSize="11" fill="#f97316" fontWeight="bold">12V</text>

        {/* AC input + fuse */}
        <g>
          <rect x="18" y="18" width="140" height="62" rx="4" fill="#7f1d1d" stroke="#450a0a" />
          <text x="88" y="42" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="bold">J1 · AC 220V IN</text>
          <text x="88" y="62" fontSize="11" fill="#fecaca" textAnchor="middle">L / N স্ক্রু টার্মিনাল</text>
          <rect x="216" y="18" width="150" height="62" rx="4" fill="#b91c1c" stroke="#7f1d1d" />
          <text x="291" y="42" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="bold">FBH-01 ফিউজ</text>
          <text x="291" y="62" fontSize="11" fill="#fecaca" textAnchor="middle">5A 250V · 5×20mm</text>
          <line x1="158" y1="40" x2="216" y2="40" stroke="#b45309" strokeWidth="4" />
          <text x="187" y="34" fontSize="10" fill="#78350f" textAnchor="middle">L</text>

          <rect x="424" y="18" width="158" height="62" rx="4" fill="#1f2937" stroke="#111827" />
          <text x="503" y="42" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="bold">12V 5A অ্যাডাপ্টার</text>
          <text x="503" y="62" fontSize="11" fill="#d1d5db" textAnchor="middle">AC IN → 12V DC OUT</text>
          <line x1="366" y1="40" x2="424" y2="40" stroke="#b45309" strokeWidth="4" />
        </g>

        {/* LM2596 */}
        <g>
          <rect x="216" y="104" width="200" height="72" rx="4" fill="#1e3a8a" stroke="#172554" />
          <text x="316" y="130" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="bold">LM2596 বাক মডিউল</text>
          <text x="316" y="150" fontSize="11" fill="#bfdbfe" textAnchor="middle">12V IN → 5.0V OUT (সেট করুন)</text>
          <text x="316" y="168" fontSize="10" fill="#93c5fd" textAnchor="middle">IN+ / IN− / OUT+ / OUT−</text>
          <line x1="503" y1="80" x2="503" y2="140" stroke="#f97316" strokeWidth="4" />
          <line x1="503" y1="140" x2="416" y2="140" stroke="#f97316" strokeWidth="4" />
          <text x="460" y="134" fontSize="10" fill="#9a3412" textAnchor="middle">12V</text>
          <line x1="216" y1="126" x2="200" y2="126" stroke="#ef4444" strokeWidth="4" />
          <line x1="216" y1="158" x2="168" y2="158" stroke="#111827" strokeWidth="4" />
        </g>

        {/* ESP32 */}
        <g>
          <rect x="230" y="240" width="176" height="360" rx="6" fill="#111827" stroke="#000" />
          <rect x="290" y="252" width="56" height="46" rx="3" fill="#d4d4d8" />
          <text x="318" y="282" fontSize="10" fill="#3f3f46" textAnchor="middle">ANT</text>
          <text x="318" y="330" fontSize="14" fill="#fff" textAnchor="middle" fontWeight="bold">ESP32-WROOM-32</text>
          <text x="318" y="350" fontSize="12" fill="#a1a1aa" textAnchor="middle">DevKit V1 · 38-pin</text>
          <text x="318" y="372" fontSize="11" fill="#fbbf24" textAnchor="middle">ফিমেল হেডারে বসান</text>
          {Array.from({ length: 19 }).map((_, i) => (
            <g key={i}>
              <circle cx="240" cy={258 + i * 18} r="3.5" fill="#facc15" />
              <circle cx="396" cy={258 + i * 18} r="3.5" fill="#facc15" />
            </g>
          ))}
          <text x="318" y="420" fontSize="11" fill="#e5e7eb" textAnchor="middle">VIN = 5V · GND = বাস</text>
          <text x="318" y="440" fontSize="11" fill="#e5e7eb" textAnchor="middle">3V3 → 3V3 রেল</text>
          {/* Capacitor */}
          <rect x="252" y="530" width="30" height="56" rx="4" fill="#0f172a" stroke="#94a3b8" />
          <text x="267" y="562" fontSize="9" fill="#fff" textAnchor="middle" transform="rotate(-90 267 562)">1000µF</text>
          <text x="267" y="600" fontSize="9" fill="#e5e7eb" textAnchor="middle">+ → VIN</text>
        </g>

        {/* Sensor blocks (left) */}
        {SENSOR_BLOCKS.map((b) => (
          <g key={b.label}>
            <rect x="18" y={b.y} width="132" height="62" rx="4" fill="#f8fafc" stroke={b.color} strokeWidth="2" />
            <text x="84" y={b.y + 26} fontSize="11.5" fill="#0f172a" textAnchor="middle" fontWeight="bold">{b.label}</text>
            <text x="84" y={b.y + 46} fontSize="11" fill={b.color} textAnchor="middle">{b.pin}</text>
            <line x1="150" y1={b.y + 20} x2="230" y2={b.y + 20} stroke={b.color} strokeWidth="3" />
            <line x1="150" y1={b.y + 40} x2="168" y2={b.y + 40} stroke="#111827" strokeWidth="3" />
            <line x1="150" y1={b.y + 50} x2="184" y2={b.y + 50} stroke="#16a34a" strokeWidth="3" />
          </g>
        ))}

        {/* Relay header (right) */}
        <g>
          <rect x="434" y={200} width="148" height={8 * 34 + 74} rx="4" fill="#1e40af" stroke="#1e3a8a" />
          <text x="508" y="226" fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">J2/J3 · রিলে IN1–IN8</text>
          {RELAY_ROWS.map((r, i) => {
            const y = 250 + i * 34;
            return (
              <g key={r.n}>
                <circle cx="446" cy={y} r="4" fill="#facc15" />
                <text x="458" y={y + 4} fontSize="10.5" fill="#fff">{r.n} · {r.gpio}</text>
                <text x="458" y={y + 16} fontSize="9.5" fill="#bfdbfe">{r.fn}</text>
                <line x1="406" y1={y} x2="446" y2={y} stroke="#93c5fd" strokeWidth="2.5" />
              </g>
            );
          })}
          <text x="508" y={200 + 8 * 34 + 60} fontSize="10" fill="#dbeafe" textAnchor="middle">VCC=5V · GND=বাস · JD-VCC আলাদা</text>
        </g>

        {/* Buzzer / LED */}
        <g>
          <rect x="434" y={534} width="148" height="60" rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
          <text x="508" y={558} fontSize="11.5" fill="#0f172a" textAnchor="middle" fontWeight="bold">বাজার + স্ট্যাটাস LED</text>
          <text x="508" y={578} fontSize="10.5" fill="#334155" textAnchor="middle">LED → GPIO2 + 220Ω</text>
        </g>

        {/* TFT display */}
        <g>
          <rect x="434" y={614} width="148" height={150} rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <rect x="446" y={626} width="124" height={86} rx="3" fill="#1d4ed8" />
          <text x="508" y={672} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">ILI9341 2.8&quot;</text>
          <text x="508" y={690} fontSize="10" fill="#bfdbfe" textAnchor="middle">SPI TFT · VCC = 3.3V</text>
          <text x="508" y={730} fontSize="9.5" fill="#e2e8f0" textAnchor="middle">CS 17 · DC 5 · RST → EN</text>
          <text x="508" y={746} fontSize="9.5" fill="#e2e8f0" textAnchor="middle">SCK 21 · MOSI 22 · LED 3V3</text>
          <line x1="406" y1={660} x2="434" y2={660} stroke="#38bdf8" strokeWidth="3" />
        </g>

        {/* ULN2803A */}
        <g>
          <rect x="216" y={640} width="176" height="70" rx="4" fill="#27272a" stroke="#000" />
          <text x="304" y={666} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">ULN2803A (ঐচ্ছিক)</text>
          <text x="304" y={686} fontSize="10" fill="#a1a1aa" textAnchor="middle">DIP-18 ড্রাইভার · প্যানেল LED</text>
          <text x="304" y={702} fontSize="9.5" fill="#a1a1aa" textAnchor="middle">COM = 12V · GND = বাস</text>
        </g>

        {/* Power out terminals */}
        <g>
          <rect x="216" y={740} width="176" height="66" rx="4" fill="#065f46" stroke="#064e3b" />
          <text x="304" y={764} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">J13/J14 · পাওয়ার আউট</text>
          <text x="304" y={784} fontSize="10.5" fill="#a7f3d0" textAnchor="middle">5V · 3.3V · 12V · GND টার্মিনাল</text>
          <line x1="216" y1={772} x2="200" y2={772} stroke="#ef4444" strokeWidth="3" />
          <line x1="392" y1={772} x2="418" y2={772} stroke="#f97316" strokeWidth="3" />
        </g>

        {/* AC keep-out zone note */}
        <rect x="18" y={830} width="564" height="52" rx="4" fill="#fee2e2" stroke="#dc2626" strokeDasharray="6 4" />
        <text x="300" y={852} fontSize="11.5" fill="#7f1d1d" textAnchor="middle" fontWeight="bold">⚠ AC কিপ-আউট জোন — 220V ট্র্যাক শুধু নিচের লেয়ারে, লো-ভোল্টেজ থেকে ≥ 3 mm দূরে</text>
        <text x="300" y={870} fontSize="10.5" fill="#7f1d1d" textAnchor="middle">রিলে NO/COM/NC তার বোর্ডের বাইরে আলাদা স্ক্রু টার্মিনালে</text>

        <text x="300" y={-26} fontSize="13" fill="#111827" textAnchor="middle" fontWeight="bold">FarmEye v8 · FR-4 প্রোটোটাইপ বোর্ড 12 × 18 cm (2.54mm pitch)</text>

        {/* Hover hotspots — প্রতিটি কানেক্টর/পিনের ওয়্যারিং তথ্য */}
        {HOTSPOTS.map((s) => (
          <rect
            key={s.id}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx="4"
            fill="transparent"
            stroke={hover?.spot.id === s.id ? '#fbbf24' : 'transparent'}
            strokeWidth="3"
            style={{ cursor: 'help' }}
            onMouseEnter={track(s)}
            onMouseMove={track(s)}
            onClick={track(s)}
          >
            <title>{`${s.title}\n${s.rows.join('\n')}${s.wire ? '\n🧵 ' + s.wire.text : ''}`}</title>
          </rect>
        ))}
      </g>

      <text x="330" y="956" fontSize="12" fill="#374151" textAnchor="middle">প্রস্থ 120 mm (৪৭ হোল কলাম 0–46) × উচ্চতা 180 mm (৭০ হোল সারি 0–69) · উপরে/বামের নম্বর = হোল পজিশন — গুনে গুনে আসল বোর্ডে বসান · স্কেল 5px = 1mm</text>
    </svg>

    {hover && (
      <div
        className="pointer-events-none absolute z-20 w-64 rounded-lg border border-border bg-popover p-2.5 shadow-lg"
        style={{
          left: Math.min(Math.max(hover.x + 14, 4), Math.max((wrapRef.current?.clientWidth ?? 300) - 264, 4)),
          top: Math.max(hover.y - 10, 4),
        }}
      >
        <p className="text-[11px] font-bold text-primary">{hover.spot.title}</p>
        {hover.spot.wire && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1">
            <span
              className="h-3 w-3 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: hover.spot.wire.color }}
              aria-hidden="true"
            />
            <span className="text-[10.5px] font-medium leading-snug text-foreground">{hover.spot.wire.text}</span>
          </div>
        )}
        <ul className="mt-1.5 space-y-0.5">
          {hover.spot.rows.map((r) => (
            <li key={r} className="text-[10.5px] leading-snug text-foreground/90">• {r}</li>
          ))}
        </ul>
      </div>
    )}
    </div>
  );
}


export function PerfboardLayoutCard() {
  return (
    <Card className="border-2 border-emerald-600/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center gap-2">
          <CircuitBoard className="h-4 w-4 text-emerald-600" />
          🧩 FR-4 প্রোটোটাইপ বোর্ড (12×18 cm) — ফুল প্লেসমেন্ট ও ওয়্যারিং
          <Badge variant="secondary" className="text-[10px]">v8</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Double Sided FR-4 PCB Prototype Board 12×18cm (RBD-2807) এ ESP32, রিলে হেডার, ফিউজ, সব সেন্সর ও TFT ডিসপ্লে কোথায় বসবে এবং কোন তার কোথায় যাবে
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-muted-foreground">
          💡 ডায়াগ্রামের যেকোনো কানেক্টর, রেল বা রিলে চ্যানেলের উপর মাউস নিন (মোবাইলে ট্যাপ করুন) — কোন তার কোন পিনে যাবে দেখা যাবে।
        </p>
        <PerfboardSvg />


        <div className="grid gap-2">
          {PLACEMENT.map(([zone, detail]) => (
            <div key={zone} className="rounded-lg border bg-muted/30 p-2.5">
              <p className="text-[11px] font-bold text-primary">{zone}</p>
              <p className="text-xs text-foreground/90 mt-0.5">{detail}</p>
            </div>
          ))}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="steps">
            <AccordionTrigger className="text-xs py-2">🔧 সোল্ডারিং ও ওয়্যারিং ধাপ (ক্রম অনুযায়ী)</AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-2 list-decimal pl-5">
                {STEPS.map((s) => (
                  <li key={s} className="text-xs leading-relaxed">{s}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="relay-map">
            <AccordionTrigger className="text-xs py-2">🔌 রিলে চ্যানেল ↔ GPIO টেবিল</AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1.5 px-2">চ্যানেল</th>
                      <th className="text-left py-1.5 px-2">GPIO</th>
                      <th className="text-left py-1.5 px-2">লোড</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RELAY_ROWS.map((r) => (
                      <tr key={r.n} className="border-b border-border/50">
                        <td className="py-1.5 px-2 font-mono font-bold">{r.n}</td>
                        <td className="py-1.5 px-2 font-mono text-primary">{r.gpio}</td>
                        <td className="py-1.5 px-2">{r.fn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-xs font-bold text-destructive mb-1">⚠ নিরাপত্তা</p>
          <ul className="text-xs space-y-1 text-foreground/90 list-disc pl-4">
            <li>220V AC অংশ (J1 + ফিউজ) বোর্ডের একদম উপরের প্রান্তে রাখুন, লো-ভোল্টেজ সিগন্যাল থেকে ≥ 3 mm দূরে</li>
            <li>ফিউজ শুধু ফেজ (L) লাইনে — নিউট্রালে নয়</li>
            <li>রিলে মডিউলের JD-VCC জাম্পার খুলে আলাদা সাপ্লাই দিন (অপ্টো-আইসোলেশন সক্রিয় থাকবে)</li>
            <li>বোর্ড ইনস্টল করার আগে ২৪ ঘণ্টা বার্ন-ইন টেস্ট করুন</li>
          </ul>
        </div>
        {/* বাস্তব অ্যাসেম্বলড ভিউ — সোল্ডারিং শেষে বোর্ড যেমন দেখাবে */}
        <div className="rounded-lg border border-border overflow-hidden">
          <img
            src={perfboardAssembled}
            alt="সম্পূর্ণ সোল্ডার করা FarmEye v8 FR-4 প্রোটোটাইপ বোর্ডের বাস্তব ভিউ — ESP32, ৮-চ্যানেল রিলে, ফিউজ, সেন্সর টার্মিনাল, TFT ডিসপ্লে"
            loading="lazy"
            width={1344}
            height={768}
            className="w-full h-auto"
          />
          <p className="text-[11px] text-muted-foreground p-2 bg-muted/40">
            📸 রেফারেন্স ভিউ — সোল্ডারিং ও কানেকশন শেষে আপনার বোর্ড এমন দেখাবে: বামে AC ইন + ফিউজ, বাম-মাঝে ৮-চ্যানেল রিলে, কেন্দ্রে ESP32, ডানে TFT ডিসপ্লে ও LM2596 বাক কনভার্টার, নিচে সেন্সর স্ক্রু টার্মিনাল, কিনারায় রঙ-কোডেড পাওয়ার রেল (কালো GND / সবুজ 3.3V / লাল 5V / কমলা 12V)।
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
