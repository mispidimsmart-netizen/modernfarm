import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Cpu, Search, Zap, Wind } from 'lucide-react';

type Version = 'v8' | 'v10';

interface RelayRow {
  ch: string;
  gpio: string;
  use: string;
}
interface SensorRow {
  name: string;
  pins: string;
  note?: string;
}

const RELAYS: Record<Version, RelayRow[]> = {
  v8: [
    { ch: 'IN1', gpio: 'GPIO 25', use: '🌀 ফ্যান (FAN_RELAY_PIN)' },
    { ch: 'IN2', gpio: 'GPIO 26', use: '💡 লাইট (LIGHT_RELAY_PIN)' },
    { ch: 'IN3', gpio: 'GPIO 27', use: '💦 ফগার (FOGGER_RELAY_PIN)' },
    { ch: 'IN4', gpio: 'GPIO 14', use: '🔥 হিটার (HEATER_RELAY_PIN)' },
    { ch: 'IN5', gpio: 'GPIO 12', use: '🚪 কার্টেন আপ (CURTAIN_UP)' },
    { ch: 'IN6', gpio: 'GPIO 13', use: '🚪 কার্টেন ডাউন (CURTAIN_DOWN)' },
    { ch: 'IN7', gpio: 'GPIO 15', use: '🔔 অ্যালার্ম (ALARM_RELAY_PIN)' },
    { ch: 'IN8', gpio: 'GPIO 33', use: '💨 সার্কুলেশন (CIRCULATION_RELAY_PIN)' },
  ],
  v10: [
    { ch: 'IN1', gpio: 'GPIO 5', use: '🌀 এক্সহস্ট ফ্যান (PIN_FAN_EXHAUST)' },
    { ch: 'IN2', gpio: 'GPIO 18', use: '🌀 সিলিং ফ্যান (PIN_FAN_CEILING)' },
    { ch: 'IN3', gpio: 'GPIO 19', use: '💡 লাইট (PIN_LIGHT, PWM dim ready)' },
    { ch: 'IN4', gpio: 'GPIO 21', use: '🔥 হিটার (PIN_HEATER)' },
    { ch: 'IN5', gpio: 'GPIO 22', use: '💦 ফগার (PIN_FOGGER)' },
    { ch: 'IN6', gpio: 'GPIO 23', use: '🔔 অ্যালার্ম (PIN_ALARM)' },
    { ch: 'IN7', gpio: 'GPIO 25', use: '🚿 রুফ স্প্রিংকলার (HSI ≥ 80)' },
    { ch: 'IN8', gpio: 'GPIO 26', use: '💨 সার্কুলেশন (PIN_FAN_CIRC)' },
  ],
};

const SENSORS: Record<Version, SensorRow[]> = {
  v8: [
    { name: 'DHT22 #1 (তাপ/আর্দ্রতা)', pins: 'DATA = GPIO 4' },
    { name: 'DHT22 #2 (backup)', pins: 'DATA = GPIO 16' },
    { name: 'MQ-137 (অ্যামোনিয়া)', pins: 'AO = GPIO 34 (analog)' },
    { name: 'ZMPT101B (ভোল্টেজ)', pins: 'AO = GPIO 35 (analog)' },
    { name: 'Water Flow', pins: 'PULSE = GPIO 32' },
    { name: 'LDR (আলো)', pins: 'AO = GPIO 39 (analog)' },
    { name: 'Manual Override Switch', pins: 'GPIO 23 (INPUT_PULLUP)' },
    { name: 'Status LED', pins: 'GPIO 2 (onboard)' },
    { name: 'TFT ডিসপ্লে (ILI9341 SPI)', pins: 'SCK = GPIO 21, MOSI = GPIO 22, CS = GPIO 17, DC = GPIO 5', note: 'RST → ESP32 EN; v8.3+ ফার্মওয়্যারে বোর্ডের উপরের ডিসপ্লে' },
    { name: 'প্যানেল ইন্ডিকেটর LED (৮টি)', pins: 'ULN2803A IN1–IN8 ← রিলে কন্ট্রোল নেট', note: 'বাক্সের ঢাকনায় LED — সরাসরি GPIO থেকে নয়' },

  ],
  v10: [
    { name: 'SHT31 (তাপ/আর্দ্রতা, I²C 0x44)', pins: 'SDA = GPIO 16, SCL = GPIO 17', note: 'DHT22 replace করে' },
    { name: 'BH1750 (আলো, I²C 0x23)', pins: 'SDA = GPIO 16, SCL = GPIO 17 (shared)', note: 'LDR replace করে' },
    { name: 'SCD41 (CO₂, I²C 0x62)', pins: 'SDA = GPIO 16, SCL = GPIO 17 (shared)', note: 'Premium tier' },
    { name: 'ZE03-NH3 (অ্যামোনিয়া, UART2)', pins: 'RX = GPIO 32, TX = GPIO 4', note: 'MQ-135 replace করে' },
    { name: 'PMS5003 (PM2.5/PM10, UART1)', pins: 'RX = GPIO 13, TX = GPIO 33' },
    { name: 'DHT22 (fallback)', pins: 'DATA = GPIO 4', note: 'SHT31 না থাকলে auto-enable' },
    { name: 'MQ-135 (fallback)', pins: 'AO = GPIO 34', note: 'ZE03 না থাকলে auto-enable' },
    { name: 'LDR (fallback)', pins: 'AO = GPIO 35', note: 'BH1750 না থাকলে auto-enable' },
    { name: 'Manual Override Switch', pins: 'GPIO 27 (INPUT_PULLUP)' },
  ],
};

