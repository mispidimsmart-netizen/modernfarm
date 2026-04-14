import { useState } from 'react';
import { ArrowLeft, Cpu, Cable, Zap, Wifi, Settings, CheckCircle2, ShoppingCart, ExternalLink, Copy, Check, AlertTriangle, Info, Lightbulb, Thermometer, Droplets, Wind, Power, ToggleLeft, Bird, Egg, Flame, Fan } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';
import wiringDiagram from '@/assets/esp32-wiring-diagram.png';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';
import capacitorWiringDiagram from '@/assets/esp32-capacitor-wiring.png';

// Jumper wire types guide
const jumperWireTypes = [
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

const partsList = [
  {
    category: 'মূল কন্ট্রোলার',
    categoryEn: 'Main Controller',
    items: [
      { name: 'ESP32 DevKit V1 (30-pin)', nameEn: 'ESP32 DevKit V1 (30-pin)', quantity: 1, price: '৳৫৫০-৭৫০', priceRange: [550, 750], shop: 'টেকশপ বিডি, রোবটিক্স বিডি', essential: true },
      { name: 'USB কেবল (Micro USB / Type-C)', nameEn: 'USB Cable (Micro USB / Type-C)', quantity: 1, price: '৳৮০-১৫০', priceRange: [80, 150], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
    ]
  },
  {
    category: 'সেন্সর',
    categoryEn: 'Sensors',
    items: [
      { name: 'DHT22/AM2302 #১ (তাপমাত্রা ও আর্দ্রতা) — GPIO 4', nameEn: 'DHT22 #1 Temp & Humidity — GPIO 4', quantity: 1, price: '৳৩৫০-৪৫০', priceRange: [350, 450], shop: 'রোবটিক্স বিডি, বিডিস্টল', essential: true },
      { name: 'DHT22/AM2302 #২ (বড় শেডের জন্য) — GPIO 16', nameEn: 'DHT22 #2 (Large Shed) — GPIO 16', quantity: 1, price: '৳৩৫০-৪৫০', priceRange: [350, 450], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'MQ-137 (অ্যামোনিয়া গ্যাস সেন্সর) — GPIO 34', nameEn: 'MQ-137 Ammonia Sensor — GPIO 34', quantity: 1, price: '৳৪০০-৬০০', priceRange: [400, 600], shop: 'টেকশপ বিডি', essential: true },
      { name: 'YF-S201 (ওয়াটার ফ্লো সেন্সর) — GPIO 17', nameEn: 'YF-S201 Water Flow — GPIO 17', quantity: 1, price: '৳২৫০-৩৫০', priceRange: [250, 350], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'ZMPT101B (AC ভোল্টেজ সেন্সর) — GPIO 35', nameEn: 'ZMPT101B Voltage Sensor — GPIO 35', quantity: 1, price: '৳১৫০-২৫০', priceRange: [150, 250], shop: 'টেকশপ বিডি', essential: true },
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
    ]
  },
  {
    category: 'সুইচিং ও প্রোটেকশন',
    categoryEn: 'Switching & Protection',
    items: [
      { name: 'MCB মেইন (সার্কিট ব্রেকার) — 2P 32A C', nameEn: 'MCB Main Circuit Breaker 2P 32A C', quantity: 1, price: '৳৩৫০-৫৫০', priceRange: [350, 550], shop: 'ইলেকট্রিক্যাল দোকান', essential: true },
      { name: 'সাব MCB — 1P 6A (প্রতিটি রিলে লাইনের জন্য)', nameEn: 'Sub MCB 1P 6A (per relay line)', quantity: 8, price: '৳১২০-১৮০/পিস', priceRange: [960, 1440], shop: 'ইলেকট্রিক্যাল দোকান', essential: true },
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
const wiringConnections = [
  { component: 'DHT22 #1', pin: 'DATA', esp32Pin: 'GPIO 4', color: 'bg-green-500', note: '10K রেজিস্টর VCC ও DATA এর মধ্যে' },
  { component: 'DHT22 #1', pin: 'VCC', esp32Pin: '3.3V', color: 'bg-red-500', note: '' },
  { component: 'DHT22 #1', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'DHT22 #2', pin: 'DATA', esp32Pin: 'GPIO 16', color: 'bg-green-400', note: '10K রেজিস্টর (বড় শেডের জন্য)' },
  { component: 'DHT22 #2', pin: 'VCC', esp32Pin: '3.3V', color: 'bg-red-500', note: '' },
  { component: 'DHT22 #2', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'MQ-137', pin: 'AO', esp32Pin: 'GPIO 34', color: 'bg-yellow-500', note: 'এনালগ আউটপুট (২৪ঘণ্টা প্রিহিট)' },
  { component: 'MQ-137', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'MQ-137', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'YF-S201', pin: 'Signal', esp32Pin: 'GPIO 17', color: 'bg-blue-500', note: 'পালস আউটপুট (তীর চিহ্ন অনুসরণ)' },
  { component: 'YF-S201', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'YF-S201', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'ZMPT101B', pin: 'OUT', esp32Pin: 'GPIO 35', color: 'bg-cyan-500', note: 'AC ভোল্টেজ মনিটর' },
  { component: 'ZMPT101B', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'ZMPT101B', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
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
  { component: 'Piezo Buzzer', pin: '+', esp32Pin: 'Relay IN6 (GPIO 13)', color: 'bg-amber-500', note: '🔔 পিজো বাজার (রিলে দিয়ে কন্ট্রোল)' },
];

// Detailed step-by-step wiring guide for each sensor
const detailedWiringGuide = [
  {
    id: 'power-setup',
    name: '⚡ 12V পাওয়ার সেটআপ (অ্যাডাপ্টার + LM2596 + DC Connector)',
    nameEn: '12V Power Setup (Adapter + LM2596 + DC Connector)',
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    pins: [
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
      '🔧 LM2596 স্ক্রু ঘুরিয়ে আউটপুট ভোল্টেজ 5.0V সেট করুন — ESP32 কানেক্টের আগে!',
      '📏 মাল্টিমিটারের লাল প্রোব OUT+ এ এবং কালো প্রোব OUT- এ ধরে ভোল্টেজ মাপুন',
      '⚠️ রিলে বোর্ডের JD-VCC জাম্পার অবশ্যই খুলুন — নইলে 12V ESP32 তে চলে যাবে!',
      '🔌 সব GND একসাথে কমন করুন (অ্যাডাপ্টার, LM2596, ESP32, রিলে)',
      '✅ সঠিক সেটআপে রিলে জোরে ক্লিক করবে এবং ESP32 স্থিতিশীলভাবে চলবে',
    ],
    hasPowerSetupDiagram: true,
    powerSetupInfo: {
      title: '🔌 12V পাওয়ার ডিস্ট্রিবিউশন ডায়াগ্রাম',
      diagram: `12V 3A অ্যাডাপ্টার
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
      { sensorPin: 'পিন ২: DATA (Signal)', esp32Pin: 'GPIO 16', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ সাদা তার: DHT22 #২ এর DATA → ESP32 এর GPIO 16 (আলাদা পিন!)', warning: null },
      { sensorPin: 'পিন ৪: GND (-)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: DHT22 #২ এর GND → ESP32 এর GND (প্রথমটির সাথে শেয়ার করা যায়)', warning: null },
    ],
    extraNote: 'বড় শেডে দুই প্রান্তে দুটি সেন্সর লাগালে গড় তাপমাত্রা পাওয়া যায়।',
    resistorNote: '📍 10K পুল-আপ রেজিস্টর: DATA (GPIO 16) ↔ VCC (3.3V)',
    tips: ['শেডের এক প্রান্তে প্রথম এবং অপর প্রান্তে দ্বিতীয় সেন্সর লাগান'],
  },
  {
    id: 'mq137',
    name: 'MQ-137 অ্যামোনিয়া গ্যাস সেন্সর',
    nameEn: 'MQ-137 Ammonia Gas Sensor',
    icon: Wind,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    pins: [
      { sensorPin: 'VCC (+5V)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: MQ-137 এর VCC → ESP32 এর VIN পিন (5V প্রয়োজন)', warning: 'এই সেন্সর 5V-তে চলে। 3.3V দিলে কাজ করবে না।' },
      { sensorPin: 'AO (Analog Output)', esp32Pin: 'GPIO 34', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: MQ-137 এর AO পিন → ESP32 এর GPIO 34 (ADC ইনপুট)', warning: null },
      { sensorPin: 'DO (Digital Output)', esp32Pin: '-', wireColor: '-', wireNameEn: '-', instruction: '⬜ DO পিন ব্যবহার করা হচ্ছে না (খালি রাখুন)', warning: null },
      { sensorPin: 'GND (-)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: MQ-137 এর GND → ESP32 এর GND', warning: null },
    ],
    extraNote: '⚠️ গুরুত্বপূর্ণ: প্রথমবার চালু করার পর ২৪-৪৮ ঘন্টা একটানা চালু রাখুন ("প্রিহিট/বার্ন-ইন")। এই সময় সেন্সর গরম থাকবে এবং রিডিং স্থিতিশীল হতে সময় লাগবে। প্রিহিটের আগে রিডিং ভুল আসতে পারে (যেমন ২৫ ppm)। সেটিংস থেকে ক্যালিব্রেশন অফসেট অ্যাডজাস্ট করতে পারবেন।',
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
      { sensorPin: 'Signal/Pulse (হলুদ তার)', esp32Pin: 'GPIO 17', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: ওয়াটার সেন্সর থেকে আসা হলুদ/সাদা তার → ESP32 এর GPIO 17 (পালস ইনপুট)', warning: null },
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
      { sensorPin: 'VCC (পাওয়ার)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: রিলে মডিউল এর VCC → ESP32 এর VIN (5V)', warning: 'JD-VCC জাম্পার লাগানো আছে কিনা চেক করুন!' },
      { sensorPin: 'GND (গ্রাউন্ড)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: রিলে মডিউল এর GND → ESP32 এর GND', warning: null },
      { sensorPin: 'IN1 (এক্সহস্ট ফ্যান)', esp32Pin: 'GPIO 25', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ সাদা তার: রিলে IN1 → ESP32 এর GPIO 25 (🌀 এক্সহস্ট ফ্যান)', warning: null },
      { sensorPin: 'IN2 (সিলিং ফ্যান)', esp32Pin: 'GPIO 26', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 সবুজ তার: রিলে IN2 → ESP32 এর GPIO 26 (🌀 সিলিং ফ্যান — ≥25°সে চালু, ≤22°সে বন্ধ)', warning: null },
      { sensorPin: 'IN3 (লাইট)', esp32Pin: 'GPIO 27', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: রিলে IN3 → ESP32 এর GPIO 27 (💡 লাইটিং)', warning: null },
      { sensorPin: 'IN4 (হিটার)', esp32Pin: 'GPIO 14', wireColor: 'কমলা', wireNameEn: 'ORANGE', instruction: '🟠 কমলা তার: রিলে IN4 → ESP32 এর GPIO 14 (🔥 হিটার — ব্রয়লার বয়স-ভিত্তিক)', warning: null },
      { sensorPin: 'IN5 (ফগার)', esp32Pin: 'GPIO 12', wireColor: 'নীল', wireNameEn: 'BLUE', instruction: '🔵 নীল তার: রিলে IN5 → ESP32 এর GPIO 12 (💦 ফগার DC 12V সোলেনয়েড ভালভ)', warning: null },
      { sensorPin: 'IN6 (অ্যালার্ম)', esp32Pin: 'GPIO 13', wireColor: 'বেগুনি', wireNameEn: 'PURPLE', instruction: '🟣 বেগুনি তার: রিলে IN6 → ESP32 এর GPIO 13 (🔔 অ্যালার্ম)', warning: null },
      { sensorPin: 'IN7 (রুফ স্প্রিংকলার)', esp32Pin: 'GPIO 15', wireColor: 'আসমানি', wireNameEn: 'LIGHT BLUE', instruction: '🔵 আসমানি তার: রিলে IN7 → ESP32 এর GPIO 15 (🚿 রুফ স্প্রিংকলার — HSI ≥80 চালু)', warning: null },
      { sensorPin: 'IN8 (সার্কুলেশন ফ্যান)', esp32Pin: 'GPIO 33', wireColor: 'ধূসর', wireNameEn: 'GRAY', instruction: '⚪ ধূসর তার: রিলে IN8 → ESP32 এর GPIO 33 (💨 সার্কুলেশন ফ্যান)', warning: null },
    ],
    extraNote: '⚙️ ৮-চ্যানেল রিলে মডিউল — প্রতিটি ডিভাইসের জন্য আলাদা চ্যানেল। Active LOW লজিক (ESP32 থেকে LOW = রিলে ON)। বুট করার সময় ফ্লিকারিং রোধে কোডে বিশেষ প্রোটোকল ব্যবহার করা হয়েছে।',
    resistorNote: '📍 JD-VCC ও VCC জাম্পার সংযুক্ত রাখুন (একই পাওয়ার সোর্স)',
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
      { sensorPin: 'TXD (ট্রান্সমিট)', esp32Pin: 'GPIO 19 (RX)', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 সবুজ তার: SIM800L এর TXD → ESP32 এর GPIO 19 — ক্রস কানেকশন!', warning: '⚠️ GPIO 16 ব্যবহার করবেন না — সেটি DHT22 #2 এর জন্য সংরক্ষিত!' },
      { sensorPin: 'RXD (রিসিভ)', esp32Pin: 'GPIO 23 (TX)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: SIM800L এর RXD → ESP32 এর GPIO 23 — ক্রস কানেকশন!', warning: '⚠️ GPIO 17 ব্যবহার করবেন না — সেটি Water Flow সেন্সরের জন্য সংরক্ষিত!' },
    ],
    extraNote: '⚠️ এই মডিউলের জন্য পৃথক 3.7V-4.2V 2A পাওয়ার সোর্স লাগবে (18650 ব্যাটারি + TP4056 চার্জার)। ESP32 থেকে পাওয়ার দিলে কাজ করবে না এবং ESP32 ক্ষতিগ্রস্ত হতে পারে!\n\n📌 GPIO ম্যাপিং আপডেট: SIM800L এখন GPIO 23 (TX) ও GPIO 19 (RX) ব্যবহার করে — GPIO 16/17 আর ব্যবহৃত হয় না কারণ সেগুলো যথাক্রমে DHT22 #2 ও Water Flow সেন্সরের জন্য সংরক্ষিত।',
    resistorNote: '📍 RXD পিনে ভোল্টেজ ডিভাইডার প্রয়োজন হতে পারে (1K + 2K রেজিস্টর) কারণ SIM800L ৩.৩V লজিক এবং ESP32 থেকে সরাসরি সিগন্যাল ক্ষতি করতে পারে।',
    tips: ['সিম কার্ড ঢোকানোর আগে পাওয়ার বন্ধ রাখুন', 'নেটওয়ার্ক পেতে ১-২ মিনিট সময় লাগে - LED ব্লিংক দেখুন', 'সিম কার্ডে ব্যালেন্স আছে কিনা নিশ্চিত করুন', '📌 GPIO 23/19 ব্যবহার করুন — GPIO 16/17 নয়!'],
  },
];

const setupSteps = [
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

export default function InstallationGuidePage() {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const calculateTotal = (essentialOnly: boolean) => {
    let min = 0;
    let max = 0;
    partsList.forEach(category => {
      category.items.forEach(item => {
        if (!essentialOnly || item.essential) {
          min += item.priceRange[0] * (item.quantity || 1);
          max += item.priceRange[1] * (item.quantity || 1);
        }
      });
    });
    return { min, max };
  };

  const essentialTotal = calculateTotal(true);
  const fullTotal = calculateTotal(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast.success('কপি হয়েছে!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const wifiConfigCode = `// WiFi কনফিগারেশন (esp32-industrial.ino v8.0.0)
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// ডিভাইস কনফিগারেশন  
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN"; // অ্যাপ থেকে কপি করুন
const char* FARM_ID = "YOUR_FARM_ID";
const char* SHED_ID = "YOUR_SHED_ID";`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">ইনস্টলেশন গাইড</h1>
            <p className="text-xs text-muted-foreground">Installation Guide</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Farm Type Info Banner */}
        <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Bird className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-400">🐔 লেয়ার ও ব্রয়লার উভয় ফার্মে কাজ করে!</p>
                <p className="text-xs text-muted-foreground">একই হার্ডওয়্যার, অ্যাপ থেকে ফার্ম টাইপ সিলেক্ট করুন</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <Egg className="h-3 w-3 text-orange-500" />
                  <span className="font-medium text-orange-600 dark:text-orange-400">লেয়ার</span>
                </div>
                <p className="text-muted-foreground">স্থির তাপমাত্রা (18-27°C)</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <Bird className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-600 dark:text-blue-400">ব্রয়লার</span>
                </div>
                <p className="text-muted-foreground">বয়স-ভিত্তিক তাপমাত্রা কার্ভ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sensor Summary */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              ৫টি সেন্সর + ৮-চ্যানেল রিলে (v8.0.0)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                <Thermometer className="h-4 w-4 text-green-500" />
                <span>DHT22 ×2 (তাপ/আর্দ্রতা)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10">
                <Wind className="h-4 w-4 text-yellow-500" />
                <span>MQ-137 (অ্যামোনিয়া)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span>YF-S201 (পানি ফ্লো)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-500/10">
                <Power className="h-4 w-4 text-cyan-500" />
                <span>ZMPT101B (ভোল্টেজ)</span>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Fan className="h-3 w-3" />
                ৮-চ্যানেল রিলে: এক্সহস্ট, সিলিং ফ্যান, লাইট, হিটার, ফগার, অ্যালার্ম, স্প্রিংকলার, সার্কুলেশন
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary - Price */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">মূল পার্টস (Essential)</p>
                <p className="text-lg font-bold text-primary">৳{essentialTotal.min.toLocaleString()} - ৳{essentialTotal.max.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">সম্পূর্ণ সেটআপ (Full)</p>
                <p className="text-lg font-bold text-foreground">৳{fullTotal.min.toLocaleString()} - ৳{fullTotal.max.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="parts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parts" className="text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" />
              পার্টস
            </TabsTrigger>
            <TabsTrigger value="wiring" className="text-xs">
              <Cable className="h-3 w-3 mr-1" />
              ওয়্যারিং
            </TabsTrigger>
            <TabsTrigger value="setup" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              সেটআপ
            </TabsTrigger>
          </TabsList>

          {/* Parts List Tab */}
          <TabsContent value="parts" className="mt-4 space-y-4">
            {partsList.map((category, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{category.category}</span>
                    <span className="text-xs text-muted-foreground font-normal">{category.categoryEn}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.essential && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">আবশ্যক</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                        <p className="text-xs text-muted-foreground mt-1">🏪 {item.shop}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{item.price}</p>
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Shop Links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🛒 কোথায় কিনবেন?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: 'টেকশপ বিডি', url: 'https://techshopbd.com', note: 'ঢাকা, চট্টগ্রাম ডেলিভারি' },
                  { name: 'রোবটিক্স বিডি', url: 'https://roboticsbd.com', note: 'সারাদেশে ডেলিভারি' },
                  { name: 'বিডিস্টল', url: 'https://bdstall.com', note: 'মার্কেটপ্লেস' },
                  { name: 'দারাজ', url: 'https://daraz.com.bd', note: 'অনলাইন শপিং' },
                ].map((shop, idx) => (
                  <a
                    key={idx}
                    href={shop.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{shop.name}</p>
                      <p className="text-xs text-muted-foreground">{shop.note}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wiring Tab */}
          <TabsContent value="wiring" className="mt-4 space-y-4">
            {/* Wire Color Legend */}
            <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  🎨 তারের রং চার্ট (Wire Color Guide)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { color: 'bg-red-500', name: 'লাল (RED)', use: 'VCC / পাওয়ার (+)' },
                    { color: 'bg-gray-800', name: 'কালো (BLACK)', use: 'GND / গ্রাউন্ড (-)' },
                    { color: 'bg-yellow-500', name: 'হলুদ (YELLOW)', use: 'সিগন্যাল / ডেটা' },
                    { color: 'bg-green-500', name: 'সবুজ (GREEN)', use: 'ডেটা / কন্ট্রোল' },
                    { color: 'bg-white border border-gray-300', name: 'সাদা (WHITE)', use: 'সিগন্যাল / ডেটা' },
                    { color: 'bg-blue-500', name: 'নীল (BLUE)', use: 'কন্ট্রোল / সিরিয়াল' },
                    { color: 'bg-orange-500', name: 'কমলা (ORANGE)', use: 'এনালগ আউট' },
                    { color: 'bg-purple-500', name: 'বেগুনি (PURPLE)', use: 'কন্ট্রোল' },
                    { color: 'bg-amber-600', name: 'বাদামী (BROWN)', use: 'AC লাইভ' },
                  ].map((wire, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                      <div className={`w-4 h-4 rounded-full ${wire.color} shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{wire.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{wire.use}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Real Wiring Diagram Image */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  📐 ওয়্যারিং ডায়াগ্রাম
                  <Badge variant="secondary" className="text-[10px]">ছবিতে দেখুন</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Visual Diagram Image */}
                <img 
                  src={wiringDiagram} 
                  alt="ESP32 Wiring Diagram" 
                  className="w-full rounded-lg border border-border mb-4"
                />
                
                {/* Text Diagram as backup */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="text-diagram">
                    <AccordionTrigger className="text-xs py-2">টেক্সট ডায়াগ্রাম দেখুন</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs font-mono whitespace-pre text-foreground">
{`┌─────────────────────────────────────────────────────────┐
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
└─────────────────────────────────────────────────────────┘`}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Step by Step Wiring Guide for Each Sensor */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  ধাপে ধাপে ওয়্যারিং গাইড
                </CardTitle>
                <p className="text-xs text-muted-foreground">প্রতিটি সেন্সরের জন্য বিস্তারিত নির্দেশনা</p>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {detailedWiringGuide.map((sensor, idx) => (
                    <AccordionItem key={sensor.id} value={sensor.id}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${sensor.bgColor} flex items-center justify-center`}>
                            <sensor.icon className={`h-4 w-4 ${sensor.color}`} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{sensor.name}</p>
                            <p className="text-xs text-muted-foreground">{sensor.nameEn}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        <div className="ml-11 space-y-4">
                          {/* Pin connections */}
                          <div className="space-y-2">
                            {sensor.pins.map((pin, pinIdx) => (
                              <div key={pinIdx} className={`flex items-start gap-3 p-3 rounded-lg ${pin.warning ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/50'}`}>
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                                  {pinIdx + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">{pin.sensorPin}</Badge>
                                    {pin.esp32Pin !== '-' && (
                                      <>
                                        <span className="text-xs">→</span>
                                        <Badge className="text-xs bg-primary">{pin.esp32Pin}</Badge>
                                      </>
                                    )}
                                    {pin.wireColor && pin.wireColor !== '-' && (
                                      <Badge variant="secondary" className="text-xs">
                                        🔌 {pin.wireColor} {pin.wireNameEn && `(${pin.wireNameEn})`}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm mt-1">{pin.instruction}</p>
                                  {pin.warning && (
                                    <p className="text-xs text-destructive mt-1 font-medium">{pin.warning}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* 12V Power Setup Diagram */}
                          {'hasPowerSetupDiagram' in sensor && sensor.hasPowerSetupDiagram && 'powerSetupInfo' in sensor && sensor.powerSetupInfo && (() => {
                            const pInfo = sensor.powerSetupInfo as any;
                            return (
                              <div className="mt-4 space-y-4">
                                {/* Power Distribution Diagram */}
                                <div className="rounded-lg border-2 border-destructive/30 overflow-hidden">
                                  <div className="bg-destructive/10 p-2 border-b border-destructive/30">
                                    <p className="text-xs font-bold text-center">{pInfo.title}</p>
                                  </div>
                                  <div className="p-3 overflow-x-auto">
                                    <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed">{pInfo.diagram}</pre>
                                  </div>
                                </div>

                                {/* Before You Start */}
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                  <p className="text-xs font-bold mb-2">🛑 শুরুর আগে:</p>
                                  <div className="space-y-1.5">
                                    {pInfo.beforeStart.map((s: any, sIdx: number) => (
                                      <div key={sIdx} className="flex items-start gap-2 text-xs">
                                        <span>{s.icon}</span>
                                        <span>{s.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Jumper Warning */}
                                <div className="p-3 rounded-lg bg-destructive/10 border-2 border-destructive/40">
                                  <p className="text-xs font-bold text-destructive mb-2">{pInfo.jumperWarning.title}</p>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="p-2 rounded bg-muted/50 text-center">
                                      <p className="text-[10px] text-muted-foreground mb-1">❌ আগে (ভুল)</p>
                                      <code className="text-xs font-mono">{pInfo.jumperWarning.before}</code>
                                    </div>
                                    <div className="p-2 rounded bg-primary/10 text-center border border-primary/30">
                                      <p className="text-[10px] text-primary mb-1">✅ এখন (সঠিক)</p>
                                      <code className="text-xs font-mono">{pInfo.jumperWarning.after}</code>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{pInfo.jumperWarning.explanation}</p>
                                </div>

                                {/* Voltage Check Steps */}
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                  <p className="text-xs font-bold mb-2">📟 LM2596 ভোল্টেজ সেটআপ (গুরুত্বপূর্ণ!):</p>
                                  <div className="space-y-2">
                                    {pInfo.voltageCheckSteps.map((s: any, sIdx: number) => (
                                      <div key={sIdx} className="flex items-start gap-2 text-xs">
                                        <Badge variant="outline" className="text-[10px] shrink-0">{s.icon} {s.step}</Badge>
                                        <span>{s.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Capacitor Wiring Diagram */}
                          {sensor.hasCapacitorDiagram && (
                            <div className="space-y-4">
                              {/* Visual Diagram */}
                              <div className="rounded-lg border-2 border-amber-500/30 overflow-hidden bg-background">
                                <div className="bg-amber-500/10 p-2 border-b border-amber-500/30">
                                  <p className="text-xs font-bold text-center">📊 ক্যাপাসিটর কানেকশন ডায়াগ্রাম</p>
                                </div>
                                
                                {/* Code-based Visual */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900">
                                  <div className="flex flex-col items-center gap-4">
                                    
                                    {/* Power Source */}
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
                                      <Zap className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-bold">5V পাওয়ার সাপ্লাই / USB</span>
                                    </div>
                                    
                                    {/* Connection Lines */}
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-6 bg-red-500 rounded"></div>
                                        <span className="text-xs text-red-500 font-bold">+5V</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-6 bg-foreground/50 rounded"></div>
                                        <span className="text-xs text-muted-foreground font-bold">GND</span>
                                      </div>
                                    </div>
                                    
                                    {/* ESP32 Board with Capacitor */}
                                    <div className="w-full max-w-sm">
                                      <div className="bg-blue-700 rounded-t-lg p-2 text-center">
                                        <span className="text-white text-xs font-bold">ESP32 DevKit</span>
                                      </div>
                                      
                                      <div className="bg-blue-600 p-4 rounded-b-lg">
                                        <div className="flex items-center justify-center gap-6">
                                          {/* VIN Pin */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-yellow-600">
                                              <span className="text-[10px] font-bold text-yellow-900">VIN</span>
                                            </div>
                                            <span className="text-[10px] text-white mt-1">5V পাওয়ার</span>
                                          </div>
                                          
                                          {/* Capacitor in between */}
                                          <div className="flex flex-col items-center">
                                            <div className="relative">
                                              <div className="w-6 h-12 bg-gradient-to-b from-gray-800 to-gray-900 rounded-sm border border-gray-600 flex items-center justify-center">
                                                <div className="absolute -top-1 left-0 right-0 flex justify-center">
                                                  <span className="text-[8px] text-green-400 font-bold">+</span>
                                                </div>
                                                <span className="text-[8px] text-white font-bold rotate-90">1000μF</span>
                                                <div className="absolute top-0 bottom-0 right-0 w-1 bg-gray-400"></div>
                                              </div>
                                              {/* Legs */}
                                              <div className="absolute -bottom-3 left-1 w-0.5 h-3 bg-gray-400"></div>
                                              <div className="absolute -bottom-3 right-1 w-0.5 h-3 bg-gray-400"></div>
                                            </div>
                                            <div className="mt-4 flex gap-2 text-[9px]">
                                              <span className="text-red-300">+ লম্বা</span>
                                              <span className="text-gray-300">- ছোট</span>
                                            </div>
                                          </div>
                                          
                                          {/* GND Pin */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-1 h-4 bg-foreground/50 rounded mb-1"></div>
                                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600">
                                              <span className="text-[10px] font-bold text-white">GND</span>
                                            </div>
                                            <span className="text-[10px] text-white mt-1">গ্রাউন্ড</span>
                                          </div>
                                        </div>
                                        
                                        {/* Connection lines inside */}
                                        <div className="mt-3 flex items-center justify-center gap-2">
                                          <div className="flex items-center">
                                            <div className="w-8 h-0.5 bg-red-500"></div>
                                            <span className="text-[8px] text-red-300 mx-1">→</span>
                                            <div className="w-4 h-0.5 bg-red-500"></div>
                                          </div>
                                          <div className="px-2 py-1 bg-gray-800 rounded text-[8px] text-white">ক্যাপাসিটর</div>
                                          <div className="flex items-center">
                                            <div className="w-4 h-0.5 bg-gray-500"></div>
                                            <span className="text-[8px] text-gray-300 mx-1">→</span>
                                            <div className="w-8 h-0.5 bg-gray-500"></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Polarity Warning */}
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 max-w-sm">
                                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                      <div className="text-xs">
                                        <span className="font-bold text-destructive">পোলারিটি গুরুত্বপূর্ণ!</span>
                                        <p className="text-muted-foreground">+ (লম্বা পা) → VIN | - (ছোট পা/স্ট্রাইপ) → GND</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Capacitor Identification Guide */}
                                  <div className="mt-4 p-3 rounded-lg bg-background border">
                                    <p className="text-xs font-bold mb-2">🔍 ক্যাপাসিটরের + ও - চেনার উপায়:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="flex items-center gap-2 p-2 rounded bg-green-500/10">
                                        <div className="w-4 h-8 bg-gray-800 rounded-sm relative">
                                          <div className="absolute top-0 w-full text-center text-[8px] text-green-400">+</div>
                                        </div>
                                        <div className="text-xs">
                                          <p className="font-bold text-green-600">+ পজিটিভ</p>
                                          <p className="text-muted-foreground">লম্বা পা</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 p-2 rounded bg-gray-500/10">
                                        <div className="w-4 h-8 bg-gray-800 rounded-sm relative">
                                          <div className="absolute top-0 bottom-0 right-0 w-1 bg-white/50"></div>
                                          <div className="absolute top-0 w-full text-center text-[8px] text-gray-400">-</div>
                                        </div>
                                        <div className="text-xs">
                                          <p className="font-bold text-foreground">- নেগেটিভ</p>
                                          <p className="text-muted-foreground">ছোট পা + সাদা স্ট্রাইপ</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Reference Image */}
                                <div className="border-t">
                                  <div className="bg-muted/50 p-2">
                                    <p className="text-xs font-medium text-center">📷 রেফারেন্স ছবি</p>
                                  </div>
                                  <img 
                                    src={capacitorWiringDiagram} 
                                    alt="ESP32 Capacitor Wiring" 
                                    className="w-full h-auto bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Resistor note */}
                          {sensor.resistorNote && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-blue-700 dark:text-blue-400">{sensor.resistorNote}</p>
                            </div>
                          )}

                          {/* Extra note */}
                          {sensor.extraNote && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/30">
                              <AlertTriangle className="h-4 w-4 text-status-warning shrink-0 mt-0.5" />
                              <p className="text-sm text-status-warning">{sensor.extraNote}</p>
                            </div>
                          )}
                          
                          {/* Tips */}
                          {sensor.tips && sensor.tips.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" /> টিপস:
                              </p>
                              {sensor.tips.map((tip, tipIdx) => (
                                <p key={tipIdx} className="text-xs text-muted-foreground ml-4">• {tip}</p>
                              ))}
                            </div>
                          )}

                          {/* Buzzer Wiring Diagram Section */}
                          {'hasBuzzerDiagram' in sensor && sensor.hasBuzzerDiagram && 'buzzerWiringInfo' in sensor && sensor.buzzerWiringInfo && (
                            <div className="mt-6 space-y-4">
                              {/* Section Header */}
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border-2 border-orange-500/30">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                <div>
                                  <p className="font-bold text-sm text-orange-600 dark:text-orange-400">{sensor.buzzerWiringInfo.title}</p>
                                  <p className="text-xs text-muted-foreground">রিলে দিয়ে নিরাপদে বাজার কন্ট্রোল করুন</p>
                                </div>
                              </div>

                              {/* Why Relay Section */}
                              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  {sensor.buzzerWiringInfo.whyRelay.title}
                                </p>
                                <ul className="space-y-1">
                                  {sensor.buzzerWiringInfo.whyRelay.points.map((point: string, pIdx: number) => (
                                    <li key={pIdx} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                      <span className="text-amber-500 mt-0.5">•</span>
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Visual Wiring Diagram */}
                              <div className="rounded-lg border-2 border-orange-500/30 overflow-hidden bg-background">
                                <div className="bg-orange-500/10 p-2 border-b border-orange-500/30">
                                  <p className="text-xs font-bold text-center">📊 বাজার ওয়্যারিং ডায়াগ্রাম</p>
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-900">
                                  <div className="flex flex-col items-center gap-4">
                                    
                                    {/* Power Supply */}
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border-2 border-red-500/30">
                                      <Zap className="h-5 w-5 text-red-500" />
                                      <div className="text-center">
                                        <span className="text-sm font-bold">12V/24V DC পাওয়ার সাপ্লাই</span>
                                        <p className="text-xs text-muted-foreground">(বাজারের রেটিং অনুযায়ী)</p>
                                      </div>
                                    </div>
                                    
                                    {/* Power wires going down */}
                                    <div className="flex items-center gap-12">
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-10 bg-red-500 rounded"></div>
                                        <span className="text-xs text-red-500 font-bold">+ (পজিটিভ)</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-10 bg-gray-600 rounded"></div>
                                        <span className="text-xs text-gray-500 font-bold">- (নেগেটিভ/GND)</span>
                                      </div>
                                    </div>
                                    
                                    {/* Relay Module Section */}
                                    <div className="w-full max-w-sm">
                                      <div className="bg-blue-600 rounded-t-lg p-2 text-center">
                                        <span className="text-white text-xs font-bold">রিলে IN3 (GPIO 33 দ্বারা নিয়ন্ত্রিত)</span>
                                      </div>
                                      
                                      {/* Relay Terminals */}
                                      <div className="bg-gradient-to-b from-blue-500 to-blue-600 p-3 rounded-b-lg">
                                        <div className="grid grid-cols-3 gap-2">
                                          {/* NC Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="relative">
                                              <div className="w-10 h-10 bg-gray-400 rounded border-2 border-gray-500 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">NC</span>
                                              </div>
                                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">✕</span>
                                              </div>
                                            </div>
                                            <span className="text-xs text-white mt-1">খালি</span>
                                          </div>
                                          
                                          {/* COM Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 bg-orange-500 rounded border-2 border-orange-600 flex items-center justify-center ring-2 ring-yellow-400">
                                              <span className="text-xs font-bold text-white">COM</span>
                                            </div>
                                            <span className="text-xs text-white mt-1 font-bold">বাজার +</span>
                                            <span className="text-[10px] text-green-200">← এখানে</span>
                                          </div>
                                          
                                          {/* NO Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                                            <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">NO</span>
                                            </div>
                                            <span className="text-xs text-white mt-1">পাওয়ার +</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Wire from COM to Buzzer */}
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs text-muted-foreground">COM থেকে</span>
                                        <div className="w-1 h-8 bg-orange-500 rounded"></div>
                                      </div>
                                    </div>
                                    
                                    {/* Buzzer */}
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/50">
                                      <div className="w-14 h-14 bg-orange-500/30 rounded-full flex items-center justify-center border-2 border-orange-500">
                                        <span className="text-2xl">🔔</span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold">SFM-27 বাজার</span>
                                        <p className="text-xs text-muted-foreground">DC 3-24V, ~100mA</p>
                                        <div className="flex gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">+ লাল তার</Badge>
                                          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-300">- কালো তার</Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* GND connection */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <div className="w-1 h-6 bg-gray-600 rounded"></div>
                                      <span>বাজারের - (কালো) → পাওয়ার সাপ্লাই GND</span>
                                    </div>
                                  </div>
                                  
                                  {/* Wire Legend */}
                                  <div className="mt-4 p-3 rounded-lg bg-background border">
                                    <p className="text-xs font-bold mb-2">🔌 তারের রঙ:</p>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-red-500 rounded"></div>
                                        <span className="text-xs">লাল = পাওয়ার + / বাজার +</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-gray-600 rounded"></div>
                                        <span className="text-xs">কালো = GND / বাজার -</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-purple-500 rounded"></div>
                                        <span className="text-xs">বেগুনি = GPIO 33 → IN3</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Summary Flow */}
                                <div className="bg-muted/30 p-3 border-t">
                                  <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">পাওয়ার +</span>
                                    <span>→</span>
                                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                                    <span className="text-muted-foreground">⟷</span>
                                    <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                                    <span>→</span>
                                    <span className="bg-orange-400 text-white px-2 py-1 rounded text-xs">বাজার +</span>
                                    <span>→</span>
                                    <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">GND</span>
                                  </div>
                                </div>
                              </div>

                              {/* Step by Step Connection */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold">🔧 ধাপে ধাপে কানেকশন:</p>
                                <div className="space-y-2">
                                  {sensor.buzzerWiringInfo.connectionSteps.map((step: { step: number; title: string; desc: string; color: string }, sIdx: number) => (
                                    <div key={sIdx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                        step.color === 'purple' ? 'bg-purple-500' :
                                        step.color === 'red' ? 'bg-red-500' :
                                        step.color === 'black' ? 'bg-gray-700' : 'bg-primary'
                                      } text-white text-xs font-bold shrink-0`}>
                                        {step.step}
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{step.title}</span>
                                        <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* How it Works */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border">
                                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    🔴 {sensor.buzzerWiringInfo.workingLogic.offState.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{sensor.buzzerWiringInfo.workingLogic.offState.desc}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                                  <p className="text-sm font-bold text-green-700 dark:text-green-300 mb-1">
                                    🟢 {sensor.buzzerWiringInfo.workingLogic.onState.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{sensor.buzzerWiringInfo.workingLogic.onState.desc}</p>
                                </div>
                              </div>

                              {/* Troubleshooting */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  🔍 সমস্যা সমাধান:
                                </p>
                                <div className="space-y-2">
                                  {sensor.buzzerWiringInfo.troubleshooting.map((item: { problem: string; solutions: string[] }, tIdx: number) => (
                                    <div key={tIdx} className="p-3 rounded-lg bg-muted/30 border">
                                      <p className="text-sm font-medium text-destructive mb-1">❌ {item.problem}</p>
                                      <ul className="space-y-0.5">
                                        {item.solutions.map((sol: string, solIdx: number) => (
                                          <li key={solIdx} className="text-xs text-muted-foreground">✓ {sol}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Components Needed */}
                              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                                <p className="text-sm font-bold flex items-center gap-2 mb-2">
                                  <ShoppingCart className="h-4 w-4 text-accent" />
                                  🛒 প্রয়োজনীয় উপাদান:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {sensor.buzzerWiringInfo.components.map((comp: { name: string; spec: string }, cIdx: number) => (
                                    <div key={cIdx} className="p-2 rounded bg-background border">
                                      <p className="text-sm font-medium">{comp.name}</p>
                                      <p className="text-xs text-muted-foreground">{comp.spec}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Fogger Solenoid Wiring Diagram Section */}
                          {'hasFoggerDiagram' in sensor && sensor.hasFoggerDiagram && 'foggerWiringInfo' in sensor && sensor.foggerWiringInfo && (
                            <div className="mt-6 space-y-4">
                              {/* Section Header */}
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/10 border-2 border-teal-500/30">
                                <Droplets className="h-5 w-5 text-teal-500" />
                                <div>
                                  <p className="font-bold text-sm text-teal-600 dark:text-teal-400">{sensor.foggerWiringInfo.title}</p>
                                  <p className="text-xs text-muted-foreground">অটোমেটিক কুলিং সিস্টেম সেটআপ</p>
                                </div>
                              </div>

                              {/* System Overview */}
                              <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                                <p className="text-sm font-bold text-teal-800 dark:text-teal-200 mb-2 flex items-center gap-2">
                                  <Info className="h-4 w-4" />
                                  {sensor.foggerWiringInfo.systemOverview.title}
                                </p>
                                <ul className="space-y-1">
                                  {sensor.foggerWiringInfo.systemOverview.points.map((point: string, pIdx: number) => (
                                    <li key={pIdx} className="text-xs text-teal-700 dark:text-teal-300 flex items-start gap-2">
                                      <span className="text-teal-500 mt-0.5">•</span>
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Automation Logic Box */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                                  <p className="text-sm font-bold text-green-700 dark:text-green-300 mb-1">🟢 চালু শর্ত</p>
                                  <p className="text-xs text-muted-foreground">{sensor.foggerWiringInfo.automationLogic.startCondition}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700">
                                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-1">🔄 চক্র</p>
                                  <p className="text-xs text-muted-foreground">{sensor.foggerWiringInfo.automationLogic.cycle}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
                                  <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">🔴 বন্ধ শর্ত</p>
                                  <p className="text-xs text-muted-foreground">{sensor.foggerWiringInfo.automationLogic.stopCondition}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">⚠️ সেফটি</p>
                                  <p className="text-xs text-muted-foreground">{sensor.foggerWiringInfo.automationLogic.safetyNote}</p>
                                </div>
                              </div>

                              {/* Visual Wiring Diagram */}
                              <div className="rounded-lg border-2 border-teal-500/30 overflow-hidden bg-background">
                                <div className="bg-teal-500/10 p-2 border-b border-teal-500/30">
                                  <p className="text-xs font-bold text-center">📊 ফগার সোলেনয়েড ওয়্যারিং ডায়াগ্রাম</p>
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-900">
                                  <div className="flex flex-col items-center gap-4">
                                    
                                    {/* 12V DC Adapter Source */}
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border-2 border-green-500/30">
                                      <Zap className="h-5 w-5 text-green-600" />
                                      <div className="text-center">
                                        <span className="text-sm font-bold">12V DC অ্যাডাপ্টার</span>
                                        <p className="text-xs text-muted-foreground">(সোলেনয়েড ভালভ পাওয়ার সোর্স)</p>
                                      </div>
                                    </div>
                                    
                                    {/* DC wires going down */}
                                    <div className="flex items-center gap-12">
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-10 bg-red-500 rounded"></div>
                                        <span className="text-xs text-red-500 font-bold">+ (পজিটিভ)</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-10 bg-gray-700 dark:bg-gray-400 rounded"></div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 font-bold">− (GND)</span>
                                      </div>
                                    </div>
                                    
                                    {/* Relay Module Section */}
                                    <div className="w-full max-w-sm">
                                      <div className="bg-teal-600 rounded-t-lg p-2 text-center">
                                        <span className="text-white text-xs font-bold">রিলে IN5 (GPIO 12 দ্বারা নিয়ন্ত্রিত)</span>
                                      </div>
                                      
                                      {/* Relay Terminals */}
                                      <div className="bg-gradient-to-b from-teal-500 to-teal-600 p-3 rounded-b-lg">
                                        <div className="grid grid-cols-3 gap-2">
                                          {/* NC Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="relative">
                                              <div className="w-10 h-10 bg-gray-400 rounded border-2 border-gray-500 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">NC</span>
                                              </div>
                                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">✕</span>
                                              </div>
                                            </div>
                                            <span className="text-xs text-white mt-1">খালি</span>
                                          </div>
                                          
                                          {/* COM Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                                            <div className="w-10 h-10 bg-red-500 rounded border-2 border-red-600 flex items-center justify-center ring-2 ring-yellow-400">
                                              <span className="text-xs font-bold text-white">COM</span>
                                            </div>
                                            <span className="text-xs text-white mt-1 font-bold">12V (+)</span>
                                            <span className="text-[10px] text-green-200">← এখানে</span>
                                          </div>
                                          
                                          {/* NO Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">NO</span>
                                            </div>
                                            <span className="text-xs text-white mt-1">ভালভ (+)</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Wire from NO to Solenoid */}
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs text-muted-foreground">NO থেকে</span>
                                        <div className="w-1 h-8 bg-teal-500 rounded"></div>
                                      </div>
                                    </div>
                                    
                                    {/* Solenoid Valve */}
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-teal-500/10 border-2 border-teal-500/50">
                                      <div className="w-14 h-14 bg-teal-500/30 rounded-full flex items-center justify-center border-2 border-teal-500">
                                        <span className="text-2xl">💦</span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold">সোলেনয়েড ভালভ</span>
                                        <p className="text-xs text-muted-foreground">12V DC, 1/2" প্লাস্টিক (NC)</p>
                                        <div className="flex gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">লাল (+) → NO</Badge>
                                          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-300">কালো (−) → GND</Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* GND connection */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <div className="w-1 h-6 bg-gray-600 rounded"></div>
                                      <span>ভালভের কালো (−) তার → 12V অ্যাডাপ্টারের GND (−)</span>
                                    </div>

                                    {/* Fogger Nozzles */}
                                    <div className="w-full p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                                      <p className="text-xs font-bold text-center mb-2">🔗 সোলেনয়েড আউটপুট → ফগার নজল</p>
                                      <div className="flex justify-center gap-3 flex-wrap">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                          <div key={n} className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center text-xs">💧</div>
                                            <span className="text-[10px] text-muted-foreground">নজল {n}</span>
                                          </div>
                                        ))}
                                        <span className="text-xs text-muted-foreground self-center">...</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Wire Legend */}
                                  <div className="mt-4 p-3 rounded-lg bg-background border">
                                    <p className="text-xs font-bold mb-2">🔌 তারের রঙ:</p>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-red-500 rounded"></div>
                                        <span className="text-xs">লাল = 12V (+)</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-gray-700 dark:bg-gray-400 rounded"></div>
                                        <span className="text-xs">কালো = GND (−)</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-teal-500 rounded"></div>
                                        <span className="text-xs">সায়ান = GPIO 12 → IN5</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Summary Flow */}
                                <div className="bg-muted/30 p-3 border-t">
                                  <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">12V (+)</span>
                                    <span>→</span>
                                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                                    <span className="text-muted-foreground">⟷</span>
                                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                                    <span>→</span>
                                    <span className="bg-teal-500 text-white px-2 py-1 rounded text-xs">ভালভ (+)</span>
                                    <span>→</span>
                                    <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs">GND (−)</span>
                                  </div>
                                </div>
                              </div>

                              {/* Step by Step Connection */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold">🔧 ধাপে ধাপে কানেকশন:</p>
                                <div className="space-y-2">
                                  {sensor.foggerWiringInfo.connectionSteps.map((step: { step: number; title: string; desc: string; color: string }, sIdx: number) => (
                                    <div key={sIdx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                        step.color === 'purple' ? 'bg-purple-500' :
                                        step.color === 'red' ? 'bg-red-500' :
                                        step.color === 'blue' ? 'bg-blue-500' :
                                        step.color === 'black' ? 'bg-gray-700' : 'bg-primary'
                                      } text-white text-xs font-bold shrink-0`}>
                                        {step.step}
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{step.title}</span>
                                        <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Parts Needed */}
                              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                                <p className="text-sm font-bold flex items-center gap-2 mb-2">
                                  <ShoppingCart className="h-4 w-4 text-accent" />
                                  🛒 প্রয়োজনীয় উপাদান:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {sensor.foggerWiringInfo.partsNeeded.map((part: { name: string; spec: string; price: string }, pIdx: number) => (
                                    <div key={pIdx} className="p-2 rounded bg-background border">
                                      <p className="text-sm font-medium">{part.name}</p>
                                      <p className="text-xs text-muted-foreground">{part.spec}</p>
                                      <p className="text-xs text-primary font-medium">{part.price}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Safety Warnings */}
                              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                <p className="text-sm font-bold flex items-center gap-2 mb-2 text-destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  ⚠️ সতর্কতা:
                                </p>
                                <ul className="space-y-1">
                                  {sensor.foggerWiringInfo.safetyWarnings.map((warning: string, wIdx: number) => (
                                    <li key={wIdx} className="text-xs text-destructive/80">{warning}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Troubleshooting */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  🔍 সমস্যা সমাধান:
                                </p>
                                <div className="space-y-2">
                                  {sensor.foggerWiringInfo.troubleshooting.map((item: { problem: string; solutions: string[] }, tIdx: number) => (
                                    <div key={tIdx} className="p-3 rounded-lg bg-muted/30 border">
                                      <p className="text-sm font-medium text-destructive mb-1">❌ {item.problem}</p>
                                      <ul className="space-y-0.5">
                                        {item.solutions.map((sol: string, solIdx: number) => (
                                          <li key={solIdx} className="text-xs text-muted-foreground">✓ {sol}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sprinkler Solenoid Wiring Diagram Section */}
                          {'hasSprinklerDiagram' in sensor && sensor.hasSprinklerDiagram && 'sprinklerWiringInfo' in sensor && sensor.sprinklerWiringInfo && (
                            <div className="mt-6 space-y-4">
                              {/* Section Header */}
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-500/10 border-2 border-sky-500/30">
                                <Droplets className="h-5 w-5 text-sky-500" />
                                <div>
                                  <p className="font-bold text-sm text-sky-600 dark:text-sky-400">{sensor.sprinklerWiringInfo.title}</p>
                                  <p className="text-xs text-muted-foreground">ছাদে পানি স্প্রে করে তাপমাত্রা কমায়</p>
                                </div>
                              </div>

                              {/* Visual Wiring Diagram */}
                              <div className="rounded-lg border-2 border-sky-500/30 overflow-hidden bg-background">
                                <div className="bg-sky-500/10 p-2 border-b border-sky-500/30">
                                  <p className="text-xs font-bold text-center">📊 স্প্রিংকলার DC সোলেনয়েড ওয়্যারিং ডায়াগ্রাম</p>
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-900">
                                  <div className="flex flex-col items-center gap-4">
                                    {/* 12V DC Adapter */}
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border-2 border-green-500/30">
                                      <Zap className="h-5 w-5 text-green-600" />
                                      <div className="text-center">
                                        <span className="text-sm font-bold">12V DC অ্যাডাপ্টার</span>
                                        <p className="text-xs text-muted-foreground">(স্প্রিংকলার সোলেনয়েড ভালভ পাওয়ার)</p>
                                      </div>
                                    </div>
                                    
                                    {/* DC wires */}
                                    <div className="flex items-center gap-12">
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-10 bg-red-500 rounded"></div>
                                        <span className="text-xs text-red-500 font-bold">+ (পজিটিভ)</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-10 bg-gray-700 dark:bg-gray-400 rounded"></div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 font-bold">− (GND)</span>
                                      </div>
                                    </div>
                                    
                                    {/* Relay Module */}
                                    <div className="w-full max-w-sm">
                                      <div className="bg-sky-600 rounded-t-lg p-2 text-center">
                                        <span className="text-white text-xs font-bold">রিলে IN7 (GPIO 15 দ্বারা নিয়ন্ত্রিত)</span>
                                      </div>
                                      <div className="bg-gradient-to-b from-sky-500 to-sky-600 p-3 rounded-b-lg">
                                        <div className="grid grid-cols-3 gap-2">
                                          <div className="flex flex-col items-center">
                                            <div className="relative">
                                              <div className="w-10 h-10 bg-gray-400 rounded border-2 border-gray-500 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">NC</span>
                                              </div>
                                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">✕</span>
                                              </div>
                                            </div>
                                            <span className="text-xs text-white mt-1">খালি</span>
                                          </div>
                                          <div className="flex flex-col items-center">
                                            <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                                            <div className="w-10 h-10 bg-red-500 rounded border-2 border-red-600 flex items-center justify-center ring-2 ring-yellow-400">
                                              <span className="text-xs font-bold text-white">COM</span>
                                            </div>
                                            <span className="text-xs text-white mt-1 font-bold">12V (+)</span>
                                          </div>
                                          <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">NO</span>
                                            </div>
                                            <span className="text-xs text-white mt-1">ভালভ (+)</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Wire to Solenoid */}
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs text-muted-foreground">NO থেকে</span>
                                        <div className="w-1 h-8 bg-sky-500 rounded"></div>
                                      </div>
                                    </div>
                                    
                                    {/* Solenoid Valve */}
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-sky-500/10 border-2 border-sky-500/50">
                                      <div className="w-14 h-14 bg-sky-500/30 rounded-full flex items-center justify-center border-2 border-sky-500">
                                        <span className="text-2xl">🚿</span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold">DC সোলেনয়েড ভালভ (স্প্রিংকলার)</span>
                                        <p className="text-xs text-muted-foreground">12V DC, 3/4" NC</p>
                                        <div className="flex gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">লাল (+) → NO</Badge>
                                          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-300">কালো (−) → GND</Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Sprinkler Heads */}
                                    <div className="w-full p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
                                      <p className="text-xs font-bold text-center mb-2">🔗 ভালভ আউটপুট → PVC পাইপ → স্প্রিংকলার হেড</p>
                                      <div className="flex justify-center gap-3 flex-wrap">
                                        {[1, 2, 3, 4, 5, 6].map((n) => (
                                          <div key={n} className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center text-xs">🚿</div>
                                            <span className="text-[10px] text-muted-foreground">হেড {n}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Summary Flow */}
                                <div className="bg-muted/30 p-3 border-t">
                                  <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">12V (+)</span>
                                    <span>→</span>
                                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                                    <span className="text-muted-foreground">⟷</span>
                                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                                    <span>→</span>
                                    <span className="bg-sky-500 text-white px-2 py-1 rounded text-xs">ভালভ (+)</span>
                                    <span>→</span>
                                    <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs">GND (−)</span>
                                  </div>
                                </div>
                              </div>

                              {/* Step by Step Connection */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold">🔧 ধাপে ধাপে কানেকশন:</p>
                                <div className="space-y-2">
                                  {sensor.sprinklerWiringInfo.connectionSteps.map((step: { step: number; title: string; desc: string; color: string }, sIdx: number) => (
                                    <div key={sIdx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                        step.color === 'purple' ? 'bg-purple-500' :
                                        step.color === 'red' ? 'bg-red-500' :
                                        step.color === 'blue' ? 'bg-blue-500' :
                                        step.color === 'black' ? 'bg-gray-700' :
                                        step.color === 'teal' ? 'bg-teal-500' : 'bg-primary'
                                      } text-white text-xs font-bold shrink-0`}>
                                        {step.step}
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{step.title}</span>
                                        <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Parts Needed */}
                              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                                <p className="text-sm font-bold flex items-center gap-2 mb-2">
                                  <ShoppingCart className="h-4 w-4 text-accent" />
                                  🛒 প্রয়োজনীয় উপাদান:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {sensor.sprinklerWiringInfo.partsNeeded.map((part: { name: string; spec: string; price: string }, pIdx: number) => (
                                    <div key={pIdx} className="p-2 rounded bg-background border">
                                      <p className="text-sm font-medium">{part.name}</p>
                                      <p className="text-xs text-muted-foreground">{part.spec}</p>
                                      <p className="text-xs text-primary font-medium">{part.price}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Troubleshooting */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  🔍 সমস্যা সমাধান:
                                </p>
                                <div className="space-y-2">
                                  {sensor.sprinklerWiringInfo.troubleshooting.map((item: { problem: string; solutions: string[] }, tIdx: number) => (
                                    <div key={tIdx} className="p-3 rounded-lg bg-muted/30 border">
                                      <p className="text-sm font-medium text-destructive mb-1">❌ {item.problem}</p>
                                      <ul className="space-y-0.5">
                                        {item.solutions.map((sol: string, solIdx: number) => (
                                          <li key={solIdx} className="text-xs text-muted-foreground">✓ {sol}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}


                          {sensor.hasAcWiring && sensor.acWiringInfo && (
                            <div className="mt-6 space-y-4">
                              {/* Section Header */}
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/30">
                                <Zap className="h-5 w-5 text-destructive" />
                                <div>
                                  <p className="font-bold text-sm text-destructive">{sensor.acWiringInfo.title}</p>
                                  <p className="text-xs text-muted-foreground">{sensor.acWiringInfo.description}</p>
                                </div>
                              </div>

                              {/* AC Wiring Visual Diagram - Code Based for Clarity */}
                              <div className="rounded-lg border-2 border-primary/30 overflow-hidden bg-background">
                                <div className="bg-primary/5 p-2 border-b border-primary/30">
                                  <p className="text-xs font-bold text-center">📊 রিলে AC লোড কানেকশন ডায়াগ্রাম (ফ্যান উদাহরণ)</p>
                                </div>
                                
                                {/* Visual Diagram */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900">
                                  {/* Main Wiring Diagram */}
                                  <div className="flex flex-col items-center gap-4">
                                    
                                    {/* AC Mains Source */}
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                                      <Zap className="h-5 w-5 text-destructive" />
                                      <span className="text-sm font-bold">AC 220V মেইন সাপ্লাই</span>
                                    </div>
                                    
                                    {/* Wires going down */}
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-8 bg-red-500 rounded"></div>
                                        <span className="text-xs text-red-500 font-bold">Live</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="w-1 h-8 bg-blue-500 rounded"></div>
                                        <span className="text-xs text-blue-500 font-bold">Neutral</span>
                                      </div>
                                    </div>
                                    
                                    {/* Relay Terminal Section */}
                                    <div className="w-full max-w-md">
                                      <div className="bg-blue-600 rounded-t-lg p-2 text-center">
                                        <span className="text-white text-xs font-bold">রিলে মডিউল (K1 - ফ্যান)</span>
                                      </div>
                                      
                                      {/* Screw Terminals */}
                                      <div className="bg-gradient-to-b from-blue-500 to-blue-600 p-3 rounded-b-lg">
                                        <div className="grid grid-cols-3 gap-2">
                                          {/* NC Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="relative">
                                              <div className="w-10 h-10 bg-gray-400 rounded border-2 border-gray-500 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">NC</span>
                                              </div>
                                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">✕</span>
                                              </div>
                                            </div>
                                            <span className="text-xs text-white mt-1">খালি</span>
                                            <span className="text-[10px] text-red-200">ব্যবহার নেই</span>
                                          </div>
                                          
                                          {/* COM Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                                            <div className="w-10 h-10 bg-red-500 rounded border-2 border-red-600 flex items-center justify-center ring-2 ring-yellow-400">
                                              <span className="text-xs font-bold text-white">COM</span>
                                            </div>
                                            <span className="text-xs text-white mt-1 font-bold">AC Live</span>
                                            <span className="text-[10px] text-green-200">← এখানে</span>
                                          </div>
                                          
                                          {/* NO Terminal */}
                                          <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">NO</span>
                                            </div>
                                            <div className="w-1 h-4 bg-black rounded mt-1"></div>
                                            <span className="text-xs text-white">লোড</span>
                                            <span className="text-[10px] text-green-200">ফ্যানে যাবে</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Connection to Load */}
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs text-foreground/70">NO থেকে</span>
                                        <div className="w-1 h-8 bg-black rounded"></div>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs text-foreground/70">সরাসরি</span>
                                        <div className="w-1 h-8 bg-blue-500 rounded"></div>
                                      </div>
                                    </div>
                                    
                                    {/* Fan/Load */}
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20 border-2 border-accent">
                                      <div className="w-10 h-10 bg-accent/30 rounded-full flex items-center justify-center">
                                        <span className="text-xl">🌀</span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold">ফ্যান / লাইট</span>
                                        <p className="text-xs text-muted-foreground">220V AC লোড</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Wire Legend */}
                                  <div className="mt-4 p-3 rounded-lg bg-background border">
                                    <p className="text-xs font-bold mb-2">🔌 তারের রঙ:</p>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-red-500 rounded"></div>
                                        <span className="text-xs">লাল = Live (Phase)</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-blue-500 rounded"></div>
                                        <span className="text-xs">নীল = Neutral</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-2 bg-black rounded"></div>
                                        <span className="text-xs">কালো = লোড</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Summary */}
                                <div className="bg-muted/30 p-3 border-t">
                                  <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">AC Live</span>
                                    <span>→</span>
                                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                                    <span className="text-muted-foreground">⟷</span>
                                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                                    <span>→</span>
                                    <span className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs">ফ্যান</span>
                                    <span>→</span>
                                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Neutral</span>
                                  </div>
                                  <p className="text-xs text-center text-muted-foreground mt-2">
                                    ⚡ রিলে ON হলে COM ↔ NO কানেক্ট হয় = লোড চালু | রিলে OFF হলে সার্কিট খোলা = লোড বন্ধ
                                  </p>
                                </div>
                              </div>

                              {/* Reference Image */}
                              <div className="rounded-lg border overflow-hidden">
                                <div className="bg-muted/50 p-2 border-b">
                                  <p className="text-xs font-medium text-center">📷 রেফারেন্স ডায়াগ্রাম</p>
                                </div>
                                <img 
                                  src={relayAcWiringDiagram} 
                                  alt="Relay NC COM NO Wiring Diagram" 
                                  className="w-full h-auto bg-white"
                                />
                              </div>

                              {/* Terminal Explanation */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold">📍 টার্মিনাল চিনুন (বাম থেকে ডান):</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {sensor.acWiringInfo.terminals.map((terminal, tIdx) => (
                                    <div key={tIdx} className={`p-3 rounded-lg border-2 ${tIdx === 1 ? 'border-primary bg-primary/5' : 'border-border'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-4 h-4 rounded-full ${terminal.color}`}></div>
                                        <span className="font-bold text-sm">{terminal.name}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-1">অবস্থান: {terminal.position}</p>
                                      <p className="text-sm font-medium text-primary">{terminal.useFor}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{terminal.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Step by Step Wiring */}
                              <div className="space-y-2">
                                <p className="text-sm font-bold">🔧 ধাপে ধাপে ওয়্যারিং (ফ্যান উদাহরণ):</p>
                                <div className="space-y-2">
                                  {sensor.acWiringInfo.wiringSteps.map((step, sIdx) => (
                                    <div key={sIdx} className={`flex items-start gap-3 p-3 rounded-lg ${sIdx === 3 ? 'bg-muted/30 border border-dashed border-muted-foreground/30' : 'bg-muted/50'}`}>
                                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${sIdx === 3 ? 'bg-muted-foreground/50' : 'bg-primary'} text-primary-foreground text-xs font-bold shrink-0`}>
                                        {step.step}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-sm">{step.title}</span>
                                          <Badge variant="secondary" className="text-xs">🔌 {step.wire}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{step.instruction}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Safety Warnings */}
                              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                                <p className="text-sm font-bold text-destructive flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  ⚠️ নিরাপত্তা সতর্কতা
                                </p>
                                <ul className="space-y-1">
                                  {sensor.acWiringInfo.safetyWarnings.map((warning, wIdx) => (
                                    <li key={wIdx} className="text-xs text-destructive/90">• {warning}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Circuit Summary */}
                              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                                <p className="text-sm font-bold flex items-center gap-2 mb-2">
                                  <Lightbulb className="h-4 w-4 text-accent" />
                                  💡 সার্কিট সারসংক্ষেপ
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm font-mono bg-background p-2 rounded">
                                  <span className="text-red-500">AC Live</span>
                                  <span>→</span>
                                  <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">COM</span>
                                  <span>⇋</span>
                                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">NO</span>
                                  <span>→</span>
                                  <span className="text-yellow-600">ফ্যান/লাইট</span>
                                  <span>→</span>
                                  <span className="text-blue-500">Neutral</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                  রিলে ON হলে COM ↔ NO কানেক্ট হয়, ফলে কারেন্ট প্রবাহিত হয়ে লোড চালু হয়।
                                </p>
                              </div>
                            </div>
                          )}

                          {/* MCB & Contactor Wiring Section */}
                          {'hasMcbContactorWiring' in sensor && sensor.hasMcbContactorWiring && 'mcbContactorInfo' in sensor && sensor.mcbContactorInfo && (() => {
                            const info = sensor.mcbContactorInfo as any;
                            return (
                              <div className="mt-6 space-y-4">
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/30">
                                  <Zap className="h-5 w-5 text-destructive" />
                                  <div>
                                    <p className="font-bold text-sm">{info.title}</p>
                                    <p className="text-xs text-muted-foreground">{info.description}</p>
                                  </div>
                                </div>

                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                  <p className="text-xs font-bold mb-2">🔧 প্রয়োজনীয় যন্ত্রাংশ:</p>
                                  <div className="space-y-2">
                                    {info.commonParts.map((part: any, pIdx: number) => (
                                      <div key={pIdx} className="flex items-start gap-2 text-xs">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                        <div>
                                          <span className="font-semibold">{part.name}</span>
                                          <span className="text-muted-foreground"> — {part.purpose}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Layer Wiring */}
                                <div className="rounded-lg border-2 border-amber-500/30 overflow-hidden">
                                  <div className="p-3 bg-amber-500/10">
                                    <p className="font-bold text-sm flex items-center gap-2">
                                      <Egg className="h-4 w-4" />
                                      {info.layerWiring.title}
                                    </p>
                                  </div>
                                  <div className="p-3 space-y-3">
                                    <div className="p-2 rounded bg-muted/80 overflow-x-auto">
                                      <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed">{info.layerWiring.diagram}</pre>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead><tr className="border-b"><th className="text-left py-1.5 px-1">চ্যানেল</th><th className="text-left py-1.5 px-1">ডিভাইস</th><th className="text-left py-1.5 px-1">MCB</th><th className="text-left py-1.5 px-1">কন্ট্যাক্টর</th></tr></thead>
                                        <tbody>
                                          {info.layerWiring.relays.map((r: any, rIdx: number) => (
                                            <tr key={rIdx} className="border-b border-border/50">
                                              <td className="py-1.5 px-1 font-mono text-primary">{r.ch}</td>
                                              <td className="py-1.5 px-1">{r.device}</td>
                                              <td className="py-1.5 px-1">{r.mcb}</td>
                                              <td className="py-1.5 px-1">{r.contactor ? '✅ হ্যাঁ' : '❌ না'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                                      <p className="text-xs font-bold mb-2">🔌 কন্ট্যাক্টর ওয়্যারিং স্টেপ (পাম্পের জন্য):</p>
                                      <div className="space-y-1.5">
                                        {info.layerWiring.contactorWiring.map((s: any, sIdx: number) => (
                                          <div key={sIdx} className="flex items-start gap-2 text-xs">
                                            <Badge variant="outline" className="text-[10px] shrink-0">{s.step}</Badge>
                                            <span>{s.instruction}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="p-2 rounded bg-accent/20 text-xs">
                                      <span className="font-semibold">কন্ট্যাক্টর সংখ্যা: {info.layerWiring.totalContactor}টি</span>
                                      <span className="text-muted-foreground"> — {info.layerWiring.contactorNote}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Broiler Wiring */}
                                <div className="rounded-lg border-2 border-orange-500/30 overflow-hidden">
                                  <div className="p-3 bg-orange-500/10">
                                    <p className="font-bold text-sm flex items-center gap-2">
                                      <Bird className="h-4 w-4" />
                                      {info.broilerWiring.title}
                                    </p>
                                  </div>
                                  <div className="p-3 space-y-3">
                                    <div className="p-2 rounded bg-muted/80 overflow-x-auto">
                                      <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed">{info.broilerWiring.diagram}</pre>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead><tr className="border-b"><th className="text-left py-1.5 px-1">চ্যানেল</th><th className="text-left py-1.5 px-1">ডিভাইস</th><th className="text-left py-1.5 px-1">MCB</th><th className="text-left py-1.5 px-1">কন্ট্যাক্টর</th></tr></thead>
                                        <tbody>
                                          {info.broilerWiring.relays.map((r: any, rIdx: number) => (
                                            <tr key={rIdx} className="border-b border-border/50">
                                              <td className="py-1.5 px-1 font-mono text-primary">{r.ch}</td>
                                              <td className="py-1.5 px-1">{r.device}</td>
                                              <td className="py-1.5 px-1">{r.mcb}</td>
                                              <td className="py-1.5 px-1">{r.contactor ? '✅ হ্যাঁ' : '❌ না'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                                      <p className="text-xs font-bold mb-2">🔌 কন্ট্যাক্টর ওয়্যারিং স্টেপ (পাম্পের জন্য):</p>
                                      <div className="space-y-1.5">
                                        {info.broilerWiring.contactorWiring.map((s: any, sIdx: number) => (
                                          <div key={sIdx} className="flex items-start gap-2 text-xs">
                                            <Badge variant="outline" className="text-[10px] shrink-0">{s.step}</Badge>
                                            <span>{s.instruction}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="p-2 rounded bg-accent/20 text-xs">
                                      <span className="font-semibold">কন্ট্যাক্টর সংখ্যা: {info.broilerWiring.totalContactor}টি</span>
                                      <span className="text-muted-foreground"> — {info.broilerWiring.contactorNote}</span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                                      <p className="font-semibold text-amber-700 dark:text-amber-400">⚠️ বড় ইন্ডাস্ট্রিয়াল ফ্যান (&gt;1HP) বা হাই-ওয়াটেজ হিটার (&gt;1000W) থাকলে:</p>
                                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                        <li>• ফ্যানের জন্য আলাদা কন্ট্যাক্টর (CH1 রিলে → কন্ট্যাক্টর কয়েল → ফ্যান)</li>
                                        <li>• হিটারের জন্য আলাদা কন্ট্যাক্টর (CH3 রিলে → কন্ট্যাক্টর কয়েল → হিটার)</li>
                                        <li>• এক্ষেত্রে মোট ২-৩টি কন্ট্যাক্টর প্রয়োজন হবে</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>

                                {/* Safety Warnings */}
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                  <p className="text-xs font-bold mb-2 text-destructive">⚠️ নিরাপত্তা সতর্কতা:</p>
                                  <ul className="space-y-1">
                                    {info.safetyWarnings.map((w: string, wIdx: number) => (
                                      <li key={wIdx} className="text-xs text-muted-foreground">{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Farm Type Relay Mapping Section */}
                          {sensor.hasFarmTypeMapping && sensor.farmTypeMapping && (
                            <div className="mt-6 space-y-4">
                              {/* Section Header */}
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
                                <Bird className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-bold text-sm">{sensor.farmTypeMapping.title}</p>
                                  <p className="text-xs text-muted-foreground">{sensor.farmTypeMapping.description}</p>
                                </div>
                              </div>

                              {/* Relay Cards */}
                              <div className="space-y-3">
                                {sensor.farmTypeMapping.relays.map((r, rIdx) => (
                                  <div key={rIdx} className="rounded-lg border-2 border-border overflow-hidden">
                                    {/* Relay Header */}
                                    <div className={`p-2 flex items-center justify-between ${r.shared ? 'bg-accent/20' : 'bg-primary/10'}`}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={r.shared ? "secondary" : "default"} className="text-xs font-mono">{r.relay}</Badge>
                                        <span className="text-xs font-mono text-muted-foreground">{r.gpio}</span>
                                      </div>
                                      {r.shared && <Badge variant="outline" className="text-[10px]">উভয় ফার্মে একই</Badge>}
                                    </div>

                                    {r.shared ? (
                                      /* Shared relay - single device */
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-lg">{r.sharedDevice?.split(' ')[0]}</span>
                                          <span className="font-medium text-sm">{r.sharedDevice}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{r.sharedNote}</p>
                                      </div>
                                    ) : (
                                      /* Dual-use relay - different per farm type */
                                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                        {/* Layer Column */}
                                        <div className="p-3 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Egg className="h-4 w-4 text-amber-500" />
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🥚 লেয়ার ফার্ম</span>
                                          </div>
                                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            <p className="font-medium text-sm">{r.layerDevice}</p>
                                          </div>
                                          <div className="text-xs text-muted-foreground space-y-1">
                                            <p className="font-medium text-foreground text-xs">⚙️ অটোমেশন লজিক:</p>
                                            <p>{r.layerAutomation}</p>
                                          </div>
                                        </div>

                                        {/* Broiler Column */}
                                        <div className="p-3 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Bird className="h-4 w-4 text-orange-500" />
                                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">🐔 ব্রয়লার ফার্ম</span>
                                          </div>
                                          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                            <p className="font-medium text-sm">{r.broilerDevice}</p>
                                          </div>
                                          <div className="text-xs text-muted-foreground space-y-1">
                                            <p className="font-medium text-foreground text-xs">⚙️ অটোমেশন লজিক:</p>
                                            <p>{r.broilerAutomation}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Important Note */}
                              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                <p className="text-sm font-bold flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  ⚠️ গুরুত্বপূর্ণ তথ্য
                                </p>
                                <ul className="space-y-1 text-xs text-muted-foreground">
                                   <li>• অ্যাপে ফার্ম টাইপ সিলেক্ট করলে ESP32 <strong>স্বয়ংক্রিয়ভাবে</strong> সঠিক সফটওয়্যার লজিক প্রয়োগ করে।</li>
                                   <li>• ৮-চ্যানেল রিলের সব ডিভাইস <strong>NO পোর্টে</strong> ফিজিক্যালি কানেক্ট করুন।</li>
                                   <li>• <strong>লেয়ার ফার্মে</strong> হিটার (IN4) সাধারণত অব্যবহৃত থাকে — সফটওয়্যার স্বয়ংক্রিয়ভাবে এড়িয়ে যায়।</li>
                                   <li>• <strong>ব্রয়লার ফার্মে</strong> হিটার (IN4) ব্রুডিং তাপমাত্রায় ব্যবহৃত হয়।</li>
                                   <li>• একই শেডে লেয়ার↔ব্রয়লার পরিবর্তন করলে শুধু অ্যাপ থেকে ফার্ম টাইপ বদলান — হার্ডওয়্যার একই থাকে।</li>
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Quick Reference Connection Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🔌 দ্রুত রেফারেন্স টেবিল</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1">কম্পোনেন্ট</th>
                        <th className="text-left py-2 px-1">পিন</th>
                        <th className="text-left py-2 px-1">ESP32</th>
                        <th className="text-left py-2 px-1">তার</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wiringConnections.map((conn, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-2 px-1 font-medium">{conn.component}</td>
                          <td className="py-2 px-1">{conn.pin}</td>
                          <td className="py-2 px-1 font-mono text-primary">{conn.esp32Pin}</td>
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-1">
                              <div className={`w-3 h-3 rounded-full ${conn.color}`}></div>
                              {conn.note && <span className="text-muted-foreground">({conn.note})</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Jumper Wire Types Guide - NEW SECTION */}
            <Card className="border-2 border-accent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cable className="h-4 w-4 text-accent" />
                  🔌 জাম্পার ওয়্যার চেনার গাইড
                </CardTitle>
                <p className="text-xs text-muted-foreground">Male-to-Male, Male-to-Female, Female-to-Female তার চেনার সহজ উপায়</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Visual comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {jumperWireTypes.map((wire, idx) => (
                      <div key={idx} className="p-3 rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors">
                        {/* Wire type header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${wire.color}`}></div>
                          <span className="font-bold text-sm">{wire.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{wire.typeBn}</p>
                        
                        {/* Visual representation */}
                        <div className="bg-muted/50 rounded-lg p-3 text-center mb-3">
                          <p className="text-2xl font-mono tracking-widest">{wire.visual}</p>
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>{wire.endA}</span>
                            <span>{wire.endB}</span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-xs font-medium mb-1">🔍 চেনার উপায়:</p>
                        <p className="text-xs text-muted-foreground mb-2">{wire.description}</p>
                        
                        {/* Usage */}
                        <p className="text-xs font-medium mb-1">✅ কখন ব্যবহার:</p>
                        <p className="text-xs text-muted-foreground mb-2">{wire.usage}</p>
                        
                        {/* Examples */}
                        <p className="text-xs font-medium mb-1">📌 উদাহরণ:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {wire.examples.map((ex, exIdx) => (
                            <li key={exIdx}>• {ex}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick identification tip */}
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <p className="text-sm font-bold flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      ⚡ দ্রুত চেনার টিপস
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">📍</span>
                        <div>
                          <p className="font-medium">Male (পিন/সুই)</p>
                          <p className="text-muted-foreground">ধাতব পিন বের হয়ে আছে - ব্রেডবোর্ড বা সকেটে ঢোকানো যায়</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⬜</span>
                        <div>
                          <p className="font-medium">Female (সকেট/গর্ত)</p>
                          <p className="text-muted-foreground">প্লাস্টিকের ভেতরে গর্ত - এতে পিন ঢোকানো যায়</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* FarmEye project recommendation */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-sm font-bold mb-2">🐔 FarmEye প্রজেক্টে কোনটা কিনবেন?</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      আমরা সাধারণত <strong>Male-to-Female (M-F)</strong> তার বেশি ব্যবহার করি কারণ:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✅ ESP32 এর পিনগুলো Male (পিন বের হয়ে আছে)</li>
                      <li>✅ বেশিরভাগ সেন্সর মডিউলেও Male পিন থাকে</li>
                      <li>✅ M-F তার দিয়ে সরাসরি সংযোগ করা যায়</li>
                    </ul>
                    <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                      <p className="font-medium">💡 সুপারিশ: ৪০ পিসের M-F + ২০ পিসের M-M মিশ্র সেট কিনুন (৳১৫০-২৫০)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">⚠️ অবশ্যই মনে রাখুন</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <span className="text-lg">🔴</span>
                    <div>
                      <p className="font-medium">DHT22 তে 3.3V দিন, 5V নয়!</p>
                      <p className="text-xs text-muted-foreground">5V দিলে সেন্সর নষ্ট হয়ে যেতে পারে</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <span className="text-lg">⏰</span>
                    <div>
                      <p className="font-medium">MQ-137 গ্যাস সেন্সর প্রথম ২৪ ঘন্টা গরম করুন</p>
                      <p className="text-xs text-muted-foreground">প্রিহিট ছাড়া সঠিক রিডিং পাওয়া যাবে না</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <span className="text-lg">🔌</span>
                    <div>
                      <p className="font-medium">সব GND একসাথে কানেক্ট করুন</p>
                      <p className="text-xs text-muted-foreground">কমন গ্রাউন্ড না থাকলে সেন্সর কাজ করবে না</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <span className="text-lg">⚡</span>
                    <div>
                      <p className="font-medium">12V 3A অ্যাডাপ্টার + LM2596 Buck Converter ব্যবহার করুন</p>
                      <p className="text-xs text-muted-foreground">12V → রিলে JD-VCC, LM2596 (5V সেট) → ESP32 VIN। জাম্পার খুলে দিন!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <span className="text-lg">🔃</span>
                    <div>
                      <p className="font-medium">ওয়াটার ফ্লো সেন্সরে তীর চিহ্ন অনুযায়ী পানির দিক ঠিক করুন</p>
                      <p className="text-xs text-muted-foreground">উল্টো লাগালে রিডিং পাওয়া যাবে না</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wiring Checklist */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  ওয়্যারিং চেকলিস্ট
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'ESP32 USB পোর্টে সংযুক্ত',
                    'সব VCC ও GND সঠিকভাবে সংযুক্ত',
                    'DHT22 তে 3.3V দেওয়া হয়েছে',
                    'অন্যান্য সেন্সরে 5V (VIN) দেওয়া হয়েছে',
                    'সব সেন্সরের GND একসাথে কমন করা হয়েছে',
                    'রিলে মডিউলের IN পিনগুলো সঠিক GPIO তে সংযুক্ত',
                    'কোনো তার লুজ বা খোলা নেই',
                    'পাওয়ার অন করার আগে সংযোগ দুইবার চেক করা হয়েছে',
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="mt-4 space-y-4">
            {/* ESP32 Code Generator - Interactive */}
            <ESP32CodeGenerator language="bn" />

            {/* Setup Steps Accordion */}
            <Accordion type="single" collapsible className="w-full">
              {setupSteps.map((step) => (
                <AccordionItem key={step.step} value={`step-${step.step}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <step.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">ধাপ {step.step}: {step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.titleEn}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="ml-11 space-y-2">
                      {step.tasks.map((task, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <p className="text-sm">{task}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* WiFi Config Code */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">📝 কোড কনফিগারেশন</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(wifiConfigCode, 'wifi')}
                  >
                    {copiedCode === 'wifi' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  {wifiConfigCode}
                </pre>
              </CardContent>
            </Card>

            {/* Download Buttons */}
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/esp32-industrial.ino', '_blank')}
              >
                <Cpu className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">ESP32 Industrial কোড ডাউনলোড (v8.0.0)</span>
                <Badge variant="secondary">Production</Badge>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/esp32-safety-engine.h', '_blank')}
              >
                <Zap className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">Safety Engine হেডার ফাইল</span>
                <Badge variant="secondary">Required</Badge>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/esp32-gsm-sms.ino', '_blank')}
              >
                <Wifi className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">GSM SMS সাপোর্ট সহ কোড</span>
                <Badge variant="secondary">Optional</Badge>
              </Button>
            </div>

            {/* API Docs Link */}
            <Button 
              className="w-full"
              onClick={() => navigate('/api-docs')}
            >
              API ডকুমেন্টেশন দেখুন
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
