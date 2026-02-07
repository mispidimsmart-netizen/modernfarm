import { useState } from 'react';
import { ArrowLeft, Cpu, Cable, Zap, Wifi, Settings, CheckCircle2, ShoppingCart, ExternalLink, Copy, Check, AlertTriangle, Info, Lightbulb, Thermometer, Droplets, Wind, Power, ToggleLeft } from 'lucide-react';
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
      { name: 'ESP32 DevKit V1', nameEn: 'ESP32 DevKit V1', quantity: 1, price: '৳৫৫০-৭৫০', priceRange: [550, 750], shop: 'টেকশপ বিডি, রোবটিক্স বিডি', essential: true },
      { name: 'USB কেবল (Micro USB)', nameEn: 'USB Cable', quantity: 1, price: '৳৮০-১৫০', priceRange: [80, 150], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
    ]
  },
  {
    category: 'সেন্সর',
    categoryEn: 'Sensors',
    items: [
      { name: 'DHT22/AM2302 (তাপমাত্রা ও আর্দ্রতা)', nameEn: 'DHT22 Temperature & Humidity', quantity: 1, price: '৳৩৫০-৪৫০', priceRange: [350, 450], shop: 'রোবটিক্স বিডি, বিডিস্টল', essential: true },
      { name: 'MQ-135 (অ্যামোনিয়া/গ্যাস সেন্সর)', nameEn: 'MQ-135 Gas Sensor', quantity: 1, price: '৳২০০-৩০০', priceRange: [200, 300], shop: 'টেকশপ বিডি', essential: true },
      { name: 'YF-S201 (ওয়াটার ফ্লো সেন্সর)', nameEn: 'Water Flow Sensor', quantity: 1, price: '৳২৫০-৩৫০', priceRange: [250, 350], shop: 'রোবটিক্স বিডি', essential: false },
    ]
  },
  {
    category: 'রিলে ও কন্ট্রোল',
    categoryEn: 'Relay & Control',
    items: [
      { name: '4-চ্যানেল রিলে মডিউল (5V)', nameEn: '4-Channel Relay Module', quantity: 1, price: '৳২৫০-৩৫০', priceRange: [250, 350], shop: 'টেকশপ বিডি', essential: true },
      { name: 'MOSFET মডিউল (IRF520) - LED ডিমিং', nameEn: 'MOSFET Module for LED Dimming', quantity: 1, price: '৳৮০-১২০', priceRange: [80, 120], shop: 'রোবটিক্স বিডি', essential: false },
    ]
  },
  {
    category: 'পাওয়ার সাপ্লাই',
    categoryEn: 'Power Supply',
    items: [
      { name: '5V 2A অ্যাডাপ্টার', nameEn: '5V 2A Power Adapter', quantity: 1, price: '৳১৫০-২৫০', priceRange: [150, 250], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: true },
      { name: 'ব্যাটারি ব্যাকআপ মডিউল (TP4056 + 18650)', nameEn: 'Battery Backup Module', quantity: 1, price: '৳৩০০-৫০০', priceRange: [300, 500], shop: 'রোবটিক্স বিডি', essential: false },
      { name: '18650 ব্যাটারি (3.7V 3000mAh)', nameEn: '18650 Battery', quantity: 2, price: '৳২৫০-৩৫০/পিস', priceRange: [500, 700], shop: 'টেকশপ বিডি', essential: false },
    ]
  },
  {
    category: 'তার ও সংযোগ',
    categoryEn: 'Wires & Connectors',
    items: [
      { name: 'জাম্পার ওয়্যার সেট (M-M, M-F, F-F)', nameEn: 'Jumper Wire Set', quantity: 1, price: '৳১৫০-২৫০', priceRange: [150, 250], shop: 'টেকশপ বিডি', essential: true },
      { name: 'ব্রেডবোর্ড (830 পয়েন্ট)', nameEn: 'Breadboard', quantity: 1, price: '৳১৫০-২০০', priceRange: [150, 200], shop: 'রোবটিক্স বিডি', essential: true },
      { name: 'টার্মিনাল ব্লক (2-পিন)', nameEn: 'Terminal Block', quantity: 5, price: '৳৫০-১০০', priceRange: [50, 100], shop: 'যেকোনো ইলেকট্রনিক্স দোকান', essential: false },
    ]
  },
  {
    category: 'GSM মডিউল (ঐচ্ছিক)',
    categoryEn: 'GSM Module (Optional)',
    items: [
      { name: 'SIM800L GSM মডিউল', nameEn: 'SIM800L GSM Module', quantity: 1, price: '৳৪৫০-৬০০', priceRange: [450, 600], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'GSM অ্যান্টেনা', nameEn: 'GSM Antenna', quantity: 1, price: '৳৫০-১০০', priceRange: [50, 100], shop: 'রোবটিক্স বিডি', essential: false },
      { name: 'SIM কার্ড (যেকোনো অপারেটর)', nameEn: 'SIM Card', quantity: 1, price: '৳৫০-১০০', priceRange: [50, 100], shop: 'মোবাইল দোকান', essential: false },
    ]
  },
  {
    category: 'এনক্লোজার ও অন্যান্য',
    categoryEn: 'Enclosure & Others',
    items: [
      { name: 'প্লাস্টিক এনক্লোজার বক্স', nameEn: 'Plastic Enclosure Box', quantity: 1, price: '৳২০০-৪০০', priceRange: [200, 400], shop: 'হার্ডওয়্যার দোকান', essential: false },
      { name: 'পুশ বাটন (ম্যানুয়াল ওভাররাইড)', nameEn: 'Push Button', quantity: 1, price: '৳২০-৫০', priceRange: [20, 50], shop: 'ইলেকট্রনিক্স দোকান', essential: false },
      { name: 'LED ইন্ডিকেটর (লাল, সবুজ, নীল)', nameEn: 'LED Indicators', quantity: 3, price: '৳৩০-৬০', priceRange: [30, 60], shop: 'ইলেকট্রনিক্স দোকান', essential: false },
    ]
  },
];

