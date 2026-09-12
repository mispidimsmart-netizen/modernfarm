// SSOT for static wiring reference content used by the Installation Guide → Wiring tab.

export interface WireColorEntry {
  color: string;
  name: string;
  use: string;
}

export const WIRE_COLORS: WireColorEntry[] = [
  { color: 'bg-red-500', name: 'লাল (RED)', use: 'VCC / পাওয়ার (+)' },
  { color: 'bg-gray-800', name: 'কালো (BLACK)', use: 'GND / গ্রাউন্ড (-)' },
  { color: 'bg-yellow-500', name: 'হলুদ (YELLOW)', use: 'সিগন্যাল / ডেটা' },
  { color: 'bg-green-500', name: 'সবুজ (GREEN)', use: 'ডেটা / কন্ট্রোল' },
  { color: 'bg-white border border-gray-300', name: 'সাদা (WHITE)', use: 'সিগন্যাল / ডেটা' },
  { color: 'bg-blue-500', name: 'নীল (BLUE)', use: 'কন্ট্রোল / সিরিয়াল' },
  { color: 'bg-orange-500', name: 'কমলা (ORANGE)', use: 'এনালগ আউট' },
  { color: 'bg-purple-500', name: 'বেগুনি (PURPLE)', use: 'কন্ট্রোল' },
  { color: 'bg-amber-600', name: 'বাদামী (BROWN)', use: 'AC লাইভ' },
];

/** v8 ESP32 DevKit V1 text pin-out diagram (fallback for the image diagram). */
export const ESP32_TEXT_DIAGRAM = `┌─────────────────────────────────────────────────────────┐
    │              ESP32 DevKit V1 (v8.0.0 Industrial)         │
    │                                                          │
    │  সেন্সর ইনপুট:                                           │
    │  ─────────────                                           │
    │  DHT22 #1 DATA ──────────────▶ GPIO 4  (তাপমাত্রা #১)    │
    │  DHT22 #2 DATA ──────────────▶ GPIO 16 (তাপমাত্রা #২)    │
    │  MQ-137 AO ──────────────────▶ GPIO 34 (অ্যামোনিয়া)      │
    │  YF-S201 Signal ─────────────▶ GPIO 17 (ওয়াটার ফ্লো)     │
    │  ZMPT101B OUT ───────────────▶ GPIO 35 (পাওয়ার মনিটর)    │
    │                                                          │
    │  ৮-চ্যানেল রিলে আউটপুট:                                  │
    │  ────────────────────                                    │
    │  GPIO 25 ────────────────────▶ IN1: 🌀 এক্সহস্ট ফ্যান     │
    │  GPIO 26 ────────────────────▶ IN2: 🌀 সিলিং ফ্যান        │
    │  GPIO 27 ────────────────────▶ IN3: 💡 লাইট               │
    │  GPIO 14 ────────────────────▶ IN4: 🔥 হিটার              │
    │  GPIO 12 ────────────────────▶ IN5: 💦 ফগার               │
    │  GPIO 13 ────────────────────▶ IN6: 🔔 অ্যালার্ম           │
    │  GPIO 15 ────────────────────▶ IN7: 🚿 স্প্রিংকলার        │
    │  GPIO 33 ────────────────────▶ IN8: 💨 সার্কুলেশন ফ্যান    │
    │                                                          │
    │  অন্যান্য:                                                │
    │  ─────────                                               │
    │  GPIO 2  ────────────────────▶ স্ট্যাটাস LED              │
    │  GPIO 32 ────────────────────▶ ম্যানুয়াল ওভাররাইড বাটন    │
    │  GPIO 23 ────────────────────▶ GSM TX (ঐচ্ছিক)            │
    │  GPIO 19 ────────────────────▶ GSM RX (ঐচ্ছিক)            │
    │                                                          │
    │  পাওয়ার:                                                 │
    │  ───────                                                 │
    │  VIN ◄──── 5V (LM2596 থেকে)                              │
    │  GND ◄──── কমন গ্রাউন্ড                                   │
    │  3.3V ───▶ DHT22 VCC                                     │
    │  5V (VIN)─▶ MQ-137, YF-S201, ZMPT101B, রিলে VCC         │
    └─────────────────────────────────────────────────────────┘`;

export interface WiringNote {
  emoji: string;
  title: string;
  detail: string;
}

export const WIRING_IMPORTANT_NOTES: WiringNote[] = [
  {
    emoji: '🔴',
    title: 'DHT22 তে 3.3V দিন, 5V নয়!',
    detail: '5V দিলে সেন্সর নষ্ট হয়ে যেতে পারে',
  },
  {
    emoji: '⏰',
    title: 'MQ-137 গ্যাস সেন্সর প্রথম ২৪ ঘন্টা গরম করুন',
    detail: 'প্রিহিট ছাড়া সঠিক রিডিং পাওয়া যাবে না',
  },
  {
    emoji: '🔌',
    title: 'সব GND একসাথে কানেক্ট করুন',
    detail: 'কমন গ্রাউন্ড না থাকলে সেন্সর কাজ করবে না',
  },
  {
    emoji: '⚡',
    title: '12V 3A অ্যাডাপ্টার + LM2596 Buck Converter ব্যবহার করুন',
    detail: '12V → রিলে JD-VCC, LM2596 (5V সেট) → ESP32 VIN। জাম্পার খুলে দিন!',
  },
  {
    emoji: '🔃',
    title: 'ওয়াটার ফ্লো সেন্সরে তীর চিহ্ন অনুযায়ী পানির দিক ঠিক করুন',
    detail: 'উল্টো লাগালে রিডিং পাওয়া যাবে না',
  },
];

export const WIRING_CHECKLIST: string[] = [
  'ESP32 USB পোর্টে সংযুক্ত',
  'সব VCC ও GND সঠিকভাবে সংযুক্ত',
  'DHT22 তে 3.3V দেওয়া হয়েছে',
  'অন্যান্য সেন্সরে 5V (VIN) দেওয়া হয়েছে',
  'সব সেন্সরের GND একসাথে কমন করা হয়েছে',
  'রিলে মডিউলের IN পিনগুলো সঠিক GPIO তে সংযুক্ত',
  'কোনো তার লুজ বা খোলা নেই',
  'পাওয়ার অন করার আগে সংযোগ দুইবার চেক করা হয়েছে',
];
