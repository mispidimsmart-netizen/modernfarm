import { Cable, Zap, Settings, CheckCircle2, ShoppingCart, Check, AlertTriangle, Info, Lightbulb, Droplets, Power, Bird, Egg, Fan } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TabsContent } from '@/components/ui/tabs';
import { jumperWireTypes, wiringConnections, detailedWiringGuide, wiringCategories } from '@/data/installationGuide';
import wiringDiagram from '@/assets/esp32-wiring-diagram.png';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';
import capacitorWiringDiagram from '@/assets/esp32-capacitor-wiring.png';
import { InstallationV10WiringNotice } from '@/components/installation/InstallationV10Updates';
import { LDRInstallationGuide } from '@/components/lighting/LDRInstallationGuide';
import { BuzzerWiringSection } from '@/components/installation/wiring/BuzzerWiringSection';
import { FoggerWiringSection } from '@/components/installation/wiring/FoggerWiringSection';
import { SprinklerWiringSection } from '@/components/installation/wiring/SprinklerWiringSection';
import { AcWiringSection } from '@/components/installation/wiring/AcWiringSection';
import { McbContactorSection } from '@/components/installation/wiring/McbContactorSection';
import { FarmTypeMappingSection } from '@/components/installation/wiring/FarmTypeMappingSection';

export function InstallationWiringTab() {
  return (
    <TabsContent value="wiring" className="mt-4 space-y-4">
      <InstallationV10WiringNotice />
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
            loading="lazy"
            decoding="async"
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
            {wiringCategories.map((cat) => {
              const sensors = cat.sensorIds
                .map((sid) => detailedWiringGuide.find((s) => s.id === sid))
                .filter((s): s is typeof detailedWiringGuide[number] => Boolean(s));
              if (sensors.length === 0) return null;
              const CatIcon = cat.icon;
              return (
                <AccordionItem key={cat.id} value={cat.id}>
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${cat.bgColor} flex items-center justify-center`}>
                        <CatIcon className={`h-5 w-5 ${cat.color}`} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">{cat.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {cat.nameEn} · {sensors.length} বিকল্প/ডিভাইস
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <Accordion type="single" collapsible className="w-full border-l-2 border-primary/20 pl-3 ml-2">
            {sensors.map((sensor, idx) => (
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
                    {/* Quick pin-out chart (compact) */}
                    <div className={`rounded-lg border-2 ${sensor.bgColor} border-dashed p-2.5`}>
                      <p className="text-[11px] font-semibold mb-2 flex items-center gap-1">
                        <Cable className={`h-3 w-3 ${sensor.color}`} />
                        📍 দ্রুত পিন-আউট চার্ট ({sensor.pins.length} পিন)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] font-mono">
                          <thead>
                            <tr className="border-b border-border/60 text-muted-foreground">
                              <th className="text-left py-1 pr-2 font-semibold">#</th>
                              <th className="text-left py-1 pr-2 font-semibold">{sensor.nameEn.split(' ')[0]} পিন</th>
                              <th className="text-center py-1 px-1">→</th>
                              <th className="text-left py-1 pr-2 font-semibold">ESP32 / টার্গেট</th>
                              <th className="text-left py-1 font-semibold">তার</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sensor.pins.map((pin, i) => (
                              <tr key={i} className="border-b border-border/30 last:border-0">
                                <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
                                <td className="py-1 pr-2 font-semibold">{pin.sensorPin}</td>
                                <td className="py-1 px-1 text-center text-primary">→</td>
                                <td className="py-1 pr-2 text-primary">{pin.esp32Pin}</td>
                                <td className="py-1 text-muted-foreground">
                                  {pin.wireColor && pin.wireColor !== '-' ? `🔌 ${pin.wireNameEn || pin.wireColor}` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

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
                              loading="lazy"
                              decoding="async"
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
                      <BuzzerWiringSection info={sensor.buzzerWiringInfo} />
                    )}
                    {/* Fogger Solenoid Wiring Diagram Section */}
                    {'hasFoggerDiagram' in sensor && sensor.hasFoggerDiagram && 'foggerWiringInfo' in sensor && sensor.foggerWiringInfo && (
                      <FoggerWiringSection info={sensor.foggerWiringInfo} />
                    )}
                    {/* Sprinkler Solenoid Wiring Diagram Section */}
                    {'hasSprinklerDiagram' in sensor && sensor.hasSprinklerDiagram && 'sprinklerWiringInfo' in sensor && sensor.sprinklerWiringInfo && (
                      <SprinklerWiringSection info={sensor.sprinklerWiringInfo} />
                    )}

                    {sensor.hasAcWiring && sensor.acWiringInfo && (
                      <AcWiringSection info={sensor.acWiringInfo} />
                    )}
                    {/* MCB & Contactor Wiring Section */}
                    {'hasMcbContactorWiring' in sensor && sensor.hasMcbContactorWiring && 'mcbContactorInfo' in sensor && sensor.mcbContactorInfo && (
                      <McbContactorSection info={sensor.mcbContactorInfo as any} />
                    )}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
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

      {/* 🔆 LDR (আলো সেন্সর) ইনস্টলেশন গাইড */}
      <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            🔆 LDR আলো সেন্সর ইনস্টলেশন
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ঐচ্ছিক — শুধু স্মার্ট লাইটিং অটোমেশন চালু করতে চাইলে যোগ করুন
          </p>
        </CardHeader>
        <CardContent>
          <LDRInstallationGuide />
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
  );
}
