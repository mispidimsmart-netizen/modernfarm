/**
 * Static content for the ESP32 installation guide (parts list, wiring tables,
 * setup steps). Pure data — no React state — so the guide page and any future
 * printable/export view can share one source of truth.
 */
import { Cpu, Cable, Zap, Wifi, Settings, CheckCircle2, AlertTriangle, Lightbulb, Thermometer, Droplets, Wind, Power, ToggleLeft, Fan } from 'lucide-react';

export const jumperWireTypes = [
  {
    type: 'Male-to-Male (M-M)',
    typeBn: 'মেল-টু-মেল (M-M)',
    description: 'দুই প্রান্তেই পিন আছে (ঢুকানো যায়)',
    descEn: 'Both ends have pins that can be inserted',
    usage: 'ব্রেডবোর্ডে সংযোগ করতে বা দুটি Female পোর্ট যুক্ত করতে',
    usageEn: 'Connect breadboard holes or two female ports',
    visual: '📍────📍',
    endA: '📍 পিন (ঢোকানোর জন্য)',
    endB: '📍 পিন (ঢোকানোর জন্য)',
    color: 'bg-blue-500',
    examples: ['ব্রেডবোর্ডে দুই পয়েন্ট যোগ করতে', 'ESP32 থেকে ব্রেডবোর্ডে']
  },
  {
    type: 'Male-to-Female (M-F)',
    typeBn: 'মেল-টু-ফিমেল (M-F)',
    description: 'এক প্রান্তে পিন, অন্য প্রান্তে সকেট (গর্ত)',
    descEn: 'One end has pin, other has socket (hole)',
    usage: 'সেন্সর থেকে সরাসরি ESP32 এর পিনে সংযোগ করতে',
    usageEn: 'Connect sensor directly to ESP32 pins',
    visual: '📍────⬜',
    endA: '📍 পিন (ঢোকানোর জন্য)',
    endB: '⬜ সকেট/গর্ত (পিন ঢোকে)',
    color: 'bg-green-500',
    examples: ['DHT22 সেন্সর থেকে ESP32 তে', 'রিলে মডিউল থেকে ESP32 তে']
  },
  {
    type: 'Female-to-Female (F-F)',
    typeBn: 'ফিমেল-টু-ফিমেল (F-F)',
    description: 'দুই প্রান্তেই সকেট/গর্ত আছে',
    descEn: 'Both ends have sockets (holes)',
    usage: 'দুটি Male পিন যুক্ত করতে বা এক্সটেনশন হিসেবে',
    usageEn: 'Connect two male pins or as extension',
    visual: '⬜────⬜',
    endA: '⬜ সকেট/গর্ত (পিন ঢোকে)',
    endB: '⬜ সকেট/গর্ত (পিন ঢোকে)',
    color: 'bg-purple-500',
    examples: ['ESP32 এর পিন এক্সটেন্ড করতে', 'দুটি মডিউল এর Male পিন যোগ করতে']
  }
];