const wiringConnections = [
  { component: 'DHT22', pin: 'DATA', esp32Pin: 'GPIO 4', color: 'bg-green-500', note: '10K রেজিস্টর VCC ও DATA এর মধ্যে' },
  { component: 'DHT22', pin: 'VCC', esp32Pin: '3.3V', color: 'bg-red-500', note: '' },
  { component: 'DHT22', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'MQ-135', pin: 'AO', esp32Pin: 'GPIO 34', color: 'bg-yellow-500', note: 'এনালগ আউটপুট' },
  { component: 'MQ-135', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'MQ-135', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'YF-S201', pin: 'Signal', esp32Pin: 'GPIO 27', color: 'bg-blue-500', note: 'পালস আউটপুট' },
  { component: 'YF-S201', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'YF-S201', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'Relay Module', pin: 'IN1 (Fan)', esp32Pin: 'GPIO 26', color: 'bg-purple-500', note: 'ফ্যান কন্ট্রোল' },
  { component: 'Relay Module', pin: 'IN2 (Light)', esp32Pin: 'GPIO 25', color: 'bg-orange-500', note: 'লাইট কন্ট্রোল' },
  { component: 'Relay Module', pin: 'IN3 (Alarm/Buzzer)', esp32Pin: 'GPIO 33', color: 'bg-pink-500', note: 'SFM-27 বাজার কন্ট্রোল' },
  { component: 'Relay Module', pin: 'IN4 (Heater)', esp32Pin: 'GPIO 13', color: 'bg-red-400', note: 'হিটার কন্ট্রোল' },
  { component: 'Relay Module', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'Relay Module', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'Power Sensor', pin: 'Signal', esp32Pin: 'GPIO 35', color: 'bg-cyan-500', note: 'মেইন পাওয়ার ডিটেকশন' },
  { component: 'Manual Button', pin: 'Signal', esp32Pin: 'GPIO 32', color: 'bg-amber-500', note: 'ম্যানুয়াল ওভাররাইড বাটন' },
  { component: 'LED Dimmer', pin: 'PWM', esp32Pin: 'GPIO 25', color: 'bg-lime-500', note: 'PWM লাইটিং (MOSFET)' },
];