const FIRMWARE: Record<Version, { file: string; status: string; tag: string }> = {
  v8: { file: 'esp32-industrial.ino', status: 'Mass-deployed (Stable)', tag: 'INDUSTRIAL CONTROLLER v8' },
  v10: { file: 'esp32-industrial-v10.ino', status: 'New install (Premium)', tag: 'Industrial Firmware v10' },
};

export default function PinMapPage() {
  const [version, setVersion] = useState<Version>('v8');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const relays = useMemo(
    () => RELAYS[version].filter(r => !q || `${r.ch} ${r.gpio} ${r.use}`.toLowerCase().includes(q)),
    [version, q],
  );
  const sensors = useMemo(
    () => SENSORS[version].filter(s => !q || `${s.name} ${s.pins} ${s.note ?? ''}`.toLowerCase().includes(q)),
    [version, q],
  );

  const fw = FIRMWARE[version];

  return (
    <div className="container mx-auto px-3 py-4 max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          পিন ম্যাপ & সেন্সর
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          ESP32 ভার্সন সিলেক্ট করে দ্রুত GPIO ম্যাপিং ও সেন্সর তথ্য দেখুন।
        </p>
      </header>

      {/* Version toggle */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['v8', 'v10'] as Version[]).map(v => (
              <Button
                key={v}
                variant={version === v ? 'default' : 'outline'}
                onClick={() => setVersion(v)}
                className="h-auto py-2.5 flex flex-col gap-0.5"
              >
                <span className="text-base font-bold">{v.toUpperCase()}</span>
                <span className="text-[10px] opacity-80">{FIRMWARE[v].status}</span>
              </Button>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/40 p-2.5 text-[11px] space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Firmware ফাইল:</span>
              <code className="font-mono text-foreground">{fw.file}</code>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Boot banner:</span>
              <code className="font-mono text-foreground truncate max-w-[60%]" title={fw.tag}>{fw.tag}</code>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">বোর্ড:</span>
              <span className="text-foreground">ESP32-WROOM-32 38-pin DevKit V1</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="GPIO, রিলে বা সেন্সর খুঁজুন... (e.g., 25, fan, SHT31)"
              className="pl-8 h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Relays */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            ৮-চ্যানেল রিলে ম্যাপ
            <Badge variant="outline" className="text-[10px]">{relays.length}/{RELAYS[version].length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {relays.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground text-center">কোনো মিল পাওয়া যায়নি</p>
          ) : (
            <div className="divide-y">
              {relays.map(r => (
                <div key={r.ch} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <Badge variant="outline" className="text-[10px] shrink-0 w-10 justify-center">{r.ch}</Badge>
                  <code className="font-mono font-semibold text-primary shrink-0 w-20">{r.gpio}</code>
                  <span className="flex-1 truncate">{r.use}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wind className="h-4 w-4 text-sky-500" />
            সেন্সর তালিকা
            <Badge variant="outline" className="text-[10px]">{sensors.length}/{SENSORS[version].length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sensors.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground text-center">কোনো মিল পাওয়া যায়নি</p>
          ) : (
            <div className="divide-y">
              {sensors.map(s => (
                <div key={s.name} className="px-3 py-2 text-xs">
                  <p className="font-medium">{s.name}</p>
                  <code className="text-[10px] text-muted-foreground font-mono">{s.pins}</code>
                  {s.note && (
                    <p className="text-[10px] text-primary mt-0.5">↳ {s.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety reminder */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="p-3">
          <p className="text-[11px] flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <span>
              <strong>সতর্কতা:</strong> v8 ও v10-এর GPIO ম্যাপ সম্পূর্ণ আলাদা। ভুল ফার্মওয়্যার ফ্ল্যাশ
              করলে relay সঠিক load-এ trigger হবে না। Flash-এর পরে Serial Monitor (115200)-এ boot
              banner মিলিয়ে নিন।
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