export const partsList = [
  {
    category: 'মূল কন্ট্রোলার',
    categoryEn: 'Main Controller',
    items: [
      { name: 'ESP32-WROOM-32 DevKit V1 (38-pin) — স্ট্যান্ডার্ড', nameEn: 'ESP32-WROOM-32 DevKit V1 (38-pin)', quantity: 1, price: '৳৬০০-৮০০', priceRange: [600, 800], shop: 'টেকশপ বিডি, রোবটিক্স বিডি', essential: true },
      { name: 'USB কেবল (Micro USB / Type-C)', nameEn: 'USB Cable (Micro USB / Type-C)', quantity: 1, price: '৳৮০-১৫০', priceRange: [80, 150], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
    ]
  },
  {
    category: 'সেন্সর',
    categoryEn: 'Sensors',
    items: [
      { name: 'DHT22/AM2302 #১ (তাপমাত্রা ও আর্দ্রতা) — GPIO 4', nameEn: 'DHT22 #1 Temp & Humidity — GPIO 4', quantity: 1, price: '৳৩৫০-৪৫০', priceRange: [350, 450], shop: 'রোবটিক্স বিডি, বিডিস্টল', essential: true },
      { name: 'DHT22/AM2302 #২ (বড় শেডের জন্য) — GPIO 16 (RX2)', nameEn: 'DHT22 #2 (Large Shed) — GPIO 16 (RX2)', quantity: 1, price: '৳৩৫০-৪৫০', priceRange: [350, 450], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'MQ-137 (অ্যামোনিয়া গ্যাস সেন্সর) — GPIO 34', nameEn: 'MQ-137 Ammonia Sensor — GPIO 34', quantity: 1, price: '৳৪০০-৬০০', priceRange: [400, 600], shop: 'টেকশপ বিডি', essential: true },
      { name: 'YF-S201 (ওয়াটার ফ্লো সেন্সর) — GPIO 18', nameEn: 'YF-S201 Water Flow — GPIO 18', quantity: 1, price: '৳২৫০-৩৫০', priceRange: [250, 350], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'ZMPT101B (AC ভোল্টেজ সেন্সর) — GPIO 35', nameEn: 'ZMPT101B Voltage Sensor — GPIO 35', quantity: 1, price: '৳১৫০-২৫০', priceRange: [150, 250], shop: 'টেকশপ বিডি', essential: true },
      { name: 'LDR (লাইট সেন্সর / Ambient Light) — GPIO 36', nameEn: 'LDR Light Sensor — GPIO 36', quantity: 1, price: '৳২০-৫০', priceRange: [20, 50], shop: 'ইলেকট্রনিক্স দোকান', essential: false },
      { name: '10kΩ রেজিস্টর (LDR ভোল্টেজ ডিভাইডার)', nameEn: '10kΩ Resistor (LDR Voltage Divider)', quantity: 1, price: '৳৫-১০', priceRange: [5, 10], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: false },
    ]
  },
  {
    category: 'রিলে ও কন্ট্রোল (৮-চ্যানেল)',
    categoryEn: 'Relay & Control (8-Channel)',
    items: [
      { name: '8-চ্যানেল রিলে মডিউল (5V/12V, Optocoupler)', nameEn: '8-Channel Relay Module (5V/12V)', quantity: 1, price: '৳৪৫০-৬৫০', priceRange: [450, 650], shop: 'টেকশপ বিডি', essential: true },
      { name: 'MOSFET মডিউল (IRF520) — LED ডিমিং (PWM)', nameEn: 'MOSFET Module IRF520 — LED Dimming', quantity: 1, price: '৳৮০-১২০', priceRange: [80, 120], shop: 'রোবটিক্স বিডি', essential: false },
    ]
  },
  {
    category: '🔔 অ্যালার্ম ও ইন্ডিকেটর',
    categoryEn: 'Alarm & Indicator',
    items: [
      { name: 'SFM-27 পিজো বাজার (DC 3-24V, হাই ডেসিবেল) — রিলে IN6 / GPIO 13', nameEn: 'SFM-27 Piezo Buzzer (DC 3-24V) — Relay IN6 / GPIO 13', quantity: 1, price: '৳৮০-১৫০', priceRange: [80, 150], shop: 'ইলেকট্রনিক্স দোকান', essential: true },
      { name: 'ULN2803A ড্রাইভার IC (DIP-18) — ৮টি প্যানেল LED চালানোর জন্য', nameEn: 'ULN2803A Driver IC (DIP-18) — 8 panel LEDs', quantity: 1, price: '৳৪০-৮০', priceRange: [40, 80], shop: 'ইলেকট্রনিক্স দোকান', essential: false },
      { name: '১৮ পিন IC সকেট (ULN2803A এর জন্য)', nameEn: '18-pin IC Socket', quantity: 1, price: '৳১৫-২৫', priceRange: [15, 25], shop: 'ইলেকট্রনিক্স দোকান', essential: false },
      { name: 'প্যানেল মাউন্ট LED 5mm 12V (৮ রঙ — প্রতি রিলের জন্য একটি)', nameEn: 'Panel Mount LED 5mm 12V (8 pcs)', quantity: 8, price: '৳২০-৩০/পিস', priceRange: [160, 240], shop: 'ইলেকট্রিক্যাল দোকান', essential: false },
      { name: '1kΩ রেজিস্টর (LED সিরিজ, 12V এর জন্য)', nameEn: '1k Resistor (LED series for 12V)', quantity: 8, price: '৳২-৫/পিস', priceRange: [16, 40], shop: 'ইলেকট্রনিক্স দোকান', essential: false },
    ]
  },
  {
    category: '🖥️ TFT ডিসপ্লে (v8.3.0) — সম্পূর্ণ ঐচ্ছিক, GPIO 21/22/17/5',
    categoryEn: 'TFT Display (v8.3.0) — OPTIONAL, GPIO 21/22/17/5',
    items: [
      { name: 'ILI9341 SPI TFT ডিসপ্লে 2.4"/2.8" (240×320)', nameEn: 'ILI9341 SPI TFT 2.4"/2.8" (240x320)', quantity: 1, price: '৳৭৫০-১২০০', priceRange: [750, 1200], shop: 'টেকশপ বিডি, রোবটিক্স বিডি', essential: false },
      { name: 'ফিমেল হেডার + ফ্ল্যাট রিবন কেবল (ডিসপ্লে বক্সের ঢাকনায় বসাতে)', nameEn: 'Female header + ribbon cable for display', quantity: 1, price: '৳৫০-১২০', priceRange: [50, 120], shop: 'টেকশপ বিডি', essential: false },
      { name: 'অ্যাক্রিলিক/পলিকার্বনেট উইন্ডো (IP65 বক্সে ডিসপ্লে দেখার জন্য)', nameEn: 'Acrylic window for IP65 box', quantity: 1, price: '৳১০০-২০০', priceRange: [100, 200], shop: 'হার্ডওয়্যার দোকান', essential: false },
    ]
  },

  {
    category: 'সুইচিং ও প্রোটেকশন',
    categoryEn: 'Switching & Protection',
    items: [
      { name: 'MCB মেইন (সার্কিট ব্রেকার) — 2P 32A C', nameEn: 'MCB Main Circuit Breaker 2P 32A C', quantity: 1, price: '৳৩৫০-৫৫০', priceRange: [350, 550], shop: 'ইলেকট্রিক্যাল দোকান', essential: true },
      { name: 'সাব MCB — 1P 6A (প্রতিটি রিলে লাইনের জন্য)', nameEn: 'Sub MCB 1P 6A (per relay line)', quantity: 8, price: '৳১২০-১৮০/পিস', priceRange: [960, 1440], shop: 'ইলেকট্রিক্যাল দোকান', essential: true },
      { name: 'ফিউজ হোল্ডার ৫×২০ mm Panel Mount (মডেল: FBH-01 / CH141)', nameEn: 'Fuse Holder 5x20mm Panel Mount (FBH-01 / CH141)', quantity: 1, price: '৳৪০-৮০', priceRange: [40, 80], shop: 'RoboticsBD “Panel Mount Fuse Holder 5x20mm” / TechshopBD “5x20 Fuse Holder”', essential: true },
      { name: 'গ্লাস ফিউজ ৫A ২৫০V ৫×২০mm (৫ পিসের প্যাক — স্পেয়ার রাখুন)', nameEn: 'Glass Fuse 5A 250V 5x20mm (5 pcs pack)', quantity: 1, price: '৳২০-৫০', priceRange: [20, 50], shop: 'RoboticsBD “5A 250V Glass Fuse 5x20mm” / BDStall', essential: true },
      { name: 'ম্যাগনেটিক কন্ট্যাক্টর CJX2-1210 (220VAC কয়েল) — ঐচ্ছিক', nameEn: 'Magnetic Contactor CJX2-1210 220VAC (Optional)', quantity: 1, price: '৳৪০০-৬৫০', priceRange: [400, 650], shop: 'ইলেকট্রিক্যাল দোকান', essential: false },
    ]
  },
  {
    category: 'ফগার সিস্টেম (কুলিং) — রিলে IN5 / GPIO 12',
    categoryEn: 'Fogger System (Cooling) — Relay IN5 / GPIO 12',
    items: [
      { name: 'DC 12V সোলেনয়েড ভালভ (1/2", NC, Brass) — ফগার', nameEn: 'DC 12V Solenoid Valve 1/2" NC Brass — Fogger', quantity: 1, price: '৳২৫০-৫০০', priceRange: [250, 500], shop: 'ইলেকট্রনিক্স দোকান, AliExpress', essential: true },
      { name: 'অটোমেটিক ওয়াটার প্রেসার বুস্টার পাম্প (ঐচ্ছিক — ট্যাঙ্ক উঁচুতে থাকলে লাগবে না)', nameEn: 'Water Pressure Booster Pump (Optional — not needed if tank is elevated)', quantity: 1, price: '৳২০০০-৪০০০', priceRange: [2000, 4000], shop: 'পাম্প দোকান, হার্ডওয়্যার দোকান', essential: false },
      { name: 'ফগার নজল সেট (10-20 পিস)', nameEn: 'Fogger Nozzle Set (10-20 pcs)', quantity: 1, price: '৳৩০০-৫০০', priceRange: [300, 500], shop: 'কৃষি সরঞ্জাম দোকান', essential: true },
      { name: 'পিই পাইপ (4mm, 20 মিটার)', nameEn: 'PE Pipe 4mm (20m)', quantity: 1, price: '৳২০০-৩০০', priceRange: [200, 300], shop: 'কৃষি সরঞ্জাম দোকান', essential: true },
    ]
  },
  {
    category: '🚿 রুফ স্প্রিংকলার সিস্টেম — রিলে IN7 / GPIO 15',
    categoryEn: 'Roof Sprinkler System — Relay IN7 / GPIO 15',
    items: [
      { name: 'DC 12V সোলেনয়েড ভালভ (3/4", NC) — স্প্রিংকলার', nameEn: 'DC 12V Solenoid Valve 3/4" NC — Sprinkler', quantity: 1, price: '৳৩০০-৬০০', priceRange: [300, 600], shop: 'ইলেকট্রনিক্স / প্লাম্বিং দোকান', essential: false },
      { name: 'রুফ স্প্রিংকলার হেড (360°, ৪-৬ পিস)', nameEn: 'Roof Sprinkler Heads 360° (4-6 pcs)', quantity: 1, price: '৳৪০০-৬০০', priceRange: [400, 600], shop: 'কৃষি সরঞ্জাম / হার্ডওয়্যার দোকান', essential: false },
      { name: 'PVC পাইপ (1/2", 20 মিটার) + ফিটিংস', nameEn: 'PVC Pipe 1/2" (20m) + Fittings', quantity: 1, price: '৳৩০০-৫০০', priceRange: [300, 500], shop: 'হার্ডওয়্যার দোকান', essential: false },
    ]
  },
  {
    category: 'পাওয়ার সাপ্লাই',
    categoryEn: 'Power Supply',
    items: [
      { name: '12V 3A DC অ্যাডাপ্টার (রিলে + ESP32)', nameEn: '12V 3A DC Power Adapter', quantity: 1, price: '৳২৫০-৪০০', priceRange: [250, 400], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
      { name: 'LM2596 DC-DC Buck Converter (12V → 5V, 3A)', nameEn: 'LM2596 Buck Converter 3A', quantity: 1, price: '৳৮০-১৫০', priceRange: [80, 150], shop: 'টেকশপ বিডি, রোবটিক্স বিডি', essential: true },
      { name: '12V DC পাওয়ার কানেক্টর (5.5mm x 2.1mm)', nameEn: '12V DC Power Connector 5.5mm', quantity: 1, price: '৳৩০-৬০', priceRange: [30, 60], shop: 'ইলেকট্রনিক্স দোকান', essential: true },
      { name: 'ব্যাটারি ব্যাকআপ মডিউল (TP4056 + 18650)', nameEn: 'Battery Backup Module (TP4056 + 18650)', quantity: 1, price: '৳৩০০-৫০০', priceRange: [300, 500], shop: 'রোবটিক্স বিডি', essential: false },
      { name: '18650 ব্যাটারি (3.7V 3000mAh)', nameEn: '18650 Battery 3.7V 3000mAh', quantity: 2, price: '৳২৫০-৩৫০/পিস', priceRange: [500, 700], shop: 'টেকশপ বিডি', essential: false },
    ]
  },
  {
    category: '⚡ রেজিস্টর ও ক্যাপাসিটর (অত্যাবশ্যক)',
    categoryEn: 'Resistors & Capacitors (Critical)',
    items: [
      { name: '10K Ω পুল-আপ রেজিস্টর (DHT22 DATA ↔ VCC)', nameEn: '10K Ω Pull-up Resistor (for DHT22)', quantity: 2, price: '৳৫-১০/পিস', priceRange: [10, 20], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
      { name: '1000μF 25V ইলেকট্রোলাইটিক ক্যাপাসিটর (ESP32 স্ট্যাবিলিটি)', nameEn: '1000μF 25V Capacitor (ESP32 Stability)', quantity: 1, price: '৳১৫-৩০', priceRange: [15, 30], shop: 'ইলেকট্রনিক্স দোকান', essential: true },
      { name: '100μF 25V ইলেকট্রোলাইটিক ক্যাপাসিটর (MQ-137 ফিল্টার)', nameEn: '100μF 25V Capacitor (MQ-137 Filter)', quantity: 1, price: '৳১০-২০', priceRange: [10, 20], shop: 'ইলেকট্রনিক্স দোকান', essential: true },
    ]
  },
  {
    category: 'তার ও সংযোগ',
    categoryEn: 'Wires & Connectors',
    items: [
      { name: 'জাম্পার ওয়্যার সেট (M-M, M-F, F-F — ৪০ পিস প্রতি ধরনে)', nameEn: 'Jumper Wire Set (M-M, M-F, F-F)', quantity: 1, price: '৳১৫০-২৫০', priceRange: [150, 250], shop: 'টেকশপ বিডি', essential: true },
      { name: 'ব্রেডবোর্ড (830 পয়েন্ট)', nameEn: 'Breadboard (830 point)', quantity: 1, price: '৳১৫০-২০০', priceRange: [150, 200], shop: 'রোবটিক্স বিডি', essential: true },
      { name: 'টার্মিনাল ব্লক (2-পিন, AC সংযোগের জন্য)', nameEn: 'Terminal Block 2-pin (for AC)', quantity: 8, price: '৳১০-২০/পিস', priceRange: [80, 160], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
      { name: 'AC ওয়্যার 1.5mm² (লাল, কালো, সবুজ — ১০ মিটার)', nameEn: 'AC Wire 1.5mm² (10m)', quantity: 1, price: '৳১৫০-২৫০', priceRange: [150, 250], shop: 'ইলেকট্রিক্যাল দোকান', essential: true },
    ]
  },
  {
    category: 'GSM মডিউল (ঐচ্ছিক) — GPIO 23 (TX) / 19 (RX)',
    categoryEn: 'GSM Module (Optional) — GPIO 23/19',
    items: [
      { name: 'SIM800L GSM মডিউল', nameEn: 'SIM800L GSM Module', quantity: 1, price: '৳৪৫০-৬০০', priceRange: [450, 600], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'GSM অ্যান্টেনা (SMA কানেক্টর)', nameEn: 'GSM Antenna (SMA)', quantity: 1, price: '৳৫০-১০০', priceRange: [50, 100], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'SIM কার্ড (GP/Robi/Banglalink)', nameEn: 'SIM Card (any operator)', quantity: 1, price: '৳৫০-১০০', priceRange: [50, 100], shop: 'মোবাইল দোকান', essential: false },
    ]
  },
  {
    category: 'এনক্লোজার ও সুরক্ষা',
    categoryEn: 'Enclosure & Protection',
    items: [
      { name: 'প্লাস্টিক জংশন বক্স IP65 — কন্ট্রোলার বক্স (ESP32 + সেন্সর)', nameEn: 'IP65 Junction Box — Controller (ESP32)', quantity: 1, price: '৳২০০-৪০০', priceRange: [200, 400], shop: 'হার্ডওয়্যার দোকান', essential: true },
      { name: 'প্লাস্টিক জংশন বক্স IP65 — পাওয়ার বক্স (রিলে + AC)', nameEn: 'IP65 Junction Box — Power (Relay + AC)', quantity: 1, price: '৳৩০০-৫০০', priceRange: [300, 500], shop: 'হার্ডওয়্যার দোকান', essential: true },
      { name: 'কেবল গ্ল্যান্ড PG9/PG11 (বক্সে তার ঢোকানোর জন্য)', nameEn: 'Cable Gland PG9/PG11', quantity: 6, price: '৳১৫-২৫/পিস', priceRange: [90, 150], shop: 'ইলেকট্রিক্যাল দোকান', essential: true },
      { name: 'DIN রেইল (MCB ও কন্ট্যাক্টর মাউন্ট করতে)', nameEn: 'DIN Rail (for MCB mounting)', quantity: 1, price: '৳৮০-১৫০', priceRange: [80, 150], shop: 'ইলেকট্রিক্যাল দোকান', essential: false },
    ]
  },
];

// Updated Pin Mapping (v8.0 - 8-Channel Relay - 2026)
export const wiringConnections = [
  { component: 'DHT22 #1', pin: 'DATA', esp32Pin: 'GPIO 4', color: 'bg-green-500', note: '10K রেজিস্টর VCC ও DATA এর মধ্যে' },
  { component: 'DHT22 #1', pin: 'VCC', esp32Pin: '3.3V', color: 'bg-red-500', note: '' },
  { component: 'DHT22 #1', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'DHT22 #2', pin: 'DATA', esp32Pin: 'GPIO 16 (RX2)', color: 'bg-green-400', note: '10K রেজিস্টর (বড় শেডের জন্য)' },
  { component: 'DHT22 #2', pin: 'VCC', esp32Pin: '3.3V', color: 'bg-red-500', note: '' },
  { component: 'DHT22 #2', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'MQ-137', pin: 'AO', esp32Pin: 'GPIO 34', color: 'bg-yellow-500', note: 'এনালগ আউটপুট (২৪ঘণ্টা প্রিহিট)' },
  { component: 'MQ-137', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'MQ-137', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'YF-S201', pin: 'Signal', esp32Pin: 'GPIO 18', color: 'bg-blue-500', note: 'পালস আউটপুট (তীর চিহ্ন অনুসরণ)' },
  { component: 'YF-S201', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'YF-S201', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'ZMPT101B', pin: 'OUT', esp32Pin: 'GPIO 35', color: 'bg-cyan-500', note: 'AC ভোল্টেজ মনিটর' },
  { component: 'ZMPT101B', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'ZMPT101B', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'LDR', pin: 'One leg', esp32Pin: 'GPIO 36', color: 'bg-amber-400', note: 'আলো সেন্সর (ঐচ্ছিক)' },
  { component: 'LDR', pin: 'Other leg', esp32Pin: '3.3V', color: 'bg-red-500', note: '10kΩ → GND ডিভাইডার' },
  { component: 'Relay IN1', pin: 'Exhaust Fan', esp32Pin: 'GPIO 25', color: 'bg-purple-500', note: '🌀 এক্সহস্ট ফ্যান' },
  { component: 'Relay IN2', pin: 'Ceiling Fan', esp32Pin: 'GPIO 26', color: 'bg-blue-400', note: '🌀 সিলিং ফ্যান (≥25°সে চালু)' },
  { component: 'Relay IN3', pin: 'Light', esp32Pin: 'GPIO 27', color: 'bg-lime-500', note: '💡 লাইটিং' },
  { component: 'Relay IN4', pin: 'Heater', esp32Pin: 'GPIO 14', color: 'bg-orange-500', note: '🔥 হিটার (ব্রয়লার)' },
  { component: 'Relay IN5', pin: 'Fogger', esp32Pin: 'GPIO 12', color: 'bg-teal-500', note: '💦 ফগার DC সোলেনয়েড ভালভ (12V)' },
  { component: 'Relay IN6', pin: 'Alarm', esp32Pin: 'GPIO 13', color: 'bg-red-400', note: '🔔 অ্যালার্ম' },
  { component: 'Relay IN7', pin: 'Sprinkler', esp32Pin: 'GPIO 15', color: 'bg-sky-500', note: '🚿 রুফ স্প্রিংকলার (HSI ≥80)' },
  { component: 'Relay IN8', pin: 'Circulation Fan', esp32Pin: 'GPIO 33', color: 'bg-indigo-500', note: '💨 সার্কুলেশন ফ্যান' },
  { component: 'Relay Module', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'Relay Module', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'AC Fuse Holder', pin: 'L (Line)', esp32Pin: '২২০V AC ইনপুট', color: 'bg-rose-600', note: '⚡ FBH-01 / CH141 5×20mm holder — ESP32 বক্সের আগে' },
  { component: 'AC Fuse', pin: 'Load side', esp32Pin: 'LM2596 IN+ / Relay JD-VCC', color: 'bg-rose-500', note: '⚡ 5A 250V glass fuse (5×20mm) — short-circuit protection' },
  { component: 'Piezo Buzzer', pin: '+', esp32Pin: 'Relay IN6 (GPIO 13)', color: 'bg-amber-500', note: '🔔 পিজো বাজার (রিলে দিয়ে কন্ট্রোল)' },
  { component: 'TFT ILI9341', pin: 'SCK', esp32Pin: 'GPIO 21', color: 'bg-fuchsia-500', note: '🖥️ SPI ক্লক (v8.3.0)' },
  { component: 'TFT ILI9341', pin: 'MOSI (SDI)', esp32Pin: 'GPIO 22', color: 'bg-fuchsia-500', note: '🖥️ SPI ডেটা' },
  { component: 'TFT ILI9341', pin: 'CS', esp32Pin: 'GPIO 17', color: 'bg-fuchsia-400', note: '🖥️ চিপ সিলেক্ট' },
  { component: 'TFT ILI9341', pin: 'DC (RS)', esp32Pin: 'GPIO 5', color: 'bg-fuchsia-400', note: '🖥️ ডেটা/কমান্ড (আগের GSM_RST পিন)' },
  { component: 'TFT ILI9341', pin: 'RESET', esp32Pin: 'ESP32 EN (3.3V)', color: 'bg-gray-500', note: 'আলাদা GPIO লাগে না' },
  { component: 'TFT ILI9341', pin: 'VCC / LED', esp32Pin: '3.3V', color: 'bg-red-500', note: 'ব্যাকলাইট সরাসরি 3.3V' },
  { component: 'TFT ILI9341', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'ULN2803A', pin: 'IN1..IN8', esp32Pin: 'রিলে GPIO 25,26,27,14,12,13,15,33', color: 'bg-emerald-500', note: '💡 রিলে সিগন্যালের সমান্তরালে প্যানেল LED' },
  { component: 'ULN2803A', pin: 'COM (pin 10)', esp32Pin: '12V (+)', color: 'bg-red-500', note: 'LED সাপ্লাই ও ফ্লাইব্যাক ক্ল্যাম্প' },
  { component: 'ULN2803A', pin: 'GND (pin 9)', esp32Pin: 'কমন GND', color: 'bg-gray-700', note: '' },
  { component: 'Panel LED ×8', pin: 'Anode (+)', esp32Pin: '12V (1kΩ সিরিজ)', color: 'bg-lime-500', note: 'Cathode → ULN2803A OUT পিন' },
];


// Detailed step-by-step wiring guide for each sensor
export const detailedWiringGuide = [
  {
    id: 'power-setup',
    name: '⚡ 12V পাওয়ার সেটআপ (অ্যাডাপ্টার + LM2596 + DC Connector)',
    nameEn: '12V Power Setup (Adapter + LM2596 + DC Connector)',
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    pins: [
      { sensorPin: 'AC Fuse Holder (FBH-01 / CH141)', esp32Pin: '২২০V AC L (Line) → 5A Fuse → Load', wireColor: 'লাল/কালো', wireNameEn: 'RED/BLACK', instruction: '⚡ ২২০V AC ইনপুটের L (ফেজ) লাইনে Panel Mount Fuse Holder (FBH-01 / CH141) সিরিজে লাগান। ভেতরে ৫A ২৫০V ৫×২০mm glass fuse দিন। ফিউজের আউটপুট সাইড → 12V অ্যাডাপ্টার/রিলে বক্সে যাবে', warning: '⛔ ফিউজ ছাড়া ESP32 বোর্ড ও রিলে মডিউল শর্ট-সার্কিটে ক্ষতিগ্রস্ত হতে পারে! RoboticsBD/TechshopBD-তে “Panel Mount Fuse Holder 5x20mm” এবং “5A 250V Glass Fuse” সার্চ করুন।' },
      { sensorPin: 'DC Connector (+)', esp32Pin: '12V অ্যাডাপ্টার আউটপুট', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 12V অ্যাডাপ্টারের প্লাগ → DC Connector (5.5mm) এ ঢোকান। কানেক্টরের + টার্মিনাল থেকে লাল তার বের করুন', warning: null },
      { sensorPin: 'DC Connector (-)', esp32Pin: '12V অ্যাডাপ্টার GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ DC কানেক্টরের - টার্মিনাল থেকে কালো তার বের করুন → এটি কমন GND হবে', warning: null },
      { sensorPin: '12V (+) লাইন', esp32Pin: 'রিলে মডিউল JD-VCC', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 DC কানেক্টরের + থেকে লাল তার → রিলে মডিউলের JD-VCC পিনে সরাসরি দিন (12V)', warning: '⚠️ প্রথমে রিলে বোর্ডের JD-VCC ও VCC এর মাঝের হলুদ জাম্পার খুলে ফেলুন!' },
      { sensorPin: '12V (+) লাইন', esp32Pin: 'LM2596 IN+ (ইনপুট)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 DC কানেক্টরের + থেকে আরেকটি লাল তার → LM2596 এর IN+ পিনে দিন', warning: null },
      { sensorPin: 'GND লাইন', esp32Pin: 'LM2596 IN- (ইনপুট)', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ DC কানেক্টরের - থেকে কালো তার → LM2596 এর IN- পিনে দিন', warning: null },
      { sensorPin: 'LM2596 OUT+ (আউটপুট)', esp32Pin: 'ESP32 VIN', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 LM2596 এর OUT+ → ESP32 এর VIN পিনে দিন (⚡ আগে মাল্টিমিটারে 5.0V সেট করুন!)', warning: '⛔ ESP32 কানেক্ট করার আগে অবশ্যই মাল্টিমিটার দিয়ে আউটপুট 5.0V নিশ্চিত করুন! ভুল ভোল্টেজে ESP32 পুড়ে যাবে!' },
      { sensorPin: 'LM2596 OUT- (আউটপুট)', esp32Pin: 'ESP32 GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ LM2596 এর OUT- → ESP32 এর GND পিনে দিন', warning: null },
      { sensorPin: 'রিলে GND', esp32Pin: 'কমন GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ রিলে মডিউলের GND → ESP32 GND / LM2596 OUT- তে কমন GND করুন', warning: null },
      { sensorPin: 'রিলে VCC (সিগন্যাল)', esp32Pin: 'ESP32 VIN (5V)', wireColor: 'কমলা', wireNameEn: 'ORANGE', instruction: '🟠 রিলে মডিউলের VCC (সিগন্যাল সাইড) → LM2596 OUT+ বা ESP32 VIN (5V) তে দিন', warning: 'এটি JD-VCC না! এটি রিলে লজিক সিগন্যালের পাওয়ার।' },
    ],
    extraNote: '⚡ এই সেটআপে একটি 12V অ্যাডাপ্টার দিয়ে পুরো সিস্টেম চলে: 12V সরাসরি রিলে কয়েলে যায় (শক্তিশালী ক্লিক), এবং LM2596 দিয়ে 5V বানিয়ে ESP32 ও সেন্সরে দেওয়া হয়।',
    resistorNote: null,
    tips: [
      '⚡ ২২০V AC লাইনে FBH-01/CH141 ৫×২০mm হোল্ডার + ৫A ২৫০V গ্লাস ফিউজ অবশ্যই লাগান — RoboticsBD/TechshopBD-তে “Panel Mount Fuse Holder 5x20mm” সার্চ করুন',
      '🔧 LM2596 স্ক্রু ঘুরিয়ে আউটপুট ভোল্টেজ 5.0V সেট করুন — ESP32 কানেক্টের আগে!',
      '📏 মাল্টিমিটারের লাল প্রোব OUT+ এ এবং কালো প্রোব OUT- এ ধরে ভোল্টেজ মাপুন',
      '⚠️ রিলে বোর্ডের JD-VCC জাম্পার অবশ্যই খুলুন — নইলে 12V ESP32 তে চলে যাবে!',
      '🔌 সব GND একসাথে কমন করুন (অ্যাডাপ্টার, LM2596, ESP32, রিলে)',
      '✅ সঠিক সেটআপে রিলে জোরে ক্লিক করবে এবং ESP32 স্থিতিশীলভাবে চলবে',
    ],
    hasPowerSetupDiagram: true,
    powerSetupInfo: {
      title: '🔌 12V পাওয়ার ডিস্ট্রিবিউশন ডায়াগ্রাম',
      diagram: `২২০V AC L (Line)
       │
       ▼
  ┌─────────────┐
  │5A 250V Fuse │ ← FBH-01/CH141 holder + 5×20mm fuse
  └─────────────┘
       │
       ▼
  12V 3A অ্যাডাপ্টার
       │
       ▼
  DC Connector 5.5mm
   (+)          (-)
    │             │
    ├─────────────┤ ← কমন GND বাস
    │             │
    ▼             ▼
 ┌──┴──┐     ┌───┴───┐
 │12V+ │     │  GND  │
 └──┬──┘     └───┬───┘
    │             │
    ├──► রিলে JD-VCC (12V সরাসরি)
    │        │
    │        └──► রিলে GND
    │
    ▼
 ┌────────────┐
 │  LM2596    │
 │  IN+ ← 12V│
 │  IN- ← GND│
 │            │
 │  OUT+ → 5V │──► ESP32 VIN
 │  OUT- → GND│──► ESP32 GND
 └────────────┘        │
                       ├──► রিলে VCC (সিগন্যাল, 5V)
                       ├──► DHT22 VCC (3.3V পিন থেকে)
                       └──► সেন্সর পাওয়ার`,
      beforeStart: [
        { step: 1, text: '12V অ্যাডাপ্টার প্লাগ ইন করবেন না — সব ওয়্যারিং শেষে প্লাগ করুন', icon: '🔌' },
        { step: 2, text: 'LM2596 বোর্ডে ছোট সোনালি স্ক্রু আছে — ঘড়ির কাঁটার দিকে ঘুরালে ভোল্টেজ কমে', icon: '🔧' },
        { step: 3, text: 'DC কানেক্টরে + ও - চিহ্নিত থাকে — সেন্টার পিন সাধারণত + হয়', icon: '📌' },
      ],
      jumperWarning: {
        title: '⛔ রিলে জাম্পার সেটিং (অত্যন্ত গুরুত্বপূর্ণ!)',
        before: 'JD-VCC [═] VCC ← জাম্পার ON (5V মোড — পুরানো)',
        after: 'JD-VCC [ ] VCC ← জাম্পার OFF (12V মোড — নতুন)',
        explanation: 'জাম্পার খুললে JD-VCC এ 12V এবং VCC তে 5V আলাদাভাবে দেওয়া যায়। না খুললে 12V সরাসরি ESP32 তে ঢুকে ESP32 পুড়ে যাবে!',
      },
      voltageCheckSteps: [
        { step: 1, text: 'LM2596 এর IN+ ও IN- তে 12V কানেক্ট করুন (ESP32 ছাড়া)', icon: '🔴' },
        { step: 2, text: 'মাল্টিমিটার DC মোডে সেট করুন', icon: '📟' },
        { step: 3, text: 'লাল প্রোব OUT+ এ, কালো প্রোব OUT- এ ধরুন', icon: '📏' },
        { step: 4, text: 'স্ক্রু ধীরে ধীরে ঘুরিয়ে ঠিক 5.0V সেট করুন (4.8V-5.2V গ্রহণযোগ্য)', icon: '🎯' },
        { step: 5, text: '5V নিশ্চিত হলে অ্যাডাপ্টার খুলুন → ESP32 VIN এ কানেক্ট করুন → আবার প্লাগ করুন', icon: '✅' },
      ],
    },
  },
  {
    id: 'capacitor',
    name: '1000μF ক্যাপাসিটর (ESP32 পাওয়ার স্ট্যাবিলিটি — CRITICAL)',
    nameEn: '1000μF Capacitor (ESP32 Power Stability — CRITICAL)',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    pins: [
      { sensorPin: '+ পা (লম্বা পা)', esp32Pin: 'VIN (5V)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 ক্যাপাসিটরের লম্বা পা (+) → ESP32 এর VIN পিনে লাগান', warning: '⚠️ পোলারিটি সতর্কতা: লম্বা পা = VIN (পজিটিভ), সাদা স্ট্রাইপ সাইড = GND (নেগেটিভ)। উল্টো লাগালে ক্যাপাসিটর ফেটে যেতে পারে!' },
      { sensorPin: '- পা (ছোট পা / সাদা স্ট্রাইপ)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ ক্যাপাসিটরের ছোট পা (-) বা সাদা স্ট্রাইপ সাইড → ESP32 এর GND পিনে লাগান', warning: null },
    ],
    extraNote: '🚨 CRITICAL: রিলে, ম্যাগনেটিক কন্টাক্টর বা বুস্টার পাম্প ON হলে হঠাৎ কারেন্ট স্পাইক হয় যা ESP32 রিবুট করে দেয়। 1000μF ক্যাপাসিটর এই ভোল্টেজ ড্রপ শোষণ করে ESP32 কে স্থিতিশীল রাখে।',
    resistorNote: null,
    tips: ['1000μF 16V বা 25V ইলেকট্রোলাইটিক ক্যাপাসিটর ব্যবহার করুন', 'যতটা সম্ভব ESP32 এর VIN-GND পিনের কাছাকাছি লাগান', 'পোলারিটি: লম্বা পা → VIN (+), সাদা স্ট্রাইপ সাইড → GND (−)', 'এটি ছাড়া রিলে/কন্টাক্টর সুইচিংয়ে ESP32 বারবার রিস্টার্ট হবে!'],
    hasCapacitorDiagram: true,
  },
  {
    id: 'dht22',
    name: 'DHT22 তাপমাত্রা ও আর্দ্রতা সেন্সর',
    nameEn: 'DHT22 Temperature & Humidity Sensor',
    icon: Thermometer,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    pins: [
      { sensorPin: 'পিন ১: VCC (+)', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: DHT22 এর VCC (বাম পিন) → ESP32 এর 3.3V পিনে লাগান', warning: '⚡ ৫V লাগাবেন না! শুধু 3.3V ব্যবহার করুন।' },
      { sensorPin: 'পিন ২: DATA (Signal)', esp32Pin: 'GPIO 4', wireColor: 'হলুদ/সবুজ', wireNameEn: 'YELLOW/GREEN', instruction: '🟡 হলুদ/সবুজ তার: DHT22 এর DATA (মাঝের পিন) → ESP32 এর GPIO 4 পিনে লাগান', warning: null },
      { sensorPin: 'পিন ৩: NC (No Connection)', esp32Pin: '-', wireColor: '-', wireNameEn: '-', instruction: '⬜ এই পিনে কিছু লাগাবেন না (খালি রাখুন)', warning: null },
      { sensorPin: 'পিন ৪: GND (-)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: DHT22 এর GND (ডান পিন) → ESP32 এর GND পিনে লাগান', warning: null },
    ],
    extraNote: '⚠️ গুরুত্বপূর্ণ: DATA ও VCC পিনের মধ্যে একটি 10K রেজিস্টর লাগাতে হবে (পুল-আপ রেজিস্টর)। রেজিস্টরের এক পা DATA পিনে এবং অন্য পা VCC তে লাগান। যদি না থাকে তাহলেও কাজ করবে কিন্তু রিডিং স্থিতিশীল নাও হতে পারে।',
    resistorNote: '📍 10K পুল-আপ রেজিস্টর: DATA পিন ↔ VCC পিন',
    tips: ['সেন্সর সরাসরি সূর্যের আলো থেকে দূরে রাখুন', 'শেডের মাঝামাঝি উচ্চতায় লাগান (মুরগির মাথার উচ্চতায়)'],
  },
  {
    id: 'dht22-2',
    name: 'DHT22 #২ (দ্বিতীয় সেন্সর - ঐচ্ছিক)',
    nameEn: 'DHT22 #2 (Second Sensor - Optional)',
    icon: Thermometer,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    pins: [
      { sensorPin: 'পিন ১: VCC (+)', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: DHT22 #২ এর VCC → ESP32 এর 3.3V (প্রথম সেন্সরের সাথে শেয়ার করতে পারেন)', warning: null },
      { sensorPin: 'পিন ২: DATA (Signal)', esp32Pin: 'GPIO 16 (v8) / SHT31 I²C (v10)', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ সাদা তার: DHT22 #২ এর DATA → ESP32 এর GPIO 16 (v8 ফার্মওয়্যারের DHT2_PIN)', warning: '⛔ v8-এ GPIO 15 ব্যবহার করবেন না — সেটি রিলে IN7 (স্প্রিংকলার)। ⛔ v10 বোর্ডে GPIO 16/17 = I²C bus 2 (SHT31/BH1750/SCD41), তাই v10-এ দ্বিতীয় DHT22 লাগাবেন না — SHT31 ব্যবহার করুন।' },
      { sensorPin: 'পিন ৪: GND (-)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: DHT22 #২ এর GND → ESP32 এর GND (প্রথমটির সাথে শেয়ার করা যায়)', warning: null },
    ],
    extraNote: '📌 ভার্সন অনুযায়ী: **v8 (esp32-industrial.ino)** — DHT22 #২ এর DATA = **GPIO 16** (`DHT2_PIN`)। **v10 (esp32-industrial-v10.ino)** — GPIO 16/17 I²C বাসের জন্য সংরক্ষিত, তাই দ্বিতীয় জোনের তাপমাত্রা/আর্দ্রতা SHT31 (I²C) দিয়ে নিতে হবে; সেখানে দ্বিতীয় DHT22 সাপোর্টেড নয়।',
    resistorNote: '📍 10K পুল-আপ রেজিস্টর: DATA (GPIO 16) ↔ VCC (3.3V)।',
    tips: ['শেডের এক প্রান্তে প্রথম এবং অপর প্রান্তে দ্বিতীয় সেন্সর লাগান'],
  },
  {
    id: 'ldr',
    name: 'LDR লাইট সেন্সর (Ambient Light — ঐচ্ছিক, v8)',
    nameEn: 'LDR Light Sensor (Optional Ambient Light, v8)',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    pins: [
      { sensorPin: 'LDR এক পা', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 LDR-এর এক পা → ESP32 এর 3.3V পিনে লাগান', warning: null },
      { sensorPin: 'LDR অন্য পা', esp32Pin: 'GPIO 36 (VP)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 LDR-এর অন্য পা → ESP32 এর GPIO 36 (VP / ADC1_CH0) পিনে লাগান', warning: '⛔ GPIO 36 শুধু ইনপুট পিন — এখানে কোনো আউটপুট/রিলে লাগাবেন না।' },
      { sensorPin: '10kΩ রেজিস্টর এক পা', esp32Pin: 'GPIO 36 (VP)', wireColor: 'কালো/বেগুনি', wireNameEn: 'BLACK/VIOLET', instruction: '⚫ 10kΩ রেজিস্টরের এক পা GPIO 36-এর কাছে (LDR-এর সাথে একই পয়েন্টে) জোড়া দিন', warning: null },
      { sensorPin: '10kΩ রেজিস্টর অন্য পা', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ 10kΩ রেজিস্টরের অন্য পা → ESP32 এর GND পিনে লাগান', warning: null },
    ],
    extraNote: `💡 LDR (Light Dependent Resistor) দিয়ে বর্তমান আলোর মান (lux) আনুমানিক মাপা যায়। v8 ফার্মওয়্যার বুটে GPIO 36-এ সিগন্যাল দেখলে \`ldrAvailable = true\` সেট করে এবং স্মার্ট লাইটিং-এ "দিনের আলো শনাক্ত করে লাইট অফ" (power-save) কাজ করবে।\n\n📌 সার্কিট: 3.3V → LDR → GPIO 36 → 10kΩ → GND\n📌 বেশি আলো → LDR রেজিস্ট্যান্স কমে → GPIO 36-এ ভোল্টেজ বাড়ে\n📌 অন্ধকার → LDR রেজিস্ট্যান্স বাড়ে → GPIO 36-এ ভোল্টেজ কমে\n\nLDR না লাগালেও ফার্মওয়্যার স্বাভাবিকভাবে চলবে — তখন শুধু সময়-ভিত্তিক (schedule) লাইটিং কাজ করবে।`,
    resistorNote: '📍 10kΩ পুল-ডাউন/ডিভাইডার রেজিস্টর: GPIO 36 ↔ GND (LDR-এর বিপরীত পা 3.3V-তে)',
    tips: ['শেডের ছাদের কাছে বা আলো পড়ে এমন জায়গায় লাগান (সরাসরি সূর্য না)', 'LDR-এর দুটি পা পার্থক্য নেই — যেকোনো দিকে লাগানো যায়', 'ভোল্টেজ ডিভাইডারে 3.3V এর বেশি যেন না যায় — GPIO 36 নষ্ট হতে পারে', 'যদি lux রিডিং উল্টো আসে (অন্ধকারে বেশি), তাহলে LDR-এর পা 3.3V ও GND-এর সাথে বদলে দিন'],
  },
  {
    id: 'mq137',
    name: 'MQ-137 / MQ-135 অ্যামোনিয়া গ্যাস সেন্সর (analog fallback)',
    nameEn: 'MQ-137 / MQ-135 Ammonia Sensor (analog fallback, GPIO 34)',
    icon: Wind,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    pins: [
      { sensorPin: 'VCC (+5V)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: MQ-137 এর VCC → ESP32 এর VIN পিন (5V প্রয়োজন)', warning: 'এই সেন্সর 5V-তে চলে। 3.3V দিলে কাজ করবে না।' },
      { sensorPin: 'AO (Analog Output)', esp32Pin: 'GPIO 34', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: MQ-137 এর AO পিন → ESP32 এর GPIO 34 (ADC ইনপুট)', warning: null },
      { sensorPin: 'DO (Digital Output)', esp32Pin: '-', wireColor: '-', wireNameEn: '-', instruction: '⬜ DO পিন ব্যবহার করা হচ্ছে না (খালি রাখুন)', warning: null },
      { sensorPin: 'GND (-)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: MQ-137 এর GND → ESP32 এর GND', warning: null },
    ],
    extraNote: '⚠️ গুরুত্বপূর্ণ: প্রথমবার চালু করার পর ২৪-৪৮ ঘন্টা একটানা চালু রাখুন ("প্রিহিট/বার্ন-ইন")। এই সময় সেন্সর গরম থাকবে এবং রিডিং স্থিতিশীল হতে সময় লাগবে। প্রিহিটের আগে রিডিং ভুল আসতে পারে।\n\n📌 firmware constant `MQ135_PIN = GPIO 34` — MQ-135 ও MQ-137 উভয়ই একই analog GPIO-তে চলে (interchangeable)। ZE03-NH3 (Phase 9) detect হলে এই sensor auto-disabled হয়।',
    resistorNote: null,
    tips: ['মাটি থেকে ১-২ ফুট উচ্চতায় লাগান (অ্যামোনিয়া ভারী তাই নিচে জমে)', 'বাতাসের চলাচল আছে এমন জায়গায় রাখুন', '🥚 লেয়ার: 15/25 ppm থ্রেশহোল্ড', '🐔 ব্রয়লার: 20/30 ppm থ্রেশহোল্ড'],
  },
  {
    id: 'mq137-capacitor',
    name: '১০০μF ক্যাপাসিটর (MQ-137 পাওয়ার ফিল্টার)',
    nameEn: '100μF Capacitor (MQ-137 Power Filter)',
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    pins: [
      { sensorPin: '+ পা (লম্বা পা)', esp32Pin: 'MQ-137 VCC', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 ক্যাপাসিটরের লম্বা পা (+) → MQ-137 সেন্সরের VCC পিনে সোল্ডার/কানেক্ট করুন', warning: '⚠️ + ও - উল্টো লাগালে ক্যাপাসিটর ফেটে যেতে পারে!' },
      { sensorPin: '- পা (ছোট পা / সাদা স্ট্রাইপ)', esp32Pin: 'MQ-137 GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ ক্যাপাসিটরের ছোট পা (-) বা সাদা স্ট্রাইপ সাইড → MQ-137 সেন্সরের GND পিনে কানেক্ট করুন', warning: null },
    ],
    extraNote: '⚡ কেন দরকার: MQ-137 সেন্সরের ভেতরে হিটার কয়েল আছে যা প্রচুর কারেন্ট টানে (~150mA)। এই হিটারের কারণে পাওয়ার লাইনে নয়েজ/ফ্লাকচুয়েশন হয় যা অ্যানালগ রিডিং (ADC) ভুল করে দিতে পারে। ক্যাপাসিটর এই নয়েজ ফিল্টার করে সঠিক অ্যামোনিয়া রিডিং নিশ্চিত করে।',
    resistorNote: null,
    tips: [
      '100μF 25V ইলেকট্রোলাইটিক ক্যাপাসিটর ব্যবহার করুন',
      'MQ-137 এর VCC-GND পিনের যতটা সম্ভব কাছাকাছি লাগান',
      'পোলারিটি (+ / -) অবশ্যই সঠিকভাবে মেলান — লম্বা পা = +, সাদা স্ট্রাইপ = −',
      'ESP32 এর VIN-GND ক্যাপাসিটরের পাশাপাশি এটি আলাদাভাবে MQ-137 তে লাগান',
    ],
  },
  {
    id: 'yfs201',
    name: 'YF-S201 ওয়াটার ফ্লো সেন্সর',
    nameEn: 'YF-S201 Water Flow Sensor',
    icon: Droplets,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    pins: [
      { sensorPin: 'VCC (লাল তার)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: ওয়াটার সেন্সর থেকে আসা লাল তার → ESP32 এর VIN (5V)', warning: null },
      { sensorPin: 'Signal/Pulse (হলুদ তার)', esp32Pin: 'GPIO 18', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: ওয়াটার সেন্সর থেকে আসা হলুদ/সাদা তার → ESP32 এর GPIO 18 (পালস ইনপুট)', warning: null },
      { sensorPin: 'GND (কালো তার)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: ওয়াটার সেন্সর থেকে আসা কালো তার → ESP32 এর GND', warning: null },
    ],
    extraNote: '📍 গুরুত্বপূর্ণ: সেন্সরের গায়ে তীর চিহ্ন (→) আছে। পানি যে দিকে প্রবাহিত হয় সে দিকে তীর মুখ করে লাগাতে হবে। উল্টো লাগালে রিডিং আসবে না!',
    resistorNote: null,
    tips: ['মূল পানির পাইপে (ইনলেট) লাগান', 'সংযোগস্থলে টেফলন টেপ ব্যবহার করুন লিক এড়াতে'],
  },
  {
    id: 'zmpt101b',
    name: 'ZMPT101B ভোল্টেজ সেন্সর (পাওয়ার মনিটর)',
    nameEn: 'ZMPT101B Voltage Sensor',
    icon: Power,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    pins: [
      { sensorPin: 'VCC (DC Side)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: ZMPT101B এর VCC → ESP32 এর VIN (5V)', warning: null },
      { sensorPin: 'OUT/Signal (DC Side)', esp32Pin: 'GPIO 35', wireColor: 'কমলা', wireNameEn: 'ORANGE', instruction: '🟠 কমলা তার: ZMPT101B এর OUT পিন → ESP32 এর GPIO 35 (ADC ইনপুট)', warning: null },
      { sensorPin: 'GND (DC Side)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: ZMPT101B এর GND → ESP32 এর GND', warning: null },
      { sensorPin: 'L (AC Side - Live)', esp32Pin: 'মেইন Live', wireColor: 'লাল/বাদামী', wireNameEn: 'RED/BROWN', instruction: '⚡ AC লাইভ তার: ২২০V মেইন সুইচের Live → ZMPT101B এর L টার্মিনালে', warning: '⚡ বিপদ! মেইন সুইচ বন্ধ করে কাজ করুন!' },
      { sensorPin: 'N (AC Side - Neutral)', esp32Pin: 'মেইন Neutral', wireColor: 'নীল/কালো', wireNameEn: 'BLUE/BLACK', instruction: '⚡ AC নিউট্রাল তার: ২২০V মেইন সুইচের Neutral → ZMPT101B এর N টার্মিনালে', warning: '⚡ বিপদ! মেইন সুইচ বন্ধ করে কাজ করুন!' },
    ],
    extraNote: '⚡⚡ সতর্কতা: এটি ২২০V AC লাইনে সংযুক্ত হয়। ভুল কানেকশনে ইলেকট্রিক শক বা আগুন লাগতে পারে! অভিজ্ঞ ইলেকট্রিশিয়ান দিয়ে এই অংশ করান!',
    resistorNote: null,
    tips: ['AC লাইনের Live ও Neutral তার সেন্সরের AC পাশে লাগান', 'কাজের সময় মেইন সুইচ অফ রাখুন'],
  },
  {
    id: 'relay',
    name: '৮-চ্যানেল রিলে মডিউল',
    nameEn: '8-Channel Relay Module',
    icon: ToggleLeft,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    pins: [
      // --- পাওয়ার হেডার (৩ পিন): JD-VCC, VCC, GND ---
      { sensorPin: 'JD-VCC (রিলে কয়েল পাওয়ার)', esp32Pin: '12V অ্যাডাপ্টার (+)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: রিলে পাওয়ার হেডারের JD-VCC → 12V DC অ্যাডাপ্টারের (+) পজিটিভ — রিলে কয়েলগুলো আলাদা 12V তে চলবে', warning: '⚡ JD-VCC ও VCC এর মাঝের জাম্পার ক্যাপ অবশ্যই খুলে ফেলুন! VCC পিন ফাঁকা রাখুন।' },
      { sensorPin: 'VCC (পাওয়ার হেডার)', esp32Pin: '❌ ফাঁকা রাখুন', wireColor: '—', wireNameEn: 'NONE', instruction: '🚫 পাওয়ার হেডারের VCC পিনে কিছু লাগাবেন না — জাম্পার খোলা থাকবে', warning: 'জাম্পার খোলা = অপটিক্যাল আইসোলেশন সক্রিয়। এটি ESP32 কে রিলে নয়েজ থেকে রক্ষা করে।' },
      { sensorPin: 'GND (পাওয়ার হেডার)', esp32Pin: 'GND (কমন)', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: রিলে পাওয়ার হেডারের GND → ESP32 এর GND এবং 12V অ্যাডাপ্টারের (−) নেগেটিভ — কমন গ্রাউন্ড', warning: '⚠️ ESP32 ও 12V অ্যাডাপ্টারের GND একসাথে যুক্ত করা বাধ্যতামূলক (কমন গ্রাউন্ড)!' },
      // --- কন্ট্রোল হেডার (১০ পিন): IN1-IN8, VCC, GND ---
      { sensorPin: 'VCC (কন্ট্রোল হেডার)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 কন্ট্রোল হেডারের VCC → ESP32 এর VIN (5V) — Optocoupler লজিক পাওয়ার (IN1-IN8 এর পাশে)', warning: '📌 কন্ট্রোল সাইডে ১০টি পিন: IN1-IN8 + VCC + GND। এই VCC তে ESP32 থেকে 5V দিন।' },
      { sensorPin: 'GND (কন্ট্রোল হেডার)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কন্ট্রোল হেডারের GND → ESP32 এর GND (IN1-IN8 এর পাশের GND)', warning: null },
      { sensorPin: 'IN1 (এক্সহস্ট ফ্যান)', esp32Pin: 'GPIO 25', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ সাদা তার: রিলে IN1 → ESP32 এর GPIO 25 (🌀 এক্সহস্ট ফ্যান)', warning: null },
      { sensorPin: 'IN2 (সিলিং ফ্যান)', esp32Pin: 'GPIO 26', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 সবুজ তার: রিলে IN2 → ESP32 এর GPIO 26 (🌀 সিলিং ফ্যান — ≥25°সে চালু, ≤22°সে বন্ধ)', warning: null },
      { sensorPin: 'IN3 (লাইট)', esp32Pin: 'GPIO 27', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: রিলে IN3 → ESP32 এর GPIO 27 (💡 লাইটিং)', warning: null },
      { sensorPin: 'IN4 (হিটার)', esp32Pin: 'GPIO 14', wireColor: 'কমলা', wireNameEn: 'ORANGE', instruction: '🟠 কমলা তার: রিলে IN4 → ESP32 এর GPIO 14 (🔥 হিটার — ব্রয়লার বয়স-ভিত্তিক)', warning: null },
      { sensorPin: 'IN5 (ফগার)', esp32Pin: 'GPIO 12', wireColor: 'নীল', wireNameEn: 'BLUE', instruction: '🔵 নীল তার: রিলে IN5 → ESP32 এর GPIO 12 (💦 ফগার DC 12V সোলেনয়েড ভালভ)', warning: null },
      { sensorPin: 'IN6 (অ্যালার্ম)', esp32Pin: 'GPIO 13', wireColor: 'বেগুনি', wireNameEn: 'PURPLE', instruction: '🟣 বেগুনি তার: রিলে IN6 → ESP32 এর GPIO 13 (🔔 অ্যালার্ম)', warning: null },
      { sensorPin: 'IN7 (রুফ স্প্রিংকলার)', esp32Pin: 'GPIO 15', wireColor: 'আসমানি', wireNameEn: 'LIGHT BLUE', instruction: '🔵 আসমানি তার: রিলে IN7 → ESP32 এর GPIO 15 (🚿 রুফ স্প্রিংকলার — HSI ≥80 চালু)', warning: null },
      { sensorPin: 'IN8 (সার্কুলেশন ফ্যান)', esp32Pin: 'GPIO 33', wireColor: 'ধূসর', wireNameEn: 'GRAY', instruction: '⚪ ধূসর তার: রিলে IN8 → ESP32 এর GPIO 33 (💨 সার্কুলেশন ফ্যান)', warning: null },
    ],
    extraNote: '⚙️ ৮-চ্যানেল রিলে মডিউলে দুইটি পিন হেডার থাকে:\n• পাওয়ার হেডার (৩ পিন): JD-VCC → 12V, VCC → ফাঁকা, GND → কমন গ্রাউন্ড\n• কন্ট্রোল হেডার (১০ পিন): IN1-IN8 → ESP32 GPIO, VCC → 3.3V, GND → ESP32 GND\nজাম্পার খোলা রাখলে অপটিক্যাল আইসোলেশন সক্রিয় থাকে — ESP32 সুরক্ষিত থাকে। Active LOW লজিক (LOW = রিলে ON)।',
    resistorNote: '📍 জাম্পার ক্যাপ খুলে রাখুন! JD-VCC তে আলাদা 12V DC দিন, পাওয়ার হেডারের VCC ফাঁকা রাখুন। ESP32 ও 12V অ্যাডাপ্টারের GND অবশ্যই একসাথে যুক্ত করুন (কমন গ্রাউন্ড)।',
    tips: ['🌀 IN1: এক্সহস্ট ফ্যান — তাপমাত্রা, HSI, অ্যামোনিয়া ভিত্তিক', '🌀 IN2: সিলিং ফ্যান — তাপমাত্রা ≥25°সে চালু, ≤22°সে বন্ধ', '💡 IN3: লাইটিং — ১৬ ঘণ্টা শিডিউল (লেয়ার)', '🔥 IN4: হিটার — বয়স-ভিত্তিক কার্ভ, 34°সে তে Force OFF', '💦 IN5: ফগার — 32°সে+ এবং 85% আর্দ্রতার নিচে', '🔔 IN6: অ্যালার্ম — NH₃ > 25ppm বা HSI বিপদ', '🚿 IN7: রুফ স্প্রিংকলার — HSI ≥80 চালু, ≤75 বন্ধ (60সে স্প্রে/120সে বিরতি)', '💨 IN8: সার্কুলেশন ফ্যান — বয়স ১০+ দিন থেকে সক্রিয়', 'হাই পাওয়ার ডিভাইস (১০০০W+) এর জন্য SSR বা কন্ট্যাক্টর ব্যবহার করুন'],
    hasFarmTypeMapping: true,
    farmTypeMapping: {
      title: '🏠 ফার্ম টাইপ অনুযায়ী রিলে ডিভাইস ম্যাপিং',
      description: 'অ্যাপে ফার্ম টাইপ (লেয়ার/ব্রয়লার) সিলেক্ট করলে ESP32 স্বয়ংক্রিয়ভাবে সঠিক অটোমেশন লজিক প্রয়োগ করে। তবে রিলের আউটপুটে (NO পোর্ট) সঠিক ডিভাইস ফিজিক্যালি কানেক্ট করতে হবে।',
      relays: [
        {
          relay: 'IN1', gpio: 'GPIO 25', shared: true,
          sharedDevice: '🌀 এক্সজস্ট ফ্যান',
          sharedNote: 'তাপমাত্রা, HSI, অ্যামোনিয়া এবং ফগার চলাকালে স্বয়ংক্রিয় চালু হয়',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN2', gpio: 'GPIO 26', shared: true,
          sharedDevice: '🌀 সিলিং ফ্যান',
          sharedNote: 'তাপমাত্রা ≥25°সে চালু, ≤22°সে বন্ধ। ছাদের নিচে বাতাস সঞ্চালনের জন্য।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN3', gpio: 'GPIO 27', shared: true,
          sharedDevice: '💡 লাইটিং',
          sharedNote: 'লেয়ার: ১৬ ঘণ্টা লাইট শিডিউল। ব্রয়লার: বয়স অনুযায়ী আলোর সময়সূচী।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN4', gpio: 'GPIO 14', shared: true,
          sharedDevice: '🔥 হিটার',
          sharedNote: 'ব্রয়লার বয়স-ভিত্তিক কার্ভ: দিন ১-৩ = ৩৩°সে, দিন ৪-৭ = ৩১°সে, দিন ৮-১৪ = ২৯°সে ইত্যাদি। ৩৪°সে তে Force OFF।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN5', gpio: 'GPIO 12', shared: true,
          sharedDevice: '💦 ফগার DC সোলেনয়েড ভালভ (12V)',
          sharedNote: 'DC 12V ভালভ — রিলে সরাসরি কন্ট্রোল করে। নিরাপদ ক্রম: ভালভ খোলে → ২সে অপেক্ষা → পাম্প চালু (থাকলে) → স্প্রে → পাম্প বন্ধ → ২সে অপেক্ষা → ভালভ বন্ধ।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN6', gpio: 'GPIO 13', shared: true,
          sharedDevice: '🔔 অ্যালার্ম',
          sharedNote: 'NH₃ > 25ppm বা HSI > 42 হলে জরুরি অ্যালার্ম। পাওয়ার আউটেজ সতর্কতা।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN7', gpio: 'GPIO 15', shared: true,
          sharedDevice: '🚿 রুফ স্প্রিংকলার',
          sharedNote: 'HSI ≥80 চালু, ≤75 বন্ধ। 60সে স্প্রে / 120সে বিরতি চক্র। ছাদে পানি স্প্রে করে তাপমাত্রা কমায়।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
        {
          relay: 'IN8', gpio: 'GPIO 33', shared: true,
          sharedDevice: '💨 সার্কুলেশন ফ্যান',
          sharedNote: 'ব্রয়লার: বয়স ১০+ দিন থেকে সক্রিয়। ১০-২০ দিন: ৩ মিনিট পর পর ৩০সে। ২১+ দিন: দিনে একটানা, রাতে ৫ মিনিট পর পর ১ মিনিট।',
          layerDevice: null, broilerDevice: null, layerAutomation: null, broilerAutomation: null,
        },
      ],
    },
    hasAcWiring: true, // Special flag for AC wiring section
    acWiringInfo: {
      title: '⚡ রিলে আউটপুট সাইড - AC লোড কানেকশন (NC, COM, NO)',
      description: 'প্রতিটি রিলের নীল স্ক্রু টার্মিনালে তিনটি পোর্ট থাকে। এখানে ফ্যান, লাইট বা হিটারের AC তার লাগাতে হবে।',
      terminals: [
        { name: 'NC (Normally Closed)', position: 'বাম', useFor: '❌ খালি রাখুন', description: 'রিলে OFF থাকলে কানেক্ট থাকে। আমাদের প্রজেক্টে ব্যবহার হচ্ছে না।', color: 'bg-gray-400' },
        { name: 'COM (Common)', position: 'মাঝখান', useFor: '⚡ AC Live/Phase', description: 'মেইন সুইচ থেকে আসা AC লাইভ (ফেজ) তার এখানে লাগান।', color: 'bg-red-500' },
        { name: 'NO (Normally Open)', position: 'ডান', useFor: '💡 লোড (ফ্যান/লাইট)', description: 'ফ্যান বা লাইটের এক তার এখানে লাগান। রিলে ON হলে কানেক্ট হয়।', color: 'bg-green-500' },
      ],
      wiringSteps: [
        { step: 1, title: 'COM টার্মিনাল', instruction: 'মেইন সুইচ থেকে আসা AC লাইভ (ফেজ) তার → COM (মাঝের পোর্ট)', wire: 'লাল/বাদামী তার' },
        { step: 2, title: 'NO টার্মিনাল', instruction: 'ফ্যান/লাইটের এক তার → NO (ডান পোর্ট)', wire: 'কালো তার' },
        { step: 3, title: 'Neutral সরাসরি', instruction: 'AC নিউট্রাল তার সরাসরি ফ্যান/লাইটে → রিলের মধ্য দিয়ে যাবে না', wire: 'নীল তার' },
        { step: 4, title: 'NC খালি', instruction: 'NC (বাম পোর্ট) খালি রাখুন - কিছু লাগাবেন না', wire: 'কোনো তার নয়' },
      ],
      safetyWarnings: [
        '⚡ সতর্কতা: AC ২২০V নিয়ে কাজ করার আগে অবশ্যই মেইন সুইচ বন্ধ করুন!',
        '🔌 ভুল কানেকশনে শর্ট সার্কিট বা আগুন লাগতে পারে!',
        '👷 অভিজ্ঞ ইলেকট্রিশিয়ান দিয়ে AC ওয়্যারিং করান।',
        '📋 কাজ শেষে সব সংযোগ ডাবল-চেক করুন।',
      ],
    },
  },
  {
    id: 'mcb-contactor',
    name: '⚡ MCB ও কন্ট্যাক্টর ওয়্যারিং (সুইচিং ও প্রোটেকশন)',
    nameEn: 'MCB & Contactor Wiring (Switching & Protection)',
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    pins: [],
    extraNote: '⚡ এই সেকশনে MCB (সার্কিট ব্রেকার) এবং ম্যাগনেটিক কন্ট্যাক্টর কিভাবে লেয়ার ও ব্রয়লার ফার্মে আলাদাভাবে ওয়্যার করতে হবে তা বিস্তারিত দেওয়া হয়েছে।',
    resistorNote: null,
    tips: [],
    hasMcbContactorWiring: true,
    mcbContactorInfo: {
      title: '⚡ MCB ও কন্ট্যাক্টর — লেয়ার ও ব্রয়লার ফার্ম',
      description: 'শর্ট-সার্কিট ও ওভারলোড থেকে খামার রক্ষা করতে MCB এবং হাই-কারেন্ট লোড নিয়ন্ত্রণে কন্ট্যাক্টর ব্যবহার করা হয়।',
      commonParts: [
        { name: 'MCB মেইন 2P 32A C', purpose: 'পুরো সিস্টেমের মেইন সুইচ ও শর্ট-সার্কিট প্রটেকশন' },
        { name: 'সাব MCB 1P 6A', purpose: 'প্রতিটি রিলে আউটপুট লাইনে আলাদা সুরক্ষা — একটি ডিভাইসে শর্ট হলে শুধু সেই লাইনের MCB ট্রিপ করে' },
        { name: 'কন্ট্যাক্টর CJX2-1210 (220VAC)', purpose: 'বুস্টার পাম্পের মতো হাই-কারেন্ট লোড নিয়ন্ত্রণ — রিলে শুধু কন্ট্যাক্টরের কয়েল সুইচ করে, কন্ট্যাক্টর আসল লোড বহন করে' },
      ],
      layerWiring: {
        title: '🥚 লেয়ার ফার্ম ওয়্যারিং (৮-চ্যানেল)',
        diagram: 'মেইন AC ──► MCB 2P 32A ──┬──► Sub MCB 6A ──► Relay IN1 NO ──► এক্সহস্ট ফ্যান\n                          ├──► Sub MCB 6A ──► Relay IN2 NO ──► সিলিং ফ্যান\n                          ├──► Sub MCB 6A ──► Relay IN3 NO ──► লাইট\n                          ├──► Sub MCB 6A ──► Relay IN4 NO ──► (খালি/ঐচ্ছিক)\n                          ├──► Sub MCB 6A ──► Relay IN5 NO ──► ফগার সোলেনয়েড (DC)\n                          ├──► Sub MCB 6A ──► Relay IN6 NO ──► অ্যালার্ম বাজার (DC)\n                          ├──► Sub MCB 6A ──► Relay IN7 NO ──► স্প্রিংকলার সোলেনয়েড (DC)\n                          └──► Sub MCB 6A ──► Relay IN8 NO ──► সার্কুলেশন ফ্যান',
        relays: [
          { ch: 'IN1 (GPIO 25)', device: '🌀 এক্সহস্ট ফ্যান', mcb: 'Sub MCB 6A', contactor: false, note: 'HSI/তাপমাত্রা/অ্যামোনিয়া ভিত্তিক' },
          { ch: 'IN2 (GPIO 26)', device: '🌀 সিলিং ফ্যান', mcb: 'Sub MCB 6A', contactor: false, note: '≥25°সে তে চালু' },
          { ch: 'IN3 (GPIO 27)', device: '💡 লাইট (LED/CFL)', mcb: 'Sub MCB 6A', contactor: false, note: '১৬ ঘণ্টা শিডিউল, ডিম উৎপাদনের জন্য' },
          { ch: 'IN4 (GPIO 14)', device: '(ঐচ্ছিক)', mcb: 'Sub MCB 6A', contactor: false, note: 'লেয়ারে হিটার সাধারণত প্রয়োজন হয় না' },
          { ch: 'IN5 (GPIO 12)', device: '💦 ফগার সোলেনয়েড', mcb: 'Sub MCB 6A', contactor: false, note: 'DC 12V সোলেনয়েড ভালভ' },
          { ch: 'IN6 (GPIO 13)', device: '🔔 অ্যালার্ম বাজার', mcb: 'Sub MCB 6A', contactor: false, note: 'SFM-27 পিজো বাজার' },
          { ch: 'IN7 (GPIO 15)', device: '🚿 স্প্রিংকলার', mcb: 'Sub MCB 6A', contactor: false, note: 'HSI ≥80 তে রুফ স্প্রিংকলার' },
          { ch: 'IN8 (GPIO 33)', device: '💨 সার্কুলেশন ফ্যান', mcb: 'Sub MCB 6A', contactor: false, note: 'বায়ু সঞ্চালন' },
        ],
        contactorWiring: [
          { step: 1, instruction: 'AC লাইভ → রিলে COM (মাঝের পোর্ট)', color: 'red' },
          { step: 2, instruction: 'রিলে NO → লোড (ফ্যান/লাইট)', color: 'orange' },
          { step: 3, instruction: 'লোডের অন্য তার → AC Neutral', color: 'black' },
        ],
        totalContactor: 0,
        contactorNote: 'লেয়ার ফার্মে DC সোলেনয়েড ভালভ ব্যবহারে কন্ট্যাক্টর লাগে না। বড় ফ্যান (>1HP) থাকলে সেটির জন্য আলাদা কন্ট্যাক্টর লাগবে।',
      },
      broilerWiring: {
        title: '🐔 ব্রয়লার ফার্ম ওয়্যারিং (৮-চ্যানেল)',
        diagram: 'মেইন AC ──► MCB 2P 32A ──┬──► Sub MCB 6A ──► Relay IN1 NO ──► এক্সহস্ট ফ্যান\n                          ├──► Sub MCB 6A ──► Relay IN2 NO ──► সিলিং ফ্যান\n                          ├──► Sub MCB 6A ──► Relay IN3 NO ──► লাইট\n                          ├──► Sub MCB 6A ──► Relay IN4 NO ──► হিটার (ব্রুডিং)\n                          ├──► Sub MCB 6A ──► Relay IN5 NO ──► ফগার সোলেনয়েড (DC)\n                          ├──► Sub MCB 6A ──► Relay IN6 NO ──► অ্যালার্ম বাজার (DC)\n                          ├──► Sub MCB 6A ──► Relay IN7 NO ──► স্প্রিংকলার সোলেনয়েড (DC)\n                          └──► Sub MCB 6A ──► Relay IN8 NO ──► সার্কুলেশন ফ্যান',
        relays: [
          { ch: 'IN1 (GPIO 25)', device: '🌀 এক্সহস্ট ফ্যান', mcb: 'Sub MCB 6A', contactor: false, note: 'বড় ইন্ডাস্ট্রিয়াল ফ্যান হলে (>1HP) কন্ট্যাক্টর লাগবে' },
          { ch: 'IN2 (GPIO 26)', device: '🌀 সিলিং ফ্যান', mcb: 'Sub MCB 6A', contactor: false, note: '≥25°সে তে চালু' },
          { ch: 'IN3 (GPIO 27)', device: '💡 লাইট', mcb: 'Sub MCB 6A', contactor: false, note: 'লাইটিং কার্ভ অনুযায়ী' },
          { ch: 'IN4 (GPIO 14)', device: '🔥 হিটার (ব্রুডিং)', mcb: 'Sub MCB 6A', contactor: false, note: 'হিটার >1000W হলে কন্ট্যাক্টর বিবেচনা করুন' },
          { ch: 'IN5 (GPIO 12)', device: '💦 ফগার সোলেনয়েড', mcb: 'Sub MCB 6A', contactor: false, note: 'DC 12V সোলেনয়েড ভালভ' },
          { ch: 'IN6 (GPIO 13)', device: '🔔 অ্যালার্ম বাজার', mcb: 'Sub MCB 6A', contactor: false, note: 'SFM-27 পিজো বাজার' },
          { ch: 'IN7 (GPIO 15)', device: '🚿 স্প্রিংকলার', mcb: 'Sub MCB 6A', contactor: false, note: 'HSI ≥80 তে রুফ স্প্রিংকলার' },
          { ch: 'IN8 (GPIO 33)', device: '💨 সার্কুলেশন ফ্যান', mcb: 'Sub MCB 6A', contactor: false, note: 'বয়স ১০+ দিন থেকে সক্রিয়' },
        ],
        contactorWiring: [
          { step: 1, instruction: 'AC লাইভ → রিলে COM (মাঝের পোর্ট)', color: 'red' },
          { step: 2, instruction: 'রিলে NO → লোড (ফ্যান/হিটার)', color: 'orange' },
          { step: 3, instruction: 'লোডের অন্য তার → AC Neutral', color: 'black' },
        ],
        totalContactor: '0-2',
        contactorNote: 'DC সোলেনয়েড ভালভে কন্ট্যাক্টর লাগে না। বড় ইন্ডাস্ট্রিয়াল এক্সহস্ট ফ্যান (>1HP / >5A) বা হাই-ওয়াটেজ হিটার (>1000W) থাকলে সেগুলোর জন্য আলাদা কন্ট্যাক্টর লাগবে — সর্বোচ্চ ১-২টি।',
      },
      contactorDetailGuide: {
        title: '🧲 ম্যাগনেটিক কন্ট্যাক্টর — বিস্তারিত ইনস্টলেশন গাইড',
        whatIs: {
          title: '🤔 কন্ট্যাক্টর কী এবং কেন লাগে?',
          points: [
            'কন্ট্যাক্টর হলো একটি ভারী-ক্ষমতার সুইচ যা ছোট কারেন্ট দিয়ে (রিলে থেকে) বড় লোড (ফ্যান/হিটার/পাম্প) চালু-বন্ধ করে।',
            'রিলে সরাসরি ১০ অ্যাম্পিয়ারের বেশি কারেন্ট সামলাতে পারে না — এতে রিলে পুড়ে যেতে পারে।',
            'কন্ট্যাক্টর মাঝখানে বসিয়ে রিলে শুধু কন্ট্যাক্টরের কয়েল (কম কারেন্ট) সুইচ করে, আর কন্ট্যাক্টর আসল ভারী লোড বহন করে।',
          ],
        },
        whenNeeded: {
          title: '📋 কখন কন্ট্যাক্টর লাগবে?',
          needed: [
            { device: 'ইন্ডাস্ট্রিয়াল এক্সহস্ট ফ্যান', condition: '১ HP (৭৫০W) বা তার বেশি', reason: 'স্টার্টিং কারেন্ট ১৫-২৫A হয়, রিলে ১০A সামলায়' },
            { device: '১০+ সিলিং ফ্যান একসাথে', condition: 'মোট লোড ৫A-এর বেশি', reason: 'অনেক ফ্যান একসাথে চালু হলে কারেন্ট বেশি হয়' },
            { device: 'ব্রুডিং হিটার', condition: '১০০০W বা তার বেশি', reason: 'হিটার হাই কারেন্ট টানে, রিলে পোড়ার ঝুঁকি' },
            { device: 'এসি বুস্টার পাম্প', condition: '০.৫ HP বা তার বেশি', reason: 'মোটর স্টার্টিং কারেন্ট ৩-৫ গুণ বেশি হয়' },
          ],
          notNeeded: [
            'DC 12V সোলেনয়েড ভালভ (ফগার/স্প্রিংকলার) — কারেন্ট মাত্র ০.৫-১A',
            'LED/CFL লাইট — কারেন্ট ১-২A',
            'পিজো বাজার — কারেন্ট ০.১A',
            'DC 12V ডায়াফ্রাম পাম্প — সরাসরি রিলে দিয়ে চলে',
            '১-৩টি সিলিং ফ্যান — মোট কারেন্ট কম',
          ],
        },
        partsIdentification: {
          title: '🔍 কন্ট্যাক্টরের অংশ চেনা (CJX2-1210 মডেল)',
          parts: [
            { name: 'A1 টার্মিনাল', location: 'উপরের বাম/ডানে', purpose: 'কয়েল পজিটিভ (+) — এখানে রিলে থেকে AC Live আসবে', color: '🔴' },
            { name: 'A2 টার্মিনাল', location: 'A1 এর পাশে', purpose: 'কয়েল নেগেটিভ (−) — এখানে সরাসরি AC Neutral যাবে', color: '⚫' },
            { name: 'L1 (1) টার্মিনাল', location: 'উপরের সারি', purpose: 'পাওয়ার ইনপুট — মেইন AC Live এখানে আসবে', color: '🔴' },
            { name: 'T1 (2) টার্মিনাল', location: 'নিচের সারি', purpose: 'পাওয়ার আউটপুট — এখান থেকে লোডে (ফ্যান/হিটার) যাবে', color: '🟠' },
            { name: 'L2, L3 (3,5)', location: 'উপরের সারি', purpose: 'অতিরিক্ত ফেজ (3-ফেজ মোটরের জন্য) — সিঙ্গেল ফেজে ব্যবহার হয় না', color: '⬜' },
            { name: 'T2, T3 (4,6)', location: 'নিচের সারি', purpose: 'অতিরিক্ত আউটপুট — সিঙ্গেল ফেজে ব্যবহার হয় না', color: '⬜' },
          ],
        },
        wiringSteps: {
          title: '🔧 ধাপে ধাপে কন্ট্যাক্টর কানেকশন (সিঙ্গেল ফেজ)',
          warning: '⚡ গুরুত্বপূর্ণ: সব কাজ শুরুর আগে মেইন সুইচ/MCB বন্ধ করুন! ভোল্টেজ টেস্টার দিয়ে নিশ্চিত হোন কারেন্ট নেই।',
          steps: [
            {
              step: 1,
              title: '🧲 কন্ট্যাক্টরের কয়েল কানেকশন (রিলে → কন্ট্যাক্টর)',
              description: 'রিলে শুধু কন্ট্যাক্টরের কয়েলকে ON/OFF করবে।',
              wires: [
                { from: 'Sub MCB আউটপুট (AC Live)', to: 'রিলে COM (মাঝের পোর্ট)', wire: '🔴 লাল তার', note: 'MCB থেকে আসা লাইভ তার রিলে-এর COM পোর্টে ঢোকান' },
                { from: 'রিলে NO পোর্ট', to: 'কন্ট্যাক্টর A1', wire: '🟠 কমলা তার', note: 'রিলে ON হলে এই তার দিয়ে কয়েলে কারেন্ট যায়' },
                { from: 'AC Neutral', to: 'কন্ট্যাক্টর A2', wire: '⚫ কালো তার', note: 'সরাসরি নিউট্রাল লাইন থেকে A2 তে যোগ করুন' },
              ],
              result: '✅ রিলে ON → কয়েলে কারেন্ট → কন্ট্যাক্টর "ক্লিক" শব্দে চালু হবে',
            },
            {
              step: 2,
              title: '⚡ কন্ট্যাক্টরের পাওয়ার কানেকশন (কন্ট্যাক্টর → লোড)',
              description: 'কন্ট্যাক্টর চালু হলে আসল পাওয়ার লোডে পৌঁছাবে।',
              wires: [
                { from: 'মেইন MCB আউটপুট (AC Live)', to: 'কন্ট্যাক্টর L1 (1)', wire: '🔴 মোটা লাল তার (≥2.5mm²)', note: 'হাই কারেন্ট বহন করবে — মোটা তার ব্যবহার করুন' },
                { from: 'কন্ট্যাক্টর T1 (2)', to: 'ফ্যান/হিটার/পাম্পের Live তার', wire: '🟠 মোটা কমলা তার', note: 'কন্ট্যাক্টর ON হলে এখান দিয়ে পাওয়ার লোডে যায়' },
                { from: 'ফ্যান/হিটার/পাম্পের Neutral তার', to: 'AC Neutral বাস', wire: '⚫ মোটা কালো তার', note: 'লোডের রিটার্ন পাথ — সরাসরি নিউট্রালে' },
              ],
              result: '✅ কন্ট্যাক্টর ON → L1 থেকে T1 দিয়ে পাওয়ার → ফ্যান/হিটার চালু',
            },
            {
              step: 3,
              title: '🛡️ সুরক্ষা কানেকশন (MCB ও আর্থিং)',
              description: 'শর্ট-সার্কিট এবং বৈদ্যুতিক শক থেকে রক্ষা।',
              wires: [
                { from: 'ফ্যান/হিটারের বডি', to: 'আর্থ বাস', wire: '🟢 সবুজ/হলুদ তার', note: 'অবশ্যই আর্থ কানেকশন দিন — নিরাপত্তার জন্য বাধ্যতামূলক' },
                { from: 'Sub MCB', to: 'রিলে COM', wire: '', note: 'প্রতিটি রিলে লাইনে আলাদা Sub MCB রাখুন' },
              ],
              result: '✅ শর্ট-সার্কিট হলে MCB ট্রিপ করবে, শক হলে আর্থ ট্রিপ করবে',
            },
          ],
        },
        fullDiagram: {
          title: '📐 সম্পূর্ণ ওয়্যারিং ডায়াগ্রাম (কন্ট্যাক্টরসহ)',
          diagram: `মেইন AC 220V
    │
    ▼
┌─────────────┐
│ MCB 2P 32A  │ ← মেইন ব্রেকার
└──┬──────┬───┘
   │      │
   │   ┌──▼──────────┐
   │   │ Sub MCB 6A  │ ← রিলে লাইনের সুরক্ষা
   │   └──┬──────────┘
   │      │
   │   ┌──▼──────────────────┐
   │   │ রিলে (IN1/IN4)     │
   │   │ COM ← AC Live       │
   │   │ NO  → কন্ট্যাক্টর  │
   │   └──┬──────────────────┘
   │      │ (কম কারেন্ট)
   │   ┌──▼──────────────────┐
   │   │ কন্ট্যাক্টর        │
   │   │ A1 ← রিলে NO       │
   │   │ A2 ← Neutral        │
   │   │                     │
   │   │ L1 ← MCB Live ──────┤← মোটা তার (≥2.5mm²)
   │   │ T1 → ফ্যান/হিটার   │
   │   └──┬──────────────────┘
   │      │ (হাই কারেন্ট)
   │   ┌──▼──────────┐
   │   │ 🌀 ফ্যান    │
   │   │ বা 🔥 হিটার │
   │   └──┬──────────┘
   │      │
   ▼      ▼
  Neutral বাস`,
        },
        commonMistakes: {
          title: '❌ সাধারণ ভুল ও সমাধান',
          mistakes: [
            { mistake: 'রিলে দিয়ে সরাসরি বড় ফ্যান চালানো', problem: 'রিলে পুড়ে যাবে, আগুন লাগতে পারে', solution: 'কন্ট্যাক্টর ব্যবহার করুন — রিলে শুধু কয়েল সুইচ করবে' },
            { mistake: 'A1-A2 তে DC দেওয়া (220VAC কয়েলে)', problem: 'কন্ট্যাক্টর কাজ করবে না', solution: 'CJX2-1210 এর কয়েল 220VAC — অবশ্যই AC দিন' },
            { mistake: 'চিকন তার দিয়ে L1-T1 লাইন দেওয়া', problem: 'তার গরম হবে, আগুনের ঝুঁকি', solution: 'L1-T1 লাইনে ≥2.5mm² (14 AWG) মোটা তার ব্যবহার করুন' },
            { mistake: 'আর্থ কানেকশন না দেওয়া', problem: 'বৈদ্যুতিক শকের ঝুঁকি', solution: 'ফ্যান/হিটারের বডিতে অবশ্যই আর্থ তার লাগান' },
            { mistake: 'কন্ট্যাক্টর DIN রেইলে না লাগানো', problem: 'ধুলো-পানিতে ক্ষতি হয়', solution: 'DIN রেইলে মাউন্ট করুন, IP65 বক্সের ভিতরে রাখুন' },
            { mistake: 'MCB ছাড়া সরাসরি কানেকশন', problem: 'শর্ট-সার্কিটে আগুন লাগবে', solution: 'প্রতিটি লাইনে Sub MCB রাখুন' },
          ],
        },
        testingSteps: {
          title: '🧪 কানেকশন টেস্ট করার ধাপ',
          steps: [
            { step: 1, action: 'মাল্টিমিটার দিয়ে A1-A2 এর মধ্যে রেজিস্ট্যান্স চেক করুন — ১০০-৫০০ ওহম আসা উচিত (কয়েল ঠিক আছে)' },
            { step: 2, action: 'L1-T1 এর মধ্যে কন্টিনিউটি চেক করুন — কন্ট্যাক্টর OFF থাকলে OL (ওপেন) দেখাবে' },
            { step: 3, action: 'MCB ON করুন — কোনো স্পার্ক বা গন্ধ নেই তো দেখুন' },
            { step: 4, action: 'অ্যাপ থেকে রিলে ON করুন — কন্ট্যাক্টর "ক্লিক" শব্দ করে চালু হবে' },
            { step: 5, action: 'L1-T1 এ ভোল্টেজ চেক করুন — কন্ট্যাক্টর ON থাকলে ~220V আসবে' },
            { step: 6, action: 'রিলে OFF করুন — কন্ট্যাক্টর বন্ধ হবে, ফ্যান/হিটারও বন্ধ হবে' },
          ],
        },
      },
      safetyWarnings: [
        '⚡ MCB এবং কন্ট্যাক্টর ইনস্টল করার আগে মেইন সুইচ বন্ধ করুন!',
        '👷 AC 220V ওয়্যারিং অবশ্যই অভিজ্ঞ ইলেকট্রিশিয়ান দিয়ে করান!',
        '🔧 MCB ও কন্ট্যাক্টর DIN রেইলে মাউন্ট করুন — খামার পরিবেশে নিরাপদ',
        '🧪 সব সংযোগ শেষে মাল্টিমিটার দিয়ে ভোল্টেজ ও কন্টিনিউটি চেক করুন',
        '🔌 প্রতিটি সাব MCB-র রেটিং ডিভাইসের কারেন্টের চেয়ে সামান্য বেশি হতে হবে',
        '🔥 L1-T1 পাওয়ার লাইনে অবশ্যই ≥2.5mm² মোটা তার ব্যবহার করুন',
        '🟢 ফ্যান/হিটারের বডিতে অবশ্যই আর্থ কানেকশন দিন',
      ],
    },
  },
  {
    id: 'fogger',
    name: '💦 ফগার কুলিং সিস্টেম (DC 12V সোলেনয়েড ভালভ)',
    nameEn: 'Fogger Cooling System (DC 12V Solenoid Valve)',
    icon: Droplets,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    pins: [
      { sensorPin: '12V DC (+)', esp32Pin: 'Relay IN5 COM', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 12V DC অ্যাডাপ্টারের + → রিলে IN5 এর COM (মাঝের পোর্ট)', warning: null },
      { sensorPin: 'সোলেনয়েড (+)', esp32Pin: 'Relay IN5 NO', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 DC সোলেনয়েড ভালভের + তার → রিলে IN5 এর NO (Normally Open) পোর্ট', warning: null },
      { sensorPin: 'সোলেনয়েড (-)', esp32Pin: '12V DC GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ DC সোলেনয়েড ভালভের - তার → 12V অ্যাডাপ্টারের GND', warning: null },
    ],
    extraNote: '💦 ফগার কুলিং সিস্টেম নিরাপদ ক্রমিক নিয়ন্ত্রণ (Staged Control) ব্যবহার করে:\n\n🔋 এই সিস্টেমে DC 12V Normally Closed Brass সোলেনয়েড ভালভ ব্যবহৃত হয়। DC ভালভ ব্যবহারের সুবিধা:\n✅ নিরাপদ — লো ভোল্টেজ (12V), শক হওয়ার ঝুঁকি নেই\n✅ সস্তা — AC ভালভের চেয়ে দাম কম\n✅ কন্ট্যাক্টর লাগে না — রিলে সরাসরি কন্ট্রোল করে\n✅ সহজ ওয়্যারিং — শুধু 12V অ্যাডাপ্টার লাগে\n\n🟢 চালু করার ক্রম (PREPARE → RUNNING):\n① সোলেনয়েড ভালভ খোলে (রিলে ON) → ② ২ সেকেন্ড অপেক্ষা → ③ পাম্প চালু (থাকলে)\n\n🔴 বন্ধ করার ক্রম (STOPPING → OFF):\n① পাম্প বন্ধ → ② ২ সেকেন্ড অপেক্ষা → ③ ভালভ বন্ধ (রিলে OFF)\n\n🛡️ ফেইলসেফ: ভালভ বন্ধ না হলে ৩ বার চেষ্টা → অ্যালার্ম।\n\nতাপমাত্রা ≥ ৩২°সে এবং আর্দ্রতা < ৮৫% হলে চালু হয়। বন্ধ হয়: তাপমাত্রা < ৩০°সে অথবা আর্দ্রতা ≥ ৯০%।\n\n💡 ট্যাঙ্ক উঁচুতে (৩-৫ মিটার) থাকলে গ্র্যাভিটি ফ্লো-তে পানি আসবে — বুস্টার পাম্প লাগবে না!',
    resistorNote: '📍 Relay IN5 ইতিমধ্যে GPIO 12-এ কানেক্ট করা আছে। ভালভের জন্য আলাদা 12V DC অ্যাডাপ্টার বা সিস্টেমের 12V লাইন ব্যবহার করুন।',
    tips: [
      '✅ DC 12V Normally Closed (NC) Brass সোলেনয়েড ভালভ ব্যবহার করুন — বিদ্যুৎ না থাকলে পানি বন্ধ থাকে',
      '🔋 DC ভালভ সরাসরি রিলে IN5 দিয়ে 12V DC কন্ট্রোল হয় — নিরাপদ ও সহজ',
      '💧 ট্যাঙ্ক উঁচুতে থাকলে (৩-৫ মিটার) বুস্টার পাম্প লাগবে না — গ্র্যাভিটি ফ্লো যথেষ্ট',
      '⚙️ পাম্প দরকার হলে সেটি আলাদা কন্ট্যাক্টর/রিলে দিয়ে কন্ট্রোল করুন',
      '🌡️ ফগার চলাকালে এক্সজস্ট ফ্যান স্বয়ংক্রিয় চালু থাকে',
      '🔒 সিস্টেম রিসেট হলে সবকিছু SAFE OFF অবস্থায় পুনরায় শুরু হয়',
      '⚡ সিস্টেমের 12V অ্যাডাপ্টার থেকেই ভালভ চালাতে পারেন (কারেন্ট ~0.5-1A)',
    ],
    hasFoggerDiagram: true,
    foggerWiringInfo: {
      title: '💦 ফগার DC সোলেনয়েড ওয়্যারিং ডায়াগ্রাম',
      titleEn: 'Fogger DC Solenoid Wiring Diagram',
      systemOverview: {
        title: 'সিস্টেম পরিচিতি',
        points: [
          '💦 ফগার = কুয়াশা তৈরি করে তাপমাত্রা কমায়',
          '🔌 DC 12V সোলেনয়েড ভালভ = বিদ্যুৎ দিয়ে চালু/বন্ধ হওয়া পানির ট্যাপ (12V DC, Brass, NC)',
          '✅ DC ভালভের সুবিধা: নিরাপদ (লো ভোল্টেজ), সস্তা, কন্ট্যাক্টর লাগে না, সহজ ওয়্যারিং',
          '💧 ট্যাঙ্ক উঁচুতে থাকলে (৩-৫ মিটার) বুস্টার পাম্প লাগবে না — গ্র্যাভিটি ফ্লো যথেষ্ট',
          '🔄 রিলে ON হলে ভালভ খোলে → পানি আসে → নজলে কুয়াশা স্প্রে হয়'
        ]
      },
      automationLogic: {
        title: 'অটোমেশন লজিক (নিরাপদ ক্রমিক নিয়ন্ত্রণ)',
        startCondition: 'তাপমাত্রা ≥ ৩২°সে এবং আর্দ্রতা < ৮৫%',
        cycle: '🟢 চালু: সোলেনয়েড ভালভ খোলে (রিলে ON) → ২সে অপেক্ষা → পাম্প চালু (থাকলে) → স্প্রে চক্র\n🔴 বন্ধ: পাম্প বন্ধ → ২সে অপেক্ষা → ভালভ বন্ধ (রিলে OFF)',
        stopCondition: 'তাপমাত্রা < ৩০°সে অথবা আর্দ্রতা ≥ ৯০%',
        safetyNote: 'ফগার চলাকালে এক্সজস্ট ফ্যান বাধ্যতামূলক চালু থাকে।\n\n🛡️ কুলিং স্টেট: OFF → PREPARE (ভালভ খোলে) → RUNNING (স্প্রে চালু) → STOPPING (ভালভ বন্ধের অপেক্ষা) → OFF\n\n⚠️ ফেইলসেফ: ভালভ আটকে গেলে → ৩ বার রিট্রাই → অ্যালার্ম'
      },
      connectionSteps: [
        { step: 1, title: 'রিলে ইনপুট (ইতিমধ্যে সম্পন্ন)', desc: 'ESP32 GPIO 12 → রিলে IN5 পিন', color: 'purple' },
        { step: 2, title: '12V DC → রিলে COM', desc: '12V DC অ্যাডাপ্টারের + (পজিটিভ) → রিলে IN5 এর COM (মাঝের পোর্ট)', color: 'red' },
        { step: 3, title: 'রিলে NO → সোলেনয়েড (+)', desc: 'রিলে IN5 এর NO (ডান পোর্ট) → DC সোলেনয়েড ভালভের + তার', color: 'blue' },
        { step: 4, title: 'সোলেনয়েড (-) → GND', desc: 'DC সোলেনয়েড ভালভের - তার → 12V অ্যাডাপ্টারের GND', color: 'black' },
        { step: 5, title: 'বুস্টার পাম্প (ঐচ্ছিক)', desc: 'ট্যাঙ্ক উঁচুতে না থাকলে AC বুস্টার পাম্প আলাদা কন্ট্যাক্টর/রিলে দিয়ে কানেক্ট করুন', color: 'teal' }
      ],
      partsNeeded: [
        { name: 'DC 12V সোলেনয়েড ভালভ', spec: '1/2" Brass বডি, Normally Closed (NC), ~0.5-1A', price: '৳২৫০-৫০০' },
        { name: '12V DC অ্যাডাপ্টার', spec: 'সিস্টেমের 12V লাইন থেকে বা আলাদা অ্যাডাপ্টার', price: '৳০ (সিস্টেমের লাইন) / ৳২৫০-৪০০ (আলাদা)' },
        { name: 'ফগার নজল', spec: '১০-২০ পিস (শেড সাইজ অনুযায়ী)', price: '৳৩০০-৫০০' },
        { name: 'পিই পাইপ', spec: '4mm বা 6mm, ২০ মিটার', price: '৳২০০-৩০০' },
        { name: 'T-কানেক্টর', spec: 'নজল সংযোগের জন্য', price: '৳১০০-২০০' },
        { name: 'বুস্টার পাম্প (ঐচ্ছিক)', spec: 'ট্যাঙ্ক উঁচুতে না থাকলে — AC 220V পাম্প, আলাদা কন্ট্যাক্টর দিয়ে', price: '৳২০০০-৪০০০' }
      ],
      safetyWarnings: [
        '🔋 DC 12V — নিরাপদ লো ভোল্টেজ, তবে শর্ট-সার্কিট থেকে সাবধান',
        '💧 পানি ও বিদ্যুৎ একসাথে বিপদজনক — সংযোগস্থল শুকনো রাখুন',
        '➡️ ভালভের তীর চিহ্ন (→) পানির প্রবাহের দিকে রাখুন',
        '⚡ সোলেনয়েড ভালভের পোলারিটি (+ / -) সঠিকভাবে মিলান',
        '🔌 বুস্টার পাম্প ব্যবহার করলে সেটির জন্য আলাদা MCB/ফিউজ ব্যবহার করুন'
      ],
      troubleshooting: [
        { problem: 'পানি আসছে না', solutions: ['DC সোলেনয়েড ভালভের তীর চিহ্ন (→) পানির প্রবাহ দিকে আছে কিনা চেক করুন', 'মেইন পানি সাপ্লাই চালু আছে কিনা দেখুন', 'রিলে ক্লিক করছে কিনা শুনুন', '12V পাওয়ার আসছে কিনা মাল্টিমিটার দিয়ে চেক করুন'] },
        { problem: 'পানি বন্ধ হচ্ছে না', solutions: ['সোলেনয়েড ভালভ জ্যাম হয়ে থাকতে পারে — সিস্টেম ৩ বার বন্ধের চেষ্টা করে ব্যর্থ হলে অ্যালার্ম দেয়', 'রিলে COM-NO এর বদলে COM-NC তে লাগানো হয়েছে কিনা চেক করুন'] },
        { problem: 'রিলে ক্লিক হচ্ছে কিন্তু পানি আসছে না', solutions: ['ভালভে 12V DC পাওয়ার আসছে কিনা মাল্টিমিটার দিয়ে চেক করুন', 'পোলারিটি (+ / -) উল্টো লাগানো হয়েছে কিনা দেখুন', 'সোলেনয়েড কয়েল পুড়ে যেতে পারে'] },
        { problem: 'ট্যাঙ্ক উঁচুতে আছে কিন্তু স্প্রে দুর্বল', solutions: ['ট্যাঙ্কের উচ্চতা কমপক্ষে ৩ মিটার হতে হবে', 'নজল ব্লক হয়ে থাকতে পারে — পরিষ্কার করুন', 'পাইপ সংকীর্ণ হলে বড় সাইজের পাইপ ব্যবহার করুন'] }
      ]
    }
  },
  {
    id: 'buzzer',
    name: 'SFM-27 বাজার (অ্যালার্ম সাইরেন)',
    nameEn: 'SFM-27 Buzzer (Alarm Siren)',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    pins: [
      { sensorPin: '+ পিন (লাল তার)', esp32Pin: 'Relay IN6 COM', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: SFM-27 এর + তার → রিলে IN6 এর COM (Common) পোর্টে', warning: 'সরাসরি ESP32 তে লাগাবেন না! রিলে দিয়ে কন্ট্রোল করতে হবে।' },
      { sensorPin: '- পিন (কালো তার)', esp32Pin: 'পাওয়ার সাপ্লাই GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: SFM-27 এর - তার → পাওয়ার সাপ্লাই এর GND (12V/24V সাপ্লাই)', warning: null },
      { sensorPin: 'পাওয়ার সোর্স +', esp32Pin: 'Relay IN6 NO', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 পাওয়ার: 12V/24V সাপ্লাইয়ের + → রিলে IN6 এর NO (Normally Open) পোর্টে', warning: null },
    ],
    extraNote: '⚡ SFM-27 বাজার (DC 3-24V, ~100mA+) সরাসরি ESP32 GPIO তে চালানো যাবে না কারণ এটি বেশি কারেন্ট টানে। তাই রিলে মডিউল (IN6) দিয়ে কন্ট্রোল করতে হবে।',
    resistorNote: '📍 রিলে IN6 → GPIO 13 (ফার্মওয়্যারে সেট করা আছে)',
    tips: ['রিলে ON হলে বাজার বাজবে, OFF হলে বন্ধ হবে', 'জরুরি অবস্থায় (তাপমাত্রা বেশি, পাওয়ার অফ) স্বয়ংক্রিয় অ্যালার্ম বাজবে', 'পৃথক 12V বা 24V পাওয়ার সাপ্লাই ব্যবহার করুন (বাজারের ভোল্টেজ অনুযায়ী)'],
    hasBuzzerDiagram: true, // Special flag for buzzer wiring diagram
    buzzerWiringInfo: {
      title: '🔔 বাজার ওয়্যারিং ডায়াগ্রাম',
      titleEn: 'Buzzer Wiring Diagram',
      whyRelay: {
        title: 'কেন রিলে দিয়ে কন্ট্রোল করতে হবে?',
        points: [
          'SFM-27 বাজার ~100mA কারেন্ট টানে',
          'ESP32 GPIO সর্বোচ্চ 40mA দিতে পারে',
          'সরাসরি কানেক্ট করলে ESP32 পুড়ে যেতে পারে!',
          'রিলে একটি "সুইচ" হিসেবে কাজ করে - নিরাপদে হাই কারেন্ট ডিভাইস চালাতে পারে'
        ]
      },
      components: [
        { name: 'SFM-27 বাজার', spec: 'DC 3-24V, ~100mA' },
        { name: 'পাওয়ার সাপ্লাই', spec: '12V বা 24V DC (বাজারের রেটিং অনুযায়ী)' },
        { name: 'রিলে মডিউল', spec: 'চ্যানেল IN6 (GPIO 13 দ্বারা নিয়ন্ত্রিত)' }
      ],
      connectionSteps: [
        { step: 1, title: 'রিলে IN6 ইনপুট সংযোগ', desc: 'ESP32 GPIO 13 → রিলে IN6 পিন (এটা ইতিমধ্যে রিলে সেকশনে করা হয়েছে)', color: 'purple' },
        { step: 2, title: 'পাওয়ার সোর্স + কানেকশন', desc: '12V/24V পাওয়ার সাপ্লাই এর + (পজিটিভ) → রিলে IN6 এর NO (Normally Open) টার্মিনাল', color: 'red' },
        { step: 3, title: 'বাজার + কানেকশন', desc: 'SFM-27 বাজারের + (লাল তার) → রিলে IN6 এর COM (Common) টার্মিনাল', color: 'red' },
        { step: 4, title: 'GND কানেকশন', desc: 'SFM-27 বাজারের - (কালো তার) → পাওয়ার সাপ্লাই এর - (GND)', color: 'black' }
      ],
      workingLogic: {
        title: 'কিভাবে কাজ করে?',
        offState: {
          title: 'রিলে OFF (GPIO 13 = HIGH)',
          desc: 'NO ও COM আলাদা থাকে → সার্কিট ওপেন → বাজার বন্ধ'
        },
        onState: {
          title: 'রিলে ON (GPIO 13 = LOW)',
          desc: 'NO ও COM সংযুক্ত হয় → সার্কিট সম্পূর্ণ → বাজার বাজে!'
        }
      },
      troubleshooting: [
        { problem: 'বাজার বাজছে না', solutions: ['পাওয়ার সাপ্লাই ভোল্টেজ চেক করুন', 'NO ও COM টার্মিনাল সঠিকভাবে লাগানো হয়েছে কিনা দেখুন', 'GPIO 13 পিন ঠিকমতো কানেক্ট আছে কিনা চেক করুন'] },
        { problem: 'বাজার সবসময় বাজছে', solutions: ['NO এর বদলে NC টার্মিনালে লাগিয়েছেন কিনা চেক করুন', 'রিলে Active LOW - GPIO HIGH মানে রিলে OFF'] },
        { problem: 'বাজার আস্তে বাজছে', solutions: ['পাওয়ার সাপ্লাই ভোল্টেজ কম হতে পারে', 'তারের সংযোগ ঢিলা থাকতে পারে'] }
      ]
    }
  },
  {
    id: 'sprinkler',
    name: '🚿 রুফ স্প্রিংকলার সিস্টেম (DC 12V সোলেনয়েড ভালভ)',
    nameEn: 'Roof Sprinkler System (DC 12V Solenoid Valve)',
    icon: Droplets,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    pins: [
      { sensorPin: '12V DC (+)', esp32Pin: 'Relay IN7 COM', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 12V DC অ্যাডাপ্টারের + → রিলে IN7 এর COM (মাঝের পোর্ট)', warning: null },
      { sensorPin: 'সোলেনয়েড (+)', esp32Pin: 'Relay IN7 NO', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 DC সোলেনয়েড ভালভের + তার → রিলে IN7 এর NO (Normally Open) পোর্ট', warning: null },
      { sensorPin: 'সোলেনয়েড (-)', esp32Pin: '12V DC GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ DC সোলেনয়েড ভালভের - তার → 12V অ্যাডাপ্টারের GND', warning: null },
    ],
    extraNote: '🚿 রুফ স্প্রিংকলার সিস্টেম ছাদে পানি স্প্রে করে তাপমাত্রা কমায়।\n\n🔋 DC 12V Normally Closed (NC) সোলেনয়েড ভালভ (3/4") ব্যবহৃত হয়:\n✅ নিরাপদ — লো ভোল্টেজ (12V)\n✅ রিলে সরাসরি কন্ট্রোল করে — কন্ট্যাক্টর লাগে না\n✅ বিদ্যুৎ না থাকলে পানি বন্ধ থাকে (NC)\n\n🌡️ HSI ≥ 80 হলে স্বয়ংক্রিয় চালু, HSI ≤ 75 হলে বন্ধ।\n⏱️ সাইকেল: 60 সেকেন্ড স্প্রে → 120 সেকেন্ড বিরতি।\n\n💡 ফগার ও স্প্রিংকলার একসাথে চলবে না — সফটওয়্যার নিয়ন্ত্রিত।',
    resistorNote: '📍 Relay IN7 ইতিমধ্যে GPIO 15-এ কানেক্ট করা আছে।',
    tips: [
      '✅ DC 12V Normally Closed (NC) সোলেনয়েড ভালভ (3/4") ব্যবহার করুন',
      '🔋 DC ভালভ সরাসরি রিলে IN7 দিয়ে কন্ট্রোল হয়',
      '🚿 স্প্রিংকলার হেড ছাদে ৩-৫ ফুট দূরত্বে লাগান',
      '💧 ফগারের সাথে একই পাম্প শেয়ার করা যায় (শেয়ারড পাম্প স্ট্র্যাটেজি)',
      '🌡️ HSI ≥ 80 হলে অটো চালু, HSI ≤ 75 হলে অটো বন্ধ',
      '⏱️ 60সে স্প্রে / 120সে বিরতি সাইকেল',
    ],
    hasSprinklerDiagram: true,
    sprinklerWiringInfo: {
      title: '🚿 স্প্রিংকলার DC সোলেনয়েড ওয়্যারিং ডায়াগ্রাম',
      connectionSteps: [
        { step: 1, title: 'রিলে ইনপুট (ইতিমধ্যে সম্পন্ন)', desc: 'ESP32 GPIO 15 → রিলে IN7 পিন', color: 'purple' },
        { step: 2, title: '12V DC → রিলে COM', desc: '12V DC অ্যাডাপ্টারের + (পজিটিভ) → রিলে IN7 এর COM (মাঝের পোর্ট)', color: 'red' },
        { step: 3, title: 'রিলে NO → সোলেনয়েড (+)', desc: 'রিলে IN7 এর NO (ডান পোর্ট) → DC সোলেনয়েড ভালভের + তার', color: 'blue' },
        { step: 4, title: 'সোলেনয়েড (-) → GND', desc: 'DC সোলেনয়েড ভালভের - তার → 12V অ্যাডাপ্টারের GND', color: 'black' },
        { step: 5, title: 'পানির পাইপ', desc: 'সোলেনয়েড ভালভের আউটলেট → PVC পাইপ (1/2") → ছাদে স্প্রিংকলার হেড', color: 'teal' }
      ],
      partsNeeded: [
        { name: 'DC 12V সোলেনয়েড ভালভ', spec: '3/4" NC Brass বডি, ~0.5-1A', price: '৳৩০০-৬০০' },
        { name: 'রুফ স্প্রিংকলার হেড', spec: '360° স্প্রে, ৪-৬ পিস', price: '৳৪০০-৬০০' },
        { name: 'PVC পাইপ', spec: '1/2", ২০ মিটার + ফিটিংস', price: '৳৩০০-৫০০' },
      ],
      troubleshooting: [
        { problem: 'স্প্রিংকলার কাজ করছে না', solutions: ['রিলে IN7 ক্লিক করছে কিনা শুনুন', '12V পাওয়ার আসছে কিনা মাল্টিমিটার দিয়ে চেক করুন', 'সোলেনয়েড ভালভের তীর চিহ্ন (→) পানির দিকে আছে কিনা দেখুন'] },
        { problem: 'পানি কম আসছে', solutions: ['পাইপের সাইজ পর্যাপ্ত কিনা চেক করুন', 'নজল ব্লক হয়ে থাকতে পারে', 'বুস্টার পাম্প লাগাতে পারেন'] },
      ]
    }
  },
  {
    id: 'shared-pump',
    name: '🔄 শেয়ারড পাম্প স্ট্র্যাটেজি (ফগার + স্প্রিংকলার)',
    nameEn: 'Shared Pump Strategy (Fogger + Sprinkler)',
    icon: Droplets,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    pins: [],
    extraNote: `🔄 শেয়ারড পাম্প কী?
━━━━━━━━━━━━━━━━
একটি মাত্র পাম্প দিয়ে ফগার ও স্প্রিংকলার দুটোই চালানো হয়।
পাম্পের পর একটি T-জয়েন্ট দিয়ে পানির লাইন দুই ভাগ হয়।
প্রতিটি ভাগে একটি করে DC সোলেনয়েড ভালভ থাকে — যেটা খুলবে সেদিকে পানি যাবে।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 কী কী কিনতে হবে?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• DC 12V সোলেনয়েড ভালভ ½" — ২টি (৳200-300/টি)
• T-জয়েন্ট ½" — ১টি (৳30-50)
• DC 12V ডায়াফ্রাম পাম্প 100PSI — ১টি (৳800-1500)
  অথবা ট্যাঙ্ক উঁচুতে থাকলে পাম্প লাগবে না!
• ½" পাইপ ও ফিটিংস (৳200-500)
• 1N4007 ডায়োড — ২টি (ভালভ রক্ষার জন্য, বাধ্যতামূলক!)

মোট খরচ: ৳1,500 - ৳2,500

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 ধাপে ধাপে রিলে কানেকশন
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ধাপ ১: ফগার ভালভ কানেকশন (রিলে IN5)
──────────────────────────────────────
রিলে বোর্ডে IN5 লেখা পোর্ট খুঁজুন।
সেখানে ৩টি স্ক্রু টার্মিনাল আছে: COM, NO, NC

  ✅ COM স্ক্রু → 12V অ্যাডাপ্টারের (+) তার লাগান
  ✅ NO স্ক্রু  → ভালভের লাল (+) তার লাগান
  ✅ ভালভের কালো (-) তার → 12V অ্যাডাপ্টারের (-) তে লাগান

সহজ কথায়:
  12V (+) ──→ COM ──→ NO ──→ ভালভ (+)
  ভালভ (-) ──→ 12V (-)

💡 NC তে কিছু লাগাবেন না!


ধাপ ২: স্প্রিংকলার ভালভ কানেকশন (রিলে IN7)
──────────────────────────────────────────────
একইভাবে IN7 পোর্টে দ্বিতীয় ভালভ লাগান:

  ✅ COM স্ক্রু → 12V অ্যাডাপ্টারের (+) তার লাগান
  ✅ NO স্ক্রু  → ভালভের লাল (+) তার লাগান
  ✅ ভালভের কালো (-) তার → 12V অ্যাডাপ্টারের (-) তে লাগান

📝 দুটি ভালভের 12V (+) একই অ্যাডাপ্টার থেকে নেওয়া যায়।


ধাপ ৩: ডায়োড লাগানো (বাধ্যতামূলক!)
────────────────────────────────────
প্রতিটি ভালভের (+) ও (-) তারের মাঝে একটি 1N4007 ডায়োড
উল্টো করে (সিলভার ব্যান্ড + দিকে) লাগান।

  ভালভ (+) ←──┤▌──── ভালভ (-)
               ↑ সিলভার ব্যান্ড এদিকে

❓ কেন? রিলে বন্ধ হলে ভালভ থেকে বিপরীত কারেন্ট আসে
   যা রিলে নষ্ট করতে পারে। ডায়োড সেটা শোষণ করে।


ধাপ ৪: পাম্প কানেকশন
────────────────────────

🅰️ ট্যাঙ্ক উঁচুতে (৩-৫ মিটার) থাকলে:
   ✅ পাম্প লাগবে না! গ্র্যাভিটি ফ্লো-তে পানি আসবে।
   শুধু ট্যাঙ্ক → পাইপ → T-জয়েন্ট → ভালভ লাগান।

🅱️ ট্যাঙ্ক নিচে থাকলে DC ডায়াফ্রাম পাম্প লাগান:
   ⚠️ অবশ্যই "প্রেসার সুইচ যুক্ত" ডায়াফ্রাম পাম্প কিনুন!
   এই পাম্প 12V সরাসরি কানেক্ট থাকে (সবসময় পাওয়ার পায়)।
   কিন্তু বিল্ট-ইন প্রেসার সুইচ থাকায়:
     → ভালভ বন্ধ থাকলে চাপ বাড়ে → পাম্প নিজেই বন্ধ হয়
     → ভালভ খুললে চাপ কমে → পাম্প নিজেই চালু হয়
   তাই আলাদা রিলে দিয়ে পাম্প কন্ট্রোল করতে হয় না!
   
   🛒 কেনার সময় বলুন: "12V DC ডায়াফ্রাম পাম্প,
      অটো প্রেসার সুইচ সহ, 100PSI" — দাম ৳800-1500

🅲️ বড় AC বুস্টার পাম্প (>0.5HP) হলে:
   ⚠️ ইলেকট্রিশিয়ান দিয়ে করান!
   MCB + কন্ট্যাক্টর লাগবে।


ধাপ ৫: প্লাম্বিং (পাইপ কানেকশন)
──────────────────────────────────

  ট্যাঙ্ক/পাম্প
      │
      ▼
  T-জয়েন্ট ½"
   ╱         ╲
  ▼           ▼
ভালভ #1     ভালভ #2
(IN5)       (IN7)
  │           │
  ▼           ▼
ফগার       স্প্রিংকলার
নজল         হেড

💡 T-জয়েন্ট এমন জায়গায় লাগান যেখান থেকে
   দুই দিকেই পাইপ যেতে পারে।


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ সফটওয়্যার নিরাপত্তা (অটোমেটিক)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
এগুলো সিস্টেম নিজে করে — আপনার কিছু করতে হবে না:

✅ আগে ভালভ খোলে → ২ সেকেন্ড পর পাম্প চালু
✅ আগে পাম্প বন্ধ → ২ সেকেন্ড পর ভালভ বন্ধ
✅ ফগার ও স্প্রিংকলার একসাথে চলে না (পানির চাপ কমে যাবে)
✅ ভালভ না খুললে পাম্প চলবে না (ড্রাই রান প্রোটেকশন)`,
    resistorNote: null,
    tips: [
      '🔧 রিলে বোর্ডে COM, NO, NC লেখা আছে — COM ও NO তে তার লাগান, NC ফাঁকা রাখুন',
      '⚡ 12V অ্যাডাপ্টার একটাই লাগবে — দুই ভালভ ও পাম্প সব একই 12V থেকে চলবে',
      '🔩 ডায়োড উল্টো করে লাগাতে হবে — সিলভার ব্যান্ড (+) দিকে থাকবে',
      '💧 ট্যাঙ্ক ৩-৫ মিটার উঁচুতে থাকলে পাম্প লাগবে না — শুধু ভালভ ও পাইপ যথেষ্ট',
      '🚫 ফগার ও স্প্রিংকলার কখনো একসাথে চলবে না — সিস্টেম নিজে নিয়ন্ত্রণ করে',
      '⚠️ AC বুস্টার পাম্প (>0.5HP) হলে অবশ্যই ইলেকট্রিশিয়ান দিয়ে MCB + কন্ট্যাক্টর লাগান',
    ],
  },
  {
    id: 'sim800l',
    name: 'SIM800L GSM মডিউল (এসএমএস অ্যালার্ট)',
    nameEn: 'SIM800L GSM Module (SMS Alerts)',
    icon: AlertTriangle,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    pins: [
      { sensorPin: 'VCC (4.2V পাওয়ার)', esp32Pin: 'পৃথক 4.2V 2A সাপ্লাই', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: SIM800L এর VCC → পৃথক 4.2V 2A পাওয়ার সাপ্লাই (ESP32 থেকে নয়!)', warning: '⚠️ ESP32 এর 3.3V বা VIN থেকে পাওয়ার দিবেন না! পৃথক পাওয়ার সোর্স লাগবে।' },
      { sensorPin: 'GND (গ্রাউন্ড)', esp32Pin: 'GND (কমন)', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: SIM800L এর GND → ESP32 এর GND ও পাওয়ার সাপ্লাই GND (তিনটা একসাথে)', warning: null },
      { sensorPin: 'TXD (ট্রান্সমিট)', esp32Pin: 'v8: GPIO 19 (RX) | v10: GPIO 27 (RX)', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 সবুজ তার: SIM800L এর TXD → ESP32 এর GPIO 19 (v8 ফার্মওয়্যার) অথবা GPIO 27 (v10 ফার্মওয়্যার) — ক্রস কানেকশন', warning: '⛔ আপনার বোর্ডের ফার্মওয়্যার ভার্সন অনুযায়ী পিন নিন। v8-এ GPIO 27 = রিলে IN3 (লাইট) এবং GPIO 14 = রিলে IN4 (হিটার) — ওখানে GSM লাগালে রিলে ভুলভাবে চলবে।' },
      { sensorPin: 'RXD (রিসিভ)', esp32Pin: 'v8: GPIO 23 (TX) | v10: GPIO 14 (TX)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: SIM800L এর RXD → ESP32 এর GPIO 23 (v8) অথবা GPIO 14 (v10) — ক্রস কানেকশন', warning: '⚠️ ESP32 TX পিনে 1K+2K ভোল্টেজ ডিভাইডার লাগান (3.3V → ~2.8V, SIM800L safe input)।' },
    ],
    extraNote: '⚠️ এই মডিউলের জন্য পৃথক 3.7V-4.2V 2A পাওয়ার সোর্স লাগবে (18650 ব্যাটারি + TP4056 চার্জার)। ESP32 থেকে পাওয়ার দিলে কাজ করবে না এবং ESP32 ক্ষতিগ্রস্ত হতে পারে!\n\n📌 ভার্সনভিত্তিক GPIO:\n• **v8 (esp32-industrial.ino)** — GSM_RX = **GPIO 19**, GSM_TX = **GPIO 23**। SIM800L RST পিন MCU-তে যায় না; 10kΩ দিয়ে 3V3 এ টানা (রিসেট হয় AT+CFUN=1,1 দিয়ে), কারণ GPIO 5 এখন TFT DC।\n• **v10 (esp32-industrial-v10.ino)** — GSM_RX = **GPIO 27**, GSM_TX = **GPIO 14** (UART2, ZE03-NH3 না থাকলে সক্রিয়)। v10-এ GPIO 19/23 = রিলে (Light/Alarm), GPIO 16/17 = I²C, GPIO 32/4 = ZE03, GPIO 13/33 = PMS5003 — এগুলো GSM-এ ব্যবহার করবেন না।',
    resistorNote: '📍 ESP32 TX (v8: GPIO 23 / v10: GPIO 14) পিনে ভোল্টেজ ডিভাইডার প্রয়োজন (1K সিরিজ + 2K গ্রাউন্ডে)।',
    tips: ['সিম কার্ড ঢোকানোর আগে পাওয়ার বন্ধ রাখুন', 'নেটওয়ার্ক পেতে ১-২ মিনিট সময় লাগে - LED ব্লিংক দেখুন', 'সিম কার্ডে ব্যালেন্স আছে কিনা নিশ্চিত করুন', '📌 v8 pins: GPIO 19 (RX) / GPIO 23 (TX) — v10 pins: GPIO 27 (RX) / GPIO 14 (TX)', '📌 v10-এ ZE03-NH3 সেন্সর লাগানো থাকলে GSM নিষ্ক্রিয় থাকে (উভয়ে UART2 শেয়ার করে)'],
  },
  // ─────── Phase 9 (v10) Premium Sensors — Auto-detect at boot ───────
  {
    id: 'sht31',
    name: 'SHT31 প্রিসিশন তাপমাত্রা ও আর্দ্রতা সেন্সর (Phase 9 — DHT22 এর প্রিমিয়াম বিকল্প)',
    nameEn: 'SHT31 Precision Temp & Humidity (Phase 9 — replaces DHT22)',
    icon: Thermometer,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    pins: [
      { sensorPin: 'VCC (+)', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 SHT31 এর VCC → ESP32 এর 3.3V পিন', warning: '⚡ 5V দেবেন না — সেন্সর পুড়ে যাবে।' },
      { sensorPin: 'GND', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ SHT31 এর GND → ESP32 এর GND', warning: null },
      { sensorPin: 'SDA', esp32Pin: 'GPIO 16', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 SDA ডেটা লাইন → ESP32 GPIO 16 (I²C bus 2 — BH1750/SCD41 এর সাথে শেয়ার)', warning: null },
      { sensorPin: 'SCL', esp32Pin: 'GPIO 17', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 SCL ক্লক লাইন → ESP32 GPIO 17 (I²C bus 2 — শেয়ার্ড)', warning: null },
    ],
    extraNote: '✨ Phase 9 firmware বুটে I²C 0x44 স্ক্যান করে SHT31 detect করে। থাকলে DHT22 (GPIO 4) auto-disabled হয় ও SHT31 প্রাধান্য পায়। ±0.2°C / ±2% RH নির্ভুলতা।',
    resistorNote: '📍 I²C লাইনে 4.7K পুল-আপ রেজিস্টর (SDA↔3.3V এবং SCL↔3.3V) সাধারণত প্রয়োজন — মডিউলে built-in থাকলে আলাদা লাগবে না।',
    tips: ['DHT22 এর চেয়ে ১০× বেশি নির্ভুল', 'I²C address 0x44 (default) বা 0x45', 'একই I²C bus-এ BH1750 ও SCD41 শেয়ার করা যায়', 'শেডের মাঝখানে মুরগির মাথার উচ্চতায় বসান'],
  },
  {
    id: 'bh1750',
    name: 'BH1750 আলো (Lux) সেন্সর (Phase 9 — LDR এর প্রিমিয়াম বিকল্প)',
    nameEn: 'BH1750 Lux Light Sensor (Phase 9 — replaces LDR)',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    pins: [
      { sensorPin: 'VCC', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 BH1750 এর VCC → ESP32 এর 3.3V', warning: null },
      { sensorPin: 'GND', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ BH1750 এর GND → ESP32 এর GND', warning: null },
      { sensorPin: 'SDA', esp32Pin: 'GPIO 16', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 SDA → ESP32 GPIO 16 (SHT31/SCD41 এর সাথে I²C bus 2 শেয়ার)', warning: null },
      { sensorPin: 'SCL', esp32Pin: 'GPIO 17', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 SCL → ESP32 GPIO 17 (শেয়ার্ড I²C)', warning: null },
      { sensorPin: 'ADDR', esp32Pin: '— (খালি/GND)', wireColor: '—', wireNameEn: 'NONE', instruction: '⬜ ADDR পিন খালি রাখুন (default 0x23) অথবা 3.3V দিলে 0x5C address হয়', warning: null },
    ],
    extraNote: '✨ Phase 9 firmware I²C 0x23 detect করলে LDR (GPIO 35) auto-disabled হয়। সরাসরি Lux ইউনিটে output (1-65535 lx) — analog calibration এর প্রয়োজন নেই।',
    resistorNote: null,
    tips: ['ছাদের নিচে শেডের কেন্দ্রে বসান', 'ধুলো জমলে রিডিং কমে — মাসে একবার পরিষ্কার', 'লেয়ার লাইটিং কার্ভ এই সেন্সরের রিডিং অনুযায়ী কাজ করে'],
  },
  {
    id: 'ze03-nh3',
    name: 'ZE03-NH3 ইলেক্ট্রোকেমিক্যাল অ্যামোনিয়া সেন্সর (Phase 9 — MQ-137 এর প্রিমিয়াম বিকল্প)',
    nameEn: 'ZE03-NH3 Electrochemical Ammonia (Phase 9 — replaces MQ-137)',
    icon: Wind,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    pins: [
      { sensorPin: 'VCC', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 ZE03 এর VCC → ESP32 VIN (5V)', warning: null },
      { sensorPin: 'GND', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ ZE03 এর GND → ESP32 GND', warning: null },
      { sensorPin: 'TX (সেন্সর আউটপুট)', esp32Pin: 'GPIO 32 (RX2)', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 ZE03 এর TX → ESP32 GPIO 32 (UART RX)', warning: null },
      { sensorPin: 'RX (সেন্সর ইনপুট)', esp32Pin: 'GPIO 4 (TX2)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 ZE03 এর RX → ESP32 GPIO 4 (UART TX)', warning: '⚠️ DHT22 #1 GPIO 4 দখল করে রাখলে SHT31 (I²C) ব্যবহার করুন।' },
    ],
    extraNote: '✨ Phase 9 firmware UART2-তে ZE03 detect করলে MQ-137 (GPIO 34) auto-disabled হয়। True ppm output — calibration বা burn-in লাগে না। ±2 ppm নির্ভুলতা।',
    resistorNote: null,
    tips: ['মাটি থেকে ১-২ ফুট উচ্চতায় বসান (NH₃ ভারী)', 'প্রি-হিট সময় মাত্র ৩ মিনিট (MQ-137 এর ২৪ ঘণ্টার তুলনায়)', '২ বছর সেন্সর লাইফ — তারপর replace করুন', 'লেয়ার: 15/25 ppm threshold · ব্রয়লার: 20/30 ppm'],
  },
  {
    id: 'scd41',
    name: 'SCD41 CO₂ সেন্সর (Phase 9 — বায়ু-গুণমান প্রিমিয়াম)',
    nameEn: 'SCD41 CO₂ Sensor (Phase 9 — premium ventilation feedback)',
    icon: Wind,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    pins: [
      { sensorPin: 'VCC', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 SCD41 এর VCC → ESP32 3.3V', warning: '⚡ 5V দেবেন না।' },
      { sensorPin: 'GND', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ SCD41 এর GND → ESP32 GND', warning: null },
      { sensorPin: 'SDA', esp32Pin: 'GPIO 16', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 SDA → ESP32 GPIO 16 (SHT31/BH1750 এর সাথে I²C bus 2 শেয়ার)', warning: null },
      { sensorPin: 'SCL', esp32Pin: 'GPIO 17', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 SCL → ESP32 GPIO 17 (শেয়ার্ড I²C)', warning: null },
    ],
    extraNote: '✨ Phase 9 firmware I²C 0x62 detect করলে CO₂ telemetry সক্রিয় হয় — vent automation এই value-তে react করে (>1500 ppm = exhaust ON)। ±50 ppm নির্ভুলতা।',
    resistorNote: null,
    tips: ['শেডের কেন্দ্রে মুরগির শ্বাসের উচ্চতায় বসান', 'প্রথম boot-এ ৫ মিনিট self-calibration', 'একই I²C bus-এ একাধিক সেন্সর — পৃথক পুল-আপ লাগে না'],
  },
  {
    id: 'pms5003',
    name: 'PMS5003 PM2.5 / PM10 ডাস্ট সেন্সর (Phase 9 — বায়ু-মান প্রিমিয়াম)',
    nameEn: 'PMS5003 PM2.5/PM10 Dust Sensor (Phase 9 — particulate)',
    icon: Wind,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    pins: [
      { sensorPin: 'VCC', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 PMS5003 এর VCC → ESP32 VIN (5V) — fan চালানোর জন্য 5V লাগে', warning: null },
      { sensorPin: 'GND', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ PMS5003 এর GND → ESP32 GND', warning: null },
      { sensorPin: 'TX (সেন্সর আউটপুট)', esp32Pin: 'GPIO 13 (RX1)', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 PMS5003 TX → ESP32 GPIO 13 (UART1 RX)', warning: null },
      { sensorPin: 'RX (সেন্সর ইনপুট)', esp32Pin: 'GPIO 33 (TX1)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 PMS5003 RX → ESP32 GPIO 33 (UART1 TX)', warning: null },
    ],
    extraNote: '✨ Phase 9 firmware UART1-তে PMS5003 detect করে। PM2.5 ও PM10 µg/m³ output — feed dust ও bedding monitor-এ সাহায্য করে।',
    resistorNote: null,
    tips: ['Fan-side বিপরীতে বসান (clean intake side)', 'প্রতি ৬ মাসে fan মুছুন — ধুলো জমলে accuracy কমে', 'PM2.5 > 75 µg/m³ হলে exhaust auto-trigger'],
  },
  // ─────── v8.3.0 প্যানেল ডিসপ্লে ও ইন্ডিকেটর LED ───────
  {
    id: 'tft-display',
    name: '🖥️ ILI9341 TFT ডিসপ্লে — ঐচ্ছিক (v8.3.0, বোর্ডের উপরে লাইভ স্ট্যাটাস)',
    nameEn: 'ILI9341 SPI TFT Display — OPTIONAL (v8.3.0 on-board status)',
    icon: Cpu,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    pins: [
      { sensorPin: 'VCC', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 ডিসপ্লের VCC → ESP32 এর 3.3V পিন', warning: '⚡ 5V দেবেন না — ILI9341 লজিক 3.3V।' },
      { sensorPin: 'GND', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ ডিসপ্লের GND → ESP32 GND (কমন গ্রাউন্ড)', warning: null },
      { sensorPin: 'SCK (CLK)', esp32Pin: 'GPIO 21', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 SCK → ESP32 GPIO 21 (HSPI রিম্যাপ ক্লক)', warning: null },
      { sensorPin: 'MOSI (SDI)', esp32Pin: 'GPIO 22', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 MOSI/SDI → ESP32 GPIO 22 (ডেটা লাইন)', warning: null },
      { sensorPin: 'CS', esp32Pin: 'GPIO 17', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ CS (চিপ সিলেক্ট) → ESP32 GPIO 17', warning: null },
      { sensorPin: 'DC (RS)', esp32Pin: 'GPIO 5', wireColor: 'কমলা', wireNameEn: 'ORANGE', instruction: '🟠 DC/RS → ESP32 GPIO 5', warning: '📌 GPIO 5 আগে GSM_RST ছিল — এখন SIM800L এর RST 10kΩ পুল-আপে 3.3V তে বাঁধুন, রিসেট হবে AT+CFUN=1,1 কমান্ডে।' },
      { sensorPin: 'RESET', esp32Pin: 'ESP32 EN / 3.3V', wireColor: 'নীল', wireNameEn: 'BLUE', instruction: '🔵 RESET → ESP32 এর EN পিন (বা 10kΩ দিয়ে 3.3V) — আলাদা GPIO খরচ হবে না', warning: null },
      { sensorPin: 'LED (ব্যাকলাইট)', esp32Pin: '3.3V', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 LED/BLK পিন → 3.3V (সবসময় চালু)। ডিম করতে চাইলে 100Ω সিরিজ রেজিস্টর দিন', warning: null },
      { sensorPin: 'MISO (SDO)', esp32Pin: '— (খালি)', wireColor: '—', wireNameEn: 'NONE', instruction: '⬜ MISO খালি রাখুন — ফার্মওয়্যার শুধু লেখে, পড়ে না', warning: null },
    ],
    extraNote: '🖥️ v8.3.0 ফার্মওয়্যারে `displayManagerTick()` নন-ব্লকিংভাবে প্রতি ২ সেকেন্ডে স্ক্রিন আপডেট করে — তাপমাত্রা, আর্দ্রতা, অ্যামোনিয়া, ৮টি রিলের অবস্থা, WiFi/GSM সিগন্যাল ও সেফটি স্ট্যাটাস দেখায়। \n\n✅ **ঐচ্ছিক:** ডিসপ্লে এখন না লাগালেও কোনো সমস্যা নেই। ফার্মওয়্যার জেনারেটরে “বোর্ডে TFT ডিসপ্লে আছে” সুইচটি বন্ধ রাখুন (ডিফল্ট) — তখন `DISPLAY_ENABLED false` থাকে, Adafruit GFX/ILI9341 লাইব্রেরি লাগে না এবং রিলে/সেফটি লজিক হুবহু একই থাকে। পরে ডিসপ্লে বসিয়ে সুইচ চালু করে আবার ফার্মওয়্যার জেনারেট ও ফ্ল্যাশ করলেই হবে।',
    resistorNote: '📍 SPI তার ২০ সেন্টিমিটারের বেশি লম্বা হলে SCK ও MOSI লাইনে ৩৩Ω সিরিজ রেজিস্টর দিন — নয়েজ কমবে।',
    tips: [
      '📦 IP65 বক্সের ঢাকনায় অ্যাক্রিলিক উইন্ডো কেটে ডিসপ্লে বসান',
      '🔌 ফ্ল্যাট রিবন কেবল ব্যবহার করুন যাতে ঢাকনা খোলা-বন্ধে তার না ছেঁড়ে',
      '☀️ সরাসরি রোদে ডিসপ্লে রাখবেন না — LCD কালো হয়ে যেতে পারে',
      '⛔ GPIO 21/22 এখন ডিসপ্লের — এখানে I²C সেন্সর লাগাবেন না',
    ],
  },
  {
    id: 'panel-led',
    name: '💡 প্যানেল ইন্ডিকেটর LED ×৮ — ঐচ্ছিক (ULN2803A ড্রাইভার)',
    nameEn: 'Panel Indicator LEDs x8 — OPTIONAL (ULN2803A driver)',
    icon: Lightbulb,
    color: 'text-lime-500',
    bgColor: 'bg-lime-500/10',
    pins: [
      { sensorPin: 'IN1 → OUT1', esp32Pin: 'GPIO 25 (এক্সহস্ট ফ্যান)', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ ESP32 GPIO 25 → ULN2803A IN1। OUT1 (পিন 18) → LED#1 এর ক্যাথোড (−)', warning: null },
      { sensorPin: 'IN2 → OUT2', esp32Pin: 'GPIO 26 (সিলিং ফ্যান)', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 GPIO 26 → IN2, OUT2 → LED#2 ক্যাথোড', warning: null },
      { sensorPin: 'IN3 → OUT3', esp32Pin: 'GPIO 27 (লাইট)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 GPIO 27 → IN3, OUT3 → LED#3 ক্যাথোড', warning: null },
      { sensorPin: 'IN4 → OUT4', esp32Pin: 'GPIO 14 (হিটার)', wireColor: 'কমলা', wireNameEn: 'ORANGE', instruction: '🟠 GPIO 14 → IN4, OUT4 → LED#4 ক্যাথোড', warning: null },
      { sensorPin: 'IN5 → OUT5', esp32Pin: 'GPIO 12 (ফগার)', wireColor: 'নীল', wireNameEn: 'BLUE', instruction: '🔵 GPIO 12 → IN5, OUT5 → LED#5 ক্যাথোড', warning: '⚠️ GPIO 12 বুট স্ট্র্যাপিং পিন — এখানে 10kΩ পুল-ডাউন রাখুন, নইলে ESP32 বুট নাও করতে পারে।' },
      { sensorPin: 'IN6 → OUT6', esp32Pin: 'GPIO 13 (অ্যালার্ম)', wireColor: 'বেগুনি', wireNameEn: 'PURPLE', instruction: '🟣 GPIO 13 → IN6, OUT6 → LED#6 (লাল) ক্যাথোড', warning: null },
      { sensorPin: 'IN7 → OUT7', esp32Pin: 'GPIO 15 (স্প্রিংকলার)', wireColor: 'আসমানি', wireNameEn: 'LIGHT BLUE', instruction: '🔵 GPIO 15 → IN7, OUT7 → LED#7 ক্যাথোড', warning: null },
      { sensorPin: 'IN8 → OUT8', esp32Pin: 'GPIO 33 (সার্কুলেশন ফ্যান)', wireColor: 'ধূসর', wireNameEn: 'GREY', instruction: '⬜ GPIO 33 → IN8, OUT8 → LED#8 ক্যাথোড', warning: null },
      { sensorPin: 'COM (পিন 10)', esp32Pin: '12V (+)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 ULN2803A এর COM পিন → 12V (+) — ভেতরের ফ্লাইব্যাক ডায়োড কাজ করবে', warning: null },
      { sensorPin: 'GND (পিন 9)', esp32Pin: 'কমন GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ ULN2803A এর GND → ESP32 ও 12V সাপ্লাইয়ের কমন GND', warning: null },
      { sensorPin: 'LED অ্যানোড (+)', esp32Pin: '12V (1kΩ সিরিজ)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 প্রতিটি প্যানেল LED এর (+) → 1kΩ রেজিস্টর → 12V রেল', warning: null },
    ],
    extraNote: '💡 এই LED গুলো রিলে সিগন্যালের সমান্তরালে চলে — ESP32 এর GPIO সরাসরি LED চালায় না (ULN2803A কারেন্ট নেয়), তাই রিলের সিগন্যাল দুর্বল হয় না। প্যানেলের দিকে তাকিয়েই বোঝা যাবে কোন ডিভাইস চালু আছে।\n\n✅ **ঐচ্ছিক:** এই LED গুলো সম্পূর্ণ প্যাসিভ — ফার্মওয়্যারে কোনো সেটিং লাগে না। না লাগালে কন্ট্রোলার ও অ্যাপ আগের মতোই কাজ করবে; যেকোনো সময় পরে যোগ করা যাবে (ফার্মওয়্যার পরিবর্তন ছাড়াই)।',
    resistorNote: '📍 12V রেলে 1kΩ, 5V রেলে 330Ω সিরিজ রেজিস্টর ব্যবহার করুন (প্রতি LED ~10mA)।',
    tips: [
      '🎨 রঙ পরিকল্পনা: ফ্যান=নীল, লাইট=সাদা, হিটার=কমলা, ফগার/স্প্রিংকলার=সবুজ, অ্যালার্ম=লাল',
      '🏷️ প্রতিটি LED এর পাশে লেবেল লাগান (এক্সহস্ট/সিলিং/লাইট...)',
      '🔩 ULN2803A সরাসরি সোল্ডার না করে ১৮ পিন সকেটে বসান',
      '✅ টেস্ট: ম্যানুয়াল মোডে এক এক করে ডিভাইস ON করুন — সংশ্লিষ্ট LED জ্বলবে ও রিলে ক্লিক করবে',
    ],
  },
];


// Group sensors by measurement / function — single collapsible per category
export const wiringCategories = [
  { id: 'temp-humidity', name: '🌡️ তাপমাত্রা ও আর্দ্রতা (DHT22 / SHT31)', nameEn: 'Temperature & Humidity', icon: Thermometer, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', sensorIds: ['dht22', 'dht22-2', 'sht31'] },
  { id: 'ammonia', name: '💨 অ্যামোনিয়া (MQ-137 / ZE03-NH3)', nameEn: 'Ammonia Sensors', icon: Wind, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', sensorIds: ['mq137', 'mq137-capacitor', 'ze03-nh3'] },
  { id: 'air-quality', name: '🌫️ বায়ু-গুণমান (CO₂ / PM2.5) — Phase 9 প্রিমিয়াম', nameEn: 'Air Quality (Phase 9)', icon: Wind, color: 'text-sky-500', bgColor: 'bg-sky-500/10', sensorIds: ['scd41', 'pms5003'] },
  { id: 'light', name: '💡 আলো / Lux (LDR — v8 / BH1750 — v10)', nameEn: 'Light / Lux (LDR — v8 / BH1750 — v10)', icon: Lightbulb, color: 'text-amber-500', bgColor: 'bg-amber-500/10', sensorIds: ['ldr', 'bh1750'] },
  { id: 'water', name: '💧 ওয়াটার ফ্লো (YF-S201)', nameEn: 'Water Flow', icon: Droplets, color: 'text-blue-500', bgColor: 'bg-blue-500/10', sensorIds: ['yfs201'] },
  { id: 'power-monitor', name: '⚡ ভোল্টেজ মনিটর (ZMPT101B)', nameEn: 'Voltage Monitor', icon: Power, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', sensorIds: ['zmpt101b'] },
  { id: 'power', name: '🔌 পাওয়ার সাপ্লাই ও ক্যাপাসিটর', nameEn: 'Power Supply & Capacitors', icon: Zap, color: 'text-red-500', bgColor: 'bg-red-500/10', sensorIds: ['power-setup', 'capacitor'] },
  { id: 'output', name: '🎛️ রিলে আউটপুট ও MCB / কন্ট্যাক্টর', nameEn: 'Relay Output & Switching', icon: ToggleLeft, color: 'text-purple-500', bgColor: 'bg-purple-500/10', sensorIds: ['relay', 'mcb-contactor'] },
  { id: 'actuators', name: '💦 অ্যাকচুয়েটর (ফগার / স্প্রিংকলার / বাজার / পাম্প)', nameEn: 'Actuators (Fogger / Sprinkler / Buzzer / Pump)', icon: Droplets, color: 'text-blue-500', bgColor: 'bg-blue-500/10', sensorIds: ['fogger', 'sprinkler', 'buzzer', 'shared-pump'] },
  { id: 'gsm', name: '📡 GSM মডিউল (ঐচ্ছিক)', nameEn: 'GSM Module (Optional)', icon: Wifi, color: 'text-violet-500', bgColor: 'bg-violet-500/10', sensorIds: ['sim800l'] },
  { id: 'display-indicator', name: '🖥️ ডিসপ্লে ও প্যানেল LED (v8.3.0)', nameEn: 'Display & Panel LEDs (v8.3.0)', icon: Cpu, color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-500/10', sensorIds: ['tft-display', 'panel-led'] },

];

export const setupSteps = [
  {
    step: 1,
    title: 'Arduino IDE সেটআপ',
    titleEn: 'Arduino IDE Setup',
    icon: Settings,
    tasks: [
      'Arduino IDE ডাউনলোড করুন (arduino.cc)',
      'File → Preferences → Additional Board URLs এ যোগ করুন: https://dl.espressif.com/dl/package_esp32_index.json',
      'Tools → Board → Boards Manager → "ESP32" সার্চ করে ইনস্টল করুন',
      'Tools → Board → ESP32 Dev Module সিলেক্ট করুন',
    ]
  },
  {
    step: 2,
    title: 'লাইব্রেরি ইনস্টল',
    titleEn: 'Install Libraries',
    icon: Cpu,
    tasks: [
      'Sketch → Include Library → Manage Libraries',
      '"ArduinoJson" সার্চ করে ইনস্টল করুন (by Benoit Blanchon)',
      '"DHT sensor library" সার্চ করে ইনস্টল করুন (by Adafruit)',
      '"WiFi" এবং "HTTPClient" বিল্ট-ইন আছে',
    ]
  },
  {
    step: 3,
    title: 'হার্ডওয়্যার সংযোগ',
    titleEn: 'Hardware Connection',
    icon: Cable,
    tasks: [
      'উপরের ওয়্যারিং ডায়াগ্রাম অনুযায়ী সব সেন্সর ও রিলে সংযোগ করুন',
      '২২০V AC ইনপুট লাইনে FBH-01/CH141 ৫×২০mm ফিউজ হোল্ডার + ৫A ২৫০V গ্লাস ফিউজ সিরিজে লাগান — ESP32 বক্সের আগে',
      '12V অ্যাডাপ্টার → DC Connector → LM2596 (5V সেট করুন) → ESP32 VIN; 12V সরাসরি → রিলে JD-VCC',
      'USB দিয়ে ESP32 কম্পিউটারে সংযোগ করুন',
      'সব সংযোগ দুইবার চেক করুন',
    ]
  },
  {
    step: 4,
    title: 'কোড কনফিগার করুন',
    titleEn: 'Configure Code',
    icon: Wifi,
    tasks: [
      'esp32-industrial.ino ও esp32-safety-engine.h ফাইল খুলুন',
      'WiFi SSID ও পাসওয়ার্ড দিন',
      'Device Token দিন (অ্যাপ থেকে কপি করুন)',
      'FARM_ID ও SHED_ID ঠিক আছে কিনা চেক করুন',
    ]
  },
  {
    step: 5,
    title: 'আপলোড ও টেস্ট',
    titleEn: 'Upload & Test',
    icon: Zap,
    tasks: [
      'Tools → Port থেকে সঠিক COM পোর্ট সিলেক্ট করুন',
      'Upload বাটনে ক্লিক করুন (⇢)',
      'Serial Monitor খুলুন (115200 baud)',
      'WiFi Connected ও API Response দেখুন',
    ]
  },
  {
    step: 6,
    title: 'অ্যাপে ভেরিফাই',
    titleEn: 'Verify in App',
    icon: CheckCircle2,
    tasks: [
      'FarmEye অ্যাপে লগইন করুন',
      'Dashboard এ সেন্সর ডেটা দেখুন',
      'Control পেজ থেকে ফ্যান/লাইট টেস্ট করুন',
      'Settings এ Device Health চেক করুন',
    ]
  },
];
