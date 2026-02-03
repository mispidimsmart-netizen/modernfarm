import { useState } from 'react';
import { ArrowLeft, Cpu, Cable, Zap, Wifi, Settings, CheckCircle2, ShoppingCart, ExternalLink, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';

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
  { component: 'Relay Module', pin: 'IN3 (Alarm)', esp32Pin: 'GPIO 33', color: 'bg-pink-500', note: 'অ্যালার্ম কন্ট্রোল' },
  { component: 'Relay Module', pin: 'VCC', esp32Pin: '5V (VIN)', color: 'bg-red-500', note: '' },
  { component: 'Relay Module', pin: 'GND', esp32Pin: 'GND', color: 'bg-gray-700', note: '' },
  { component: 'Power Sensor', pin: 'Signal', esp32Pin: 'GPIO 35', color: 'bg-cyan-500', note: 'মেইন পাওয়ার ডিটেকশন' },
  { component: 'Manual Button', pin: 'Signal', esp32Pin: 'GPIO 32', color: 'bg-amber-500', note: 'ম্যানুয়াল ওভাররাইড বাটন' },
  { component: 'LED Dimmer', pin: 'PWM', esp32Pin: 'GPIO 25', color: 'bg-lime-500', note: 'PWM লাইটিং (MOSFET)' },
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
            {/* Visual Diagram */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📐 ওয়্যারিং ডায়াগ্রাম</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs font-mono whitespace-pre text-foreground">
{`
                    ┌─────────────────────────────────┐
                    │         ESP32 DevKit            │
                    │                                 │
   DHT22 ──────────▶│ GPIO 4  (Temperature/Humidity) │
   MQ-135 ─────────▶│ GPIO 34 (Ammonia - Analog)     │
   YF-S201 ────────▶│ GPIO 27 (Water Flow)           │
   Power Sense ────▶│ GPIO 35 (Mains Detection)      │
   Manual Button ──▶│ GPIO 32 (Override Button)      │
                    │                                 │
                    │ GPIO 26 ─────────────▶ Relay IN1 (Fan)
                    │ GPIO 25 ─────────────▶ Relay IN2 (Light)
                    │ GPIO 33 ─────────────▶ Relay IN3 (Alarm)
                    │                                 │
                    │ 3.3V ────────────────▶ DHT22 VCC
                    │ 5V (VIN) ────────────▶ Sensors VCC
                    │ GND ─────────────────▶ All GND
                    └─────────────────────────────────┘
`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Connection Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🔌 পিন কানেকশন টেবিল</CardTitle>
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

            {/* Important Notes */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-600">⚠️ গুরুত্বপূর্ণ নোট</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• DHT22 এর DATA পিনে 10K রেজিস্টর VCC এর সাথে পুল-আপ করুন</p>
                <p>• MQ-135 সেন্সর প্রথম ২৪ ঘন্টা প্রিহিট করতে হবে সঠিক রিডিং এর জন্য</p>
                <p>• রিলে মডিউল Active LOW - GPIO LOW = Relay ON</p>
                <p>• পাওয়ার সাপ্লাই কমপক্ষে 2A হতে হবে</p>
                <p>• সব GND একসাথে কমন করুন</p>
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
