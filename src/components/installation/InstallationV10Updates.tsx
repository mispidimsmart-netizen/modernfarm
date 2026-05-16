import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';

/**
 * Additive v10 update notices for Installation Guide tabs.
 * Injected at the TOP of Parts / Wiring / Setup tabs.
 *
 * Source of truth:
 *   - public/esp32-phase9-sensors.ino       (Phase 9 firmware + pin map)
 *   - public/esp32-unified.ino              (relay GPIO lock)
 *   - mem://hardware/esp32-specs            (board variant, relay map)
 *   - mem://architecture/safety-invariants  (8 hardware invariants)
 *
 * Legacy v8 cards below remain unchanged (additive — no regression).
 */

// ─────────────────────────── PARTS TAB ───────────────────────────
export function InstallationV10PartsNotice() {
  const phase9Parts = [
    {
      name: 'SHT31 (Precise Temp + Humidity, I²C 0x44)',
      nameEn: 'SHT31 — replaces DHT22 for ±0.2°C accuracy',
      price: '৳৪৫০-৬৫০',
      shop: 'টেকশপ বিডি, AliExpress',
      pin: 'SDA=GPIO 16, SCL=GPIO 17',
      tier: 'Tier 1 (Recommended)',
    },
    {
      name: 'BH1750 (Lux Light Sensor, I²C 0x23)',
      nameEn: 'BH1750 — replaces LDR for accurate lux',
      price: '৳১৮০-২৮০',
      shop: 'রোবটিক্স বিডি',
      pin: 'SDA=GPIO 16, SCL=GPIO 17 (shared I²C)',
      tier: 'Tier 1 (Recommended)',
    },
    {
      name: 'ZE03-NH3 (Electrochemical Ammonia, UART)',
      nameEn: 'ZE03-NH3 — true ppm replaces MQ-135',
      price: '৳২,৮০০-৩,৫০০',
      shop: 'AliExpress (Winsen official)',
      pin: 'RX=GPIO 32, TX=GPIO 4',
      tier: 'Tier 2 (High value)',
    },
    {
      name: 'SCD41 (CO₂ Sensor, I²C 0x62)',
      nameEn: 'SCD41 — premium ventilation feedback',
      price: '৳৪,৫০০-৬,০০০',
      shop: 'AliExpress / Mouser',
      pin: 'SDA=GPIO 16, SCL=GPIO 17 (shared I²C)',
      tier: 'Tier 3 (Premium)',
    },
    {
      name: 'PMS5003 (PM2.5 / PM10 dust, UART)',
      nameEn: 'PMS5003 — air-quality particulate',
      price: '৳২,২০০-৩,০০০',
      shop: 'AliExpress',
      pin: 'RX=GPIO 13, TX=GPIO 33',
      tier: 'Tier 3 (Premium)',
    },
  ];

  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-primary" />
          Phase 9 — প্রিমিয়াম এয়ার-কোয়ালিটি সেন্সর
          <Badge className="bg-primary text-[10px]">v10 Live</Badge>
          <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
            Auto-detect
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          ESP32 firmware বুটে এই সেন্সরগুলো নিজে detect করে। না থাকলে পুরাতন
          DHT22 / MQ-135 / LDR fallback চলবে — backward compatible।
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {phase9Parts.map((p, i) => (
          <div
            key={i}
            className="border rounded-lg p-2.5 bg-card/60 flex items-start justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.nameEn}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                🔌 {p.pin} · 🏪 {p.shop}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary">{p.price}</p>
              <Badge variant="outline" className="text-[9px] mt-1">
                {p.tier}
              </Badge>
            </div>
          </div>
        ))}

        <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-2 mt-3">
          <p className="text-[11px] text-foreground">
            <AlertTriangle className="h-3 w-3 text-amber-600 inline mr-1" />
            <strong>Board lock:</strong> শুধুমাত্র{' '}
            <code className="text-[10px]">ESP32-WROOM-32 38-pin DevKit V1</code>{' '}
            ব্যবহার করুন। WROVER বা 30-pin variant supported না (relay GPIO clash)।
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── WIRING TAB ───────────────────────────
export function InstallationV10WiringNotice() {
  const lockedRelays = [
    { gpio: 'GPIO 5', ch: 'IN1', use: '🌀 এক্সহস্ট ফ্যান (Exhaust Fan)' },
    { gpio: 'GPIO 18', ch: 'IN2', use: '🌀 সিলিং ফ্যান (Ceiling Fan)' },
    { gpio: 'GPIO 19', ch: 'IN3', use: '💡 লাইট (Light, PWM dimming optional)' },
    { gpio: 'GPIO 21', ch: 'IN4', use: '🔥 হিটার (Heater — broiler brooding)' },
    { gpio: 'GPIO 22', ch: 'IN5', use: '💦 ফগার (Fogger solenoid valve)' },
    { gpio: 'GPIO 23', ch: 'IN6', use: '🔔 অ্যালার্ম (Alarm / Buzzer)' },
    { gpio: 'GPIO 25', ch: 'IN7', use: '🚿 রুফ স্প্রিংকলার (HSI ≥ 80)' },
    { gpio: 'GPIO 26', ch: 'IN8', use: '💨 সার্কুলেশন ফ্যান (Circulation)' },
  ];

  const sensorPins = [
    { sensor: 'SHT31 / BH1750 / SCD41', pins: 'SDA = GPIO 16, SCL = GPIO 17 (I²C bus 2, shared)' },
    { sensor: 'ZE03-NH3 (UART2)', pins: 'RX = GPIO 32, TX = GPIO 4' },
    { sensor: 'PMS5003 (UART1)', pins: 'RX = GPIO 13, TX = GPIO 33' },
    { sensor: 'DHT22 (fallback only)', pins: 'DATA = GPIO 4 (auto-disabled if SHT31 detected)' },
    { sensor: 'MQ-135 (fallback only)', pins: 'AO = GPIO 34 (auto-disabled if ZE03 detected)' },
    { sensor: 'LDR (fallback only)', pins: 'AO = GPIO 35 (auto-disabled if BH1750 detected)' },
  ];

  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Zap className="h-4 w-4 text-primary" />
          v10 Authoritative Pin Map (LOCKED)
          <Badge className="bg-primary text-[10px]">Source of Truth</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          ESP32-এর firmware এই pin map-এ <strong>hardcoded</strong>। নিচের পুরাতন
          v8 ডায়াগ্রামের সাথে কোনো mismatch হলে <strong>এই টেবিলটিই সঠিক</strong>।
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Relay GPIO map */}
        <div>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            ৮-চ্যানেল রিলে GPIO ম্যাপ
          </p>
          <div className="border rounded-lg overflow-hidden">
            {lockedRelays.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] border-b last:border-b-0 bg-card/60"
              >
                <code className="font-mono font-semibold text-primary shrink-0 w-20">
                  {r.gpio}
                </code>
                <Badge variant="outline" className="text-[9px] shrink-0 w-10 justify-center">
                  {r.ch}
                </Badge>
                <span className="flex-1 text-foreground truncate">{r.use}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor pins */}
        <div>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
            <Wind className="h-3 w-3 text-sky-500" />
            সেন্সর পিন (Phase 9 + fallback)
          </p>
          <div className="border rounded-lg overflow-hidden">
            {sensorPins.map((s, i) => (
              <div
                key={i}
                className="px-2 py-1.5 text-[11px] border-b last:border-b-0 bg-card/60"
              >
                <p className="font-medium">{s.sensor}</p>
                <code className="text-[10px] text-muted-foreground font-mono">
                  {s.pins}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Safety invariants reminder */}
        <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-2">
          <p className="text-[11px] flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
            <span>
              <strong>৮টি Hardware Safety Invariants</strong> ESP32 firmware-এ
              hardcoded — Cloud override করতে পারে না (e.g., {`>`}38°C → সব Fan
              ON force, Heater OFF lock; Manual override 20 মিনিটে auto-revert)।
            </span>
          </p>
        </div>

        <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-2">
          <p className="text-[11px]">
            <AlertTriangle className="h-3 w-3 text-amber-600 inline mr-1" />
            <strong>নিচের legacy v8 wiring diagram (GPIO 14/15/27/12/13/33)</strong>{' '}
            পুরাতন reference — নতুন install-এ <strong>ব্যবহার করবেন না</strong>।
            সবসময় এই উপরের v10 টেবিল follow করুন।
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── SETUP TAB ───────────────────────────
export function InstallationV10SetupNotice() {
  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Cpu className="h-4 w-4 text-primary" />
          v10 Firmware ও সেটআপ ফ্লো
          <Badge className="bg-primary text-[10px]">Phase 1-10</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          নতুন install-এ এই firmware ব্যবহার করুন। auto-sensor-detect, MQTT,
          signed OTA, GSM SMS failover এবং ৮টি safety invariants সব included।
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Recommended install order */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">প্রস্তাবিত install order:</p>
          {[
            '1. Hardware বসান — উপরের Wiring tab-এর v10 pin map অনুসরণ করুন',
            '2. Phase 9 firmware flash করুন (auto-detect সেন্সর তালিকা Serial-এ আসবে)',
            '3. WiFi credentials + DEVICE_TOKEN config করুন',
            '4. App-এ "Calibrate Sensors" wizard চালান (5 মিনিট)',
            '5. Hardware Validation page → all-green হলে অটোমেশন চালু',
            '6. /phase9-report পেজে নতুন সেন্সর telemetry verify করুন',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* New firmware downloads */}
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="default"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/esp32-industrial-v10.ino', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">
              Industrial v10 Beta (Unified — relay + Phase 9 sensors + GSM + safety)
            </span>
            <Badge variant="secondary" className="bg-background">
              v10 Beta
            </Badge>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/esp32-phase9-sensors.ino', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">Phase 9 Sensor Firmware (sensors only)</span>
            <Badge variant="secondary" className="bg-background">
              v10
            </Badge>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/esp32-unified.ino', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">Unified Firmware (MQTT + OTA + GSM)</span>
            <Badge variant="secondary">All-in-one</Badge>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/esp32-ota-signed.ino', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">Signed OTA Updater</span>
            <Badge variant="secondary">Security</Badge>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/esp32-mqtt.ino', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">MQTT Realtime Telemetry</span>
            <Badge variant="secondary">Optional</Badge>
          </Button>
        </div>

        <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-2">
          <p className="text-[11px]">
            <AlertTriangle className="h-3 w-3 text-amber-600 inline mr-1" />
            নিচের legacy v8 setup steps রেফারেন্সের জন্য রাখা — Phase 9 firmware
            already includes safety engine, MQTT, OTA এবং GSM failover।
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
