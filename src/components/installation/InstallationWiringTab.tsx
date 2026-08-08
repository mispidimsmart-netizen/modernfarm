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
                            loading="lazy"
                            decoding="async"
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

                          {/* Detailed Contactor Installation Guide */}
                          {info.contactorDetailGuide && (() => {
                            const guide = info.contactorDetailGuide;
                            return (
                              <div className="space-y-4">
                                {/* Section Title */}
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
                                  <Zap className="h-5 w-5 text-primary" />
                                  <p className="font-bold text-sm">{guide.title}</p>
                                </div>

                                {/* What is Contactor */}
                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                  <p className="text-xs font-bold mb-2">{guide.whatIs.title}</p>
                                  <ul className="space-y-1.5">
                                    {guide.whatIs.points.map((p: string, i: number) => (
                                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                        <span>{p}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* When Needed */}
                                <div className="p-3 rounded-lg border border-border space-y-3">
                                  <p className="text-xs font-bold">{guide.whenNeeded.title}</p>
                                  <div>
                                    <p className="text-xs font-semibold text-destructive mb-1.5">✅ কন্ট্যাক্টর লাগবে:</p>
                                    <div className="space-y-1.5">
                                      {guide.whenNeeded.needed.map((item: any, i: number) => (
                                        <div key={i} className="p-2 rounded bg-destructive/5 border border-destructive/20 text-xs">
                                          <span className="font-semibold">{item.device}</span>
                                          <span className="text-muted-foreground"> — {item.condition}</span>
                                          <p className="text-muted-foreground mt-0.5">💡 {item.reason}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-primary mb-1.5">❌ কন্ট্যাক্টর লাগবে না:</p>
                                    <ul className="space-y-1">
                                      {guide.whenNeeded.notNeeded.map((item: string, i: number) => (
                                        <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {/* Parts Identification */}
                                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                                  <p className="text-xs font-bold">{guide.partsIdentification.title}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {guide.partsIdentification.parts.map((part: any, i: number) => (
                                      <div key={i} className="p-2 rounded bg-background border border-border text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span>{part.color}</span>
                                          <span className="font-bold font-mono">{part.name}</span>
                                        </div>
                                        <p className="text-muted-foreground mt-0.5">📍 {part.location}</p>
                                        <p className="text-muted-foreground">→ {part.purpose}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Step by Step Wiring */}
                                <div className="space-y-3">
                                  <p className="text-xs font-bold">{guide.wiringSteps.title}</p>
                                  <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs font-semibold text-destructive">
                                    {guide.wiringSteps.warning}
                                  </div>
                                  {guide.wiringSteps.steps.map((step: any, sIdx: number) => (
                                    <div key={sIdx} className="rounded-lg border-2 border-border overflow-hidden">
                                      <div className="p-2.5 bg-primary/10 flex items-center gap-2">
                                        <Badge className="text-xs">{step.step}</Badge>
                                        <span className="text-xs font-bold">{step.title}</span>
                                      </div>
                                      <div className="p-3 space-y-2">
                                        <p className="text-xs text-muted-foreground">{step.description}</p>
                                        <div className="space-y-2">
                                          {step.wires.map((w: any, wIdx: number) => (
                                            <div key={wIdx} className="p-2 rounded bg-muted/50 border border-border text-xs">
                                              <div className="flex flex-wrap items-center gap-1">
                                                <span className="font-mono text-primary">{w.from}</span>
                                                <span>→</span>
                                                <span className="font-mono text-primary">{w.to}</span>
                                                {w.wire && <Badge variant="outline" className="text-[10px]">{w.wire}</Badge>}
                                              </div>
                                              <p className="text-muted-foreground mt-1">{w.note}</p>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="p-2 rounded bg-primary/5 text-xs font-semibold text-primary">
                                          {step.result}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Full Wiring Diagram */}
                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                  <p className="text-xs font-bold mb-2">{guide.fullDiagram.title}</p>
                                  <div className="p-3 rounded bg-background overflow-x-auto">
                                    <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed text-foreground">{guide.fullDiagram.diagram}</pre>
                                  </div>
                                </div>

                                {/* Common Mistakes */}
                                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                                  <p className="text-xs font-bold text-destructive">{guide.commonMistakes.title}</p>
                                  <div className="space-y-2">
                                    {guide.commonMistakes.mistakes.map((m: any, mIdx: number) => (
                                      <div key={mIdx} className="p-2 rounded bg-background border border-border text-xs">
                                        <p className="font-semibold text-destructive">❌ {m.mistake}</p>
                                        <p className="text-muted-foreground">⚠️ সমস্যা: {m.problem}</p>
                                        <p className="text-primary">✅ সমাধান: {m.solution}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Testing Steps */}
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                                  <p className="text-xs font-bold">{guide.testingSteps.title}</p>
                                  <div className="space-y-1.5">
                                    {guide.testingSteps.steps.map((s: any, sIdx: number) => (
                                      <div key={sIdx} className="flex items-start gap-2 text-xs">
                                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{s.step}</Badge>
                                        <span className="text-muted-foreground">{s.action}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

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