// Detailed step-by-step wiring guide for each sensor
const detailedWiringGuide = [
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
      { sensorPin: 'পিন ২: DATA (Signal)', esp32Pin: 'GPIO 15', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ সাদা তার: DHT22 #২ এর DATA → ESP32 এর GPIO 15 (আলাদা পিন!)', warning: null },
      { sensorPin: 'পিন ৪: GND (-)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: DHT22 #২ এর GND → ESP32 এর GND (প্রথমটির সাথে শেয়ার করা যায়)', warning: null },
    ],
    extraNote: 'বড় শেডে দুই প্রান্তে দুটি সেন্সর লাগালে গড় তাপমাত্রা পাওয়া যায়।',
    resistorNote: '📍 10K পুল-আপ রেজিস্টর: DATA (GPIO 15) ↔ VCC (3.3V)',
    tips: ['শেডের এক প্রান্তে প্রথম এবং অপর প্রান্তে দ্বিতীয় সেন্সর লাগান'],
  },
  {
    id: 'mq137',
    name: 'MQ-137 অ্যামোনিয়া/গ্যাস সেন্সর',
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
    extraNote: '⚠️ প্রথমবার চালু করার পর ২৪-৪৮ ঘন্টা "প্রিহিট/বার্ন-ইন" করতে হবে। এই সময় সেন্সর গরম থাকবে এবং রিডিং স্থিতিশীল হতে সময় লাগবে। চালু রাখুন, বন্ধ করবেন না!',
    resistorNote: null,
    tips: ['মাটি থেকে ১-২ ফুট উচ্চতায় লাগান (অ্যামোনিয়া ভারী তাই নিচে জমে)', 'বাতাসের চলাচল আছে এমন জায়গায় রাখুন'],
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
      { sensorPin: 'Signal/Pulse (হলুদ তার)', esp32Pin: 'GPIO 27', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: ওয়াটার সেন্সর থেকে আসা হলুদ/সাদা তার → ESP32 এর GPIO 27 (পালস ইনপুট)', warning: null },
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
    name: '৪-চ্যানেল রিলে মডিউল',
    nameEn: '4-Channel Relay Module',
    icon: ToggleLeft,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    pins: [
      { sensorPin: 'VCC (পাওয়ার)', esp32Pin: '5V (VIN)', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: রিলে মডিউল এর VCC → ESP32 এর VIN (5V)', warning: null },
      { sensorPin: 'GND (গ্রাউন্ড)', esp32Pin: 'GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: রিলে মডিউল এর GND → ESP32 এর GND', warning: null },
      { sensorPin: 'IN1 (ফ্যান কন্ট্রোল)', esp32Pin: 'GPIO 26', wireColor: 'সাদা', wireNameEn: 'WHITE', instruction: '⚪ সাদা তার: রিলে IN1 → ESP32 এর GPIO 26 (🌀 ফ্যান)', warning: null },
      { sensorPin: 'IN2 (লাইট কন্ট্রোল)', esp32Pin: 'GPIO 25', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 সবুজ তার: রিলে IN2 → ESP32 এর GPIO 25 (💡 লাইট/PWM)', warning: null },
      { sensorPin: 'IN3 (অ্যালার্ম/বাজার)', esp32Pin: 'GPIO 33', wireColor: 'বেগুনি', wireNameEn: 'PURPLE', instruction: '🟣 বেগুনি তার: রিলে IN3 → ESP32 এর GPIO 33 (🔔 SFM-27 বাজার)', warning: null },
      { sensorPin: 'IN4 (হিটার কন্ট্রোল)', esp32Pin: 'GPIO 13', wireColor: 'নীল', wireNameEn: 'BLUE', instruction: '🔵 নীল তার: রিলে IN4 → ESP32 এর GPIO 13 (🔥 হিটার)', warning: null },
    ],
    extraNote: '⚙️ রিলে Active LOW - মানে ESP32 থেকে LOW সিগন্যাল দিলে রিলে ON হয়, HIGH দিলে OFF হয়।',
    resistorNote: null,
    tips: ['প্রতিটি রিলে NO (Normally Open) ও COM পিনে ফ্যান/লাইটের তার লাগান', 'SFM-27 বাজারের জন্য রিলে IN3 এর COM-এ বাজারের +, বাহ্যিক পাওয়ার সোর্সে NO লাগান', 'হাই পাওয়ার ডিভাইস (২০০০W+) এর জন্য এক্সটারনাল কন্ট্যাক্টর ব্যবহার করুন'],
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
    id: 'buzzer',
    name: 'SFM-27 বাজার (অ্যালার্ম সাইরেন)',
    nameEn: 'SFM-27 Buzzer (Alarm Siren)',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    pins: [
      { sensorPin: '+ পিন (লাল তার)', esp32Pin: 'Relay IN3 COM', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 লাল তার: SFM-27 এর + তার → রিলে IN3 এর COM (Common) পোর্টে', warning: 'সরাসরি ESP32 তে লাগাবেন না! রিলে দিয়ে কন্ট্রোল করতে হবে।' },
      { sensorPin: '- পিন (কালো তার)', esp32Pin: 'পাওয়ার সাপ্লাই GND', wireColor: 'কালো', wireNameEn: 'BLACK', instruction: '⚫ কালো তার: SFM-27 এর - তার → পাওয়ার সাপ্লাই এর GND (12V/24V সাপ্লাই)', warning: null },
      { sensorPin: 'পাওয়ার সোর্স +', esp32Pin: 'Relay IN3 NO', wireColor: 'লাল', wireNameEn: 'RED', instruction: '🔴 পাওয়ার: 12V/24V সাপ্লাইয়ের + → রিলে IN3 এর NO (Normally Open) পোর্টে', warning: null },
    ],
    extraNote: '⚡ SFM-27 বাজার (DC 3-24V, ~100mA+) সরাসরি ESP32 GPIO তে চালানো যাবে না কারণ এটি বেশি কারেন্ট টানে। তাই রিলে মডিউল (IN3) দিয়ে কন্ট্রোল করতে হবে।',
    resistorNote: '📍 রিলে IN3 → GPIO 33 (ফার্মওয়্যারে সেট করা আছে)',
    tips: ['রিলে ON হলে বাজার বাজবে, OFF হলে বন্ধ হবে', 'জরুরি অবস্থায় (তাপমাত্রা বেশি, পাওয়ার অফ) স্বয়ংক্রিয় অ্যালার্ম বাজবে', 'পৃথক 12V বা 24V পাওয়ার সাপ্লাই ব্যবহার করুন (বাজারের ভোল্টেজ অনুযায়ী)'],
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
      { sensorPin: 'TXD (ট্রান্সমিট)', esp32Pin: 'GPIO 16 (RX2)', wireColor: 'সবুজ', wireNameEn: 'GREEN', instruction: '🟢 সবুজ তার: SIM800L এর TXD → ESP32 এর GPIO 16 (RX2) - ক্রস কানেকশন!', warning: null },
      { sensorPin: 'RXD (রিসিভ)', esp32Pin: 'GPIO 17 (TX2)', wireColor: 'হলুদ', wireNameEn: 'YELLOW', instruction: '🟡 হলুদ তার: SIM800L এর RXD → ESP32 এর GPIO 17 (TX2) - ক্রস কানেকশন!', warning: null },
    ],
    extraNote: '⚠️ এই মডিউলের জন্য পৃথক 3.7V-4.2V 2A পাওয়ার সোর্স লাগবে (18650 ব্যাটারি + TP4056 চার্জার)। ESP32 থেকে পাওয়ার দিলে কাজ করবে না এবং ESP32 ক্ষতিগ্রস্ত হতে পারে!',
    resistorNote: '📍 RXD পিনে ভোল্টেজ ডিভাইডার প্রয়োজন হতে পারে (1K + 2K রেজিস্টর) কারণ SIM800L ৩.৩V লজিক এবং ESP32 থেকে সরাসরি সিগন্যাল ক্ষতি করতে পারে।',
    tips: ['সিম কার্ড ঢোকানোর আগে পাওয়ার বন্ধ রাখুন', 'নেটওয়ার্ক পেতে ১-২ মিনিট সময় লাগে - LED ব্লিংক দেখুন', 'সিম কার্ডে ব্যালেন্স আছে কিনা নিশ্চিত করুন'],
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
      'পাওয়ার সাপ্লাই সংযোগ করুন (5V 2A)',
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
      'esp32-code.ino ফাইল খুলুন',
      'WiFi SSID ও পাসওয়ার্ড দিন',
      'Device Token দিন (অ্যাপ থেকে কপি করুন)',
      'API URL ঠিক আছে কিনা চেক করুন',
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
      'Smart Layer Farm অ্যাপে লগইন করুন',
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

  const wifiConfigCode = `// WiFi কনফিগারেশন
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// API কনফিগারেশন  
const char* apiUrl = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";
const char* deviceToken = "YOUR_DEVICE_TOKEN"; // অ্যাপ থেকে কপি করুন`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">ইনস্টলেশন গাইড</h1>
            <p className="text-xs text-muted-foreground">Installation Guide</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Quick Summary */}
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
│                    ESP32 DevKit V1                       │
│                                                          │
│  সেন্সর ইনপুট (বাম পাশে):                                │
│  ─────────────────────────────                           │
│  DHT22 #1 DATA ──────────▶ GPIO 4  (তাপমাত্রা/আর্দ্রতা) │
│  DHT22 #2 DATA ──────────▶ GPIO 15 (২য় সেন্সর)          │
│  MQ-137 AO ──────────────▶ GPIO 34 (অ্যামোনিয়া)        │
│  YF-S201 Signal ─────────▶ GPIO 27 (ওয়াটার ফ্লো)       │
│  ZMPT101B OUT ───────────▶ GPIO 35 (পাওয়ার মনিটর)      │
│                                                          │
│  রিলে আউটপুট (ডান পাশে):                                │
│  ─────────────────────────                               │
│  GPIO 26 ────────────────▶ Relay IN1 (ফ্যান)            │
│  GPIO 25 ────────────────▶ Relay IN2 (লাইট/PWM)         │
│  GPIO 32 ────────────────▶ Relay IN3 (হিটার)            │
│  GPIO 33 ────────────────▶ Relay IN4 (অ্যালার্ম)        │
│  GPIO 12 ────────────────▶ Piezo Buzzer (+)             │
│                                                          │
│  GSM মডিউল (ঐচ্ছিক):                                    │
│  ─────────────────────────                               │
│  GPIO 16 (RX2) ──────────▶ SIM800L TXD                  │
│  GPIO 17 (TX2) ──────────▶ SIM800L RXD                  │
│                                                          │
│  পাওয়ার:                                                │
│  ─────────                                               │
│  3.3V ───────────────────▶ DHT22 VCC (শুধু DHT22)       │
│  5V (VIN) ───────────────▶ অন্যান্য সেন্সর VCC          │
│  GND ────────────────────▶ সব GND একসাথে                │
│  পৃথক 4.2V ──────────────▶ SIM800L VCC (2A প্রয়োজন)    │
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

                          {/* AC Wiring Section for Relay Module */}
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
                      <p className="font-medium">পাওয়ার সাপ্লাই কমপক্ষে 5V 2A হতে হবে</p>
                      <p className="text-xs text-muted-foreground">কম পাওয়ারে ESP32 রিস্টার্ট হতে থাকবে</p>
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
                onClick={() => window.open('/esp32-code.ino', '_blank')}
              >
                <Cpu className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">মূল ESP32 কোড ডাউনলোড</span>
                <Badge variant="secondary">Basic</Badge>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/esp32-failsafe.ino', '_blank')}
              >
                <Zap className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">ফেইলসেফ সাপোর্ট সহ কোড</span>
                <Badge variant="secondary">Advanced</Badge>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/esp32-gsm-sms.ino', '_blank')}
              >
                <Wifi className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">GSM SMS সাপোর্ট সহ কোড</span>
                <Badge variant="secondary">Pro</Badge>
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
