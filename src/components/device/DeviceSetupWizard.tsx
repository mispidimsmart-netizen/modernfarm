import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Cable,
  Radar,
  Download,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { verifyFirmwareContent } from '@/lib/firmwareVerifier';

type HwVersion = 'v8' | 'v10';

interface RelayRow {
  gpio: string;
  ch: string;
  use: string;
}

interface SensorOption {
  id: string;
  name: string;
  pin: string;
  required?: boolean;
  recommended?: boolean;
  tier: string;
  note?: string;
}

const RELAY_MAP_V10: RelayRow[] = [
  { gpio: 'GPIO 5', ch: 'IN1', use: '🌀 এক্সহস্ট ফ্যান' },
  { gpio: 'GPIO 18', ch: 'IN2', use: '🌀 সিলিং ফ্যান' },
  { gpio: 'GPIO 19', ch: 'IN3', use: '💡 লাইট' },
  { gpio: 'GPIO 21', ch: 'IN4', use: '🔥 হিটার' },
  { gpio: 'GPIO 22', ch: 'IN5', use: '💦 ফগার' },
  { gpio: 'GPIO 23', ch: 'IN6', use: '🔔 অ্যালার্ম' },
  { gpio: 'GPIO 25', ch: 'IN7', use: '🚿 স্প্রিংকলার' },
  { gpio: 'GPIO 26', ch: 'IN8', use: '💨 সার্কুলেশন ফ্যান' },
];

const RELAY_MAP_V8: RelayRow[] = [
  { gpio: 'GPIO 14', ch: 'IN1', use: '🌀 ফ্যান' },
  { gpio: 'GPIO 27', ch: 'IN2', use: '💡 লাইট' },
  { gpio: 'GPIO 26', ch: 'IN3', use: '🔥 হিটার' },
  { gpio: 'GPIO 25', ch: 'IN4', use: '💦 ফগার' },
  { gpio: 'GPIO 33', ch: 'IN5', use: '🔔 অ্যালার্ম' },
  { gpio: 'GPIO 32', ch: 'IN6', use: '🚿 স্প্রিংকলার' },
];

const SENSORS_V10: SensorOption[] = [
  { id: 'sht31', name: 'SHT31 (Temp+Humidity, ±0.2°C)', pin: 'SDA=16, SCL=17 (I²C 0x44)', recommended: true, tier: 'Tier 1' },
  { id: 'bh1750', name: 'BH1750 (Lux Light)', pin: 'SDA=16, SCL=17 (I²C 0x23)', recommended: true, tier: 'Tier 1' },
  { id: 'ze03', name: 'ZE03-NH3 (Ammonia ppm)', pin: 'RX=32, TX=4 (UART2)', tier: 'Tier 2' },
  { id: 'scd41', name: 'SCD41 (CO₂)', pin: 'SDA=16, SCL=17 (I²C 0x62)', tier: 'Tier 3' },
  { id: 'pms5003', name: 'PMS5003 (PM2.5/PM10)', pin: 'RX=13, TX=33 (UART1)', tier: 'Tier 3' },
  { id: 'dht22', name: 'DHT22 (Fallback Temp+Humidity)', pin: 'DATA=GPIO 4', tier: 'Fallback', note: 'SHT31 না থাকলে ব্যবহার হবে' },
  { id: 'mq135', name: 'MQ-135 (Fallback Ammonia)', pin: 'AO=GPIO 34', tier: 'Fallback', note: 'ZE03 না থাকলে' },
  { id: 'ldr', name: 'LDR (Fallback Light)', pin: 'AO=GPIO 35', tier: 'Fallback', note: 'BH1750 না থাকলে' },
];

const SENSORS_V8: SensorOption[] = [
  { id: 'dht22', name: 'DHT22 (Temperature + Humidity)', pin: 'DATA=GPIO 4', required: true, tier: 'Required' },
  { id: 'mq135', name: 'MQ-135 (Ammonia / Air)', pin: 'AO=GPIO 34', recommended: true, tier: 'Recommended' },
  { id: 'ldr', name: 'LDR (Light Sensor)', pin: 'AO=GPIO 35', recommended: true, tier: 'Recommended' },
];

const STEPS = [
  { key: 'version', label: 'কন্ট্রোলার সংস্করণ', icon: Cpu },
  { key: 'wiring', label: 'ওয়্যারিং', icon: Cable },
  { key: 'sensors', label: 'সেন্সর', icon: Radar },
  { key: 'summary', label: 'সারাংশ ও ডাউনলোড', icon: ClipboardCheck },
] as const;

type StepKey = typeof STEPS[number]['key'];

export function DeviceSetupWizard() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [version, setVersion] = useState<HwVersion | null>(null);
  const [wiringConfirmed, setWiringConfirmed] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalAck, setFinalAck] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const step: StepKey = STEPS[stepIdx].key;
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const relayMap = version === 'v10' ? RELAY_MAP_V10 : RELAY_MAP_V8;
  const sensorList = version === 'v10' ? SENSORS_V10 : SENSORS_V8;

  // Auto-tick required + recommended sensors when version changes
  const handleVersionPick = (v: HwVersion) => {
    setVersion(v);
    const list = v === 'v10' ? SENSORS_V10 : SENSORS_V8;
    setSelectedSensors(list.filter(s => s.required || s.recommended).map(s => s.id));
    setWiringConfirmed(false);
  };

  const toggleSensor = (id: string) => {
    setSelectedSensors(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const canNext = useMemo(() => {
    if (step === 'version') return version !== null;
    if (step === 'wiring') return wiringConfirmed;
    if (step === 'sensors') {
      // Must include at least one temp/humidity source
      const tempOk = version === 'v8'
        ? selectedSensors.includes('dht22')
        : selectedSensors.includes('sht31') || selectedSensors.includes('dht22');
      return tempOk;
    }
    return true;
  }, [step, version, wiringConfirmed, selectedSensors]);

  const firmwareFile = version === 'v10' ? '/esp32-industrial-v10.ino' : '/esp32-industrial.ino';
  const firmwareLabel = version === 'v10' ? 'Industrial v10 (Beta)' : 'Industrial v8 (Stable)';

  const downloadFirmware = async () => {
    if (!version) return;
    setIsVerifying(true);
    try {
      const url = `${firmwareFile}?t=${Date.now()}&r=${Math.random().toString(36).slice(2, 10)}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      const verify = verifyFirmwareContent(content, version);
      if (!verify.matches) {
        toast.error(
          `ভেরিফিকেশন ব্যর্থ: প্রত্যাশিত ${version.toUpperCase()}, পাওয়া গেছে ${verify.detected.toUpperCase()}। ডাউনলোড বাতিল।`
        );
        return;
      }
      const blob = new Blob([content], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = version === 'v10' ? 'esp32-industrial-v10.ino' : 'esp32-industrial.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(`${firmwareLabel} ডাউনলোড শুরু হলো — ${version.toUpperCase()} verified ✓`);
      setConfirmOpen(false);
      setFinalAck(false);
    } catch (e) {
      toast.error(`ডাউনলোড ব্যর্থ: ${(e as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const openConfirm = () => {
    if (!version) return;
    setFinalAck(false);
    setConfirmOpen(true);
  };

  const goNext = () => setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIdx(i => Math.max(i - 1, 0));

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
        </Button>
        <Badge variant="outline" className="text-[11px]">
          ধাপ {stepIdx + 1} / {STEPS.length}
        </Badge>
      </div>

      {/* Stepper */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            ডিভাইস সেটআপ উইজার্ড
          </CardTitle>
          <Progress value={progress} className="h-1.5 mt-2" />
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === stepIdx;
              const done = i < stepIdx;
              return (
                <div key={s.key} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center border-2 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : done
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-[10px] text-center ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Step 1 — Version */}
      {step === 'version' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">কোন কন্ট্রোলার সংস্করণ ব্যবহার করছেন?</CardTitle>
            <p className="text-xs text-muted-foreground">
              আপনার ESP32-এ যে ওয়্যারিং ডায়াগ্রাম অনুসরণ করেছেন সেটি বেছে নিন।
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleVersionPick('v8')}
              className={`text-left rounded-lg border-2 p-3 transition ${
                version === 'v8' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">v8 (Stable)</span>
                <Badge variant="secondary" className="text-[10px]">পুরাতন ওয়্যারিং</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                GPIO 14/27/26/25/33/32 — DHT22, MQ-135, LDR সেন্সর।
              </p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                <li>• 6-channel relay</li>
                <li>• Legacy install অনুযায়ী</li>
                <li>• ফিল্ড-টেস্টেড স্থিতিশীল</li>
              </ul>
            </button>

            <button
              type="button"
              onClick={() => handleVersionPick('v10')}
              className={`text-left rounded-lg border-2 p-3 transition ${
                version === 'v10' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm flex items-center gap-1">
                  v10 <Sparkles className="h-3 w-3 text-primary" />
                </span>
                <Badge className="text-[10px]">নতুন</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                GPIO 5/18/19/21/22/23/25/26 — Phase 9 সেন্সর support।
              </p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                <li>• 8-channel relay</li>
                <li>• SHT31, BH1750, ZE03, SCD41, PMS5003</li>
                <li>• GSM SMS failover + Auto-detect</li>
              </ul>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Wiring */}
      {step === 'wiring' && version && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Cable className="h-4 w-4 text-primary" />
              {version === 'v10' ? 'v10 ওয়্যারিং' : 'v8 ওয়্যারিং'} — রিলে GPIO ম্যাপ
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              ESP32-WROOM-32 <strong>38-pin DevKit V1</strong> ব্যবহার করুন (WROVER নয়)।
              প্রতিটি রিলে এই GPIO অনুযায়ী কানেক্ট করুন।
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left">GPIO</th>
                    <th className="px-2 py-1.5 text-left">Relay Ch</th>
                    <th className="px-2 py-1.5 text-left">লোড</th>
                  </tr>
                </thead>
                <tbody>
                  {relayMap.map((r) => (
                    <tr key={r.gpio} className="border-t">
                      <td className="px-2 py-1.5 font-mono text-[11px]">{r.gpio}</td>
                      <td className="px-2 py-1.5">{r.ch}</td>
                      <td className="px-2 py-1.5">{r.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px]">
                রিলে <strong>active-LOW</strong> (LOW = ON)। 5V relay-এর VCC ESP32-এর 5V পিন
                বা আলাদা পাওয়ার সাপ্লাইতে দিন। GND অবশ্যই common করুন।
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer rounded-lg border p-2 hover:bg-accent">
              <Checkbox
                checked={wiringConfirmed}
                onCheckedChange={(c) => setWiringConfirmed(c === true)}
                className="mt-0.5"
              />
              <span className="text-xs">
                আমি উপরের <strong>{version}</strong> ওয়্যারিং ডায়াগ্রাম অনুযায়ী রিলে কানেক্ট করেছি
                এবং double-check করেছি।
              </span>
            </label>

            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => navigate('/installation-guide')}
            >
              বিস্তারিত wiring diagram দেখুন →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Sensors */}
      {step === 'sensors' && version && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              সেন্সর কনফিগারেশন
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              আপনি যে সেন্সরগুলো ইনস্টল করেছেন সেগুলো টিক দিন। ফার্মওয়্যার boot-এ এগুলো auto-detect করবে।
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {sensorList.map((s) => {
              const checked = selectedSensors.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-start gap-2 cursor-pointer rounded-lg border p-2 transition ${
                    checked ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSensor(s.id)}
                    disabled={s.required}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">{s.name}</span>
                      <Badge
                        variant={s.required ? 'default' : s.recommended ? 'secondary' : 'outline'}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {s.tier}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.pin}</p>
                    {s.note && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">{s.note}</p>
                    )}
                  </div>
                </label>
              );
            })}

            {!canNext && (
              <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  কমপক্ষে একটি temperature+humidity সেন্সর ({version === 'v10' ? 'SHT31 বা DHT22' : 'DHT22'}) নির্বাচন করুন।
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Summary */}
      {step === 'summary' && version && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              সারাংশ ও ফার্মওয়্যার ডাউনলোড
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">কন্ট্রোলার সংস্করণ</span>
                <Badge className="text-[10px]">{version.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ফার্মওয়্যার ফাইল</span>
                <span className="font-mono text-[11px]">{firmwareFile.replace('/', '')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">রিলে চ্যানেল</span>
                <span>{relayMap.length} ch</span>
              </div>
              <div className="flex items-start justify-between text-xs gap-2">
                <span className="text-muted-foreground shrink-0">নির্বাচিত সেন্সর</span>
                <span className="text-right">
                  {selectedSensors.length === 0
                    ? '—'
                    : sensorList
                        .filter((s) => selectedSensors.includes(s.id))
                        .map((s) => s.name.split(' (')[0])
                        .join(', ')}
                </span>
              </div>
            </div>

            <Button onClick={openConfirm} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              {firmwareLabel} ডাউনলোড করুন
            </Button>

            <div className="border border-primary/30 bg-primary/5 rounded-lg p-2 space-y-1">
              <p className="text-[11px] font-semibold">পরবর্তী ধাপ:</p>
              <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                <li>ডাউনলোডকৃত .ino ফাইল Arduino IDE-তে খুলুন</li>
                <li>WiFi SSID, Password ও DEVICE_TOKEN বসান</li>
                <li>ESP32-এ flash করুন (Board: ESP32 Dev Module)</li>
                <li>Serial Monitor-এ auto-detect সেন্সর তালিকা verify করুন</li>
              </ol>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate('/settings?tab=device')}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              WiFi + Token সহ Code Generator ব্যবহার করুন
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-2 sticky bottom-2">
        <Button variant="outline" onClick={goBack} disabled={stepIdx === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> পেছনে
        </Button>
        {stepIdx < STEPS.length - 1 ? (
          <Button onClick={goNext} disabled={!canNext}>
            পরবর্তী <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button variant="default" onClick={() => navigate('/settings?tab=device')}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> সম্পন্ন
          </Button>
        )}
      </div>

      {/* Mismatch-protection confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setFinalAck(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              ডাউনলোডের আগে নিশ্চিত করুন
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm">
                  ভুল firmware ভুল ওয়্যারিং-এ flash করলে রিলে ভুল GPIO-তে কাজ করবে —
                  ফ্যান হিটারের জায়গায়, লাইট অ্যালার্মের জায়গায় চালু হতে পারে।
                  নিচের তথ্য মিলিয়ে দেখুন:
                </p>

                <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">আপনার ওয়্যারিং</span>
                    <Badge variant="outline" className="font-mono">
                      {version?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ডাউনলোড হবে firmware</span>
                    <Badge className="font-mono">{version?.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">ফাইল</span>
                    <span className="font-mono text-[11px]">{firmwareFile.replace('/', '')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs pt-1 border-t">
                    <CheckCircle2 className="h-4 w-4" />
                    ওয়্যারিং ও firmware সংস্করণ মিলে গেছে
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                  ⚠ ডাউনলোডের পর ফাইলের ভেতরের version tag ও GPIO map automatically
                  verify করা হবে। mismatch হলে ডাউনলোড <strong>বাতিল</strong> হয়ে যাবে।
                </div>

                <label className="flex items-start gap-2 cursor-pointer rounded-lg border p-2 hover:bg-accent">
                  <Checkbox
                    checked={finalAck}
                    onCheckedChange={(c) => setFinalAck(c === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    আমি নিশ্চিত আমার ESP32 <strong>{version?.toUpperCase()}</strong> ওয়্যারিং
                    ডায়াগ্রাম অনুযায়ী কানেক্টেড এবং সঠিক firmware-ই flash করতে চাই।
                  </span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVerifying}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={!finalAck || isVerifying}
              onClick={(e) => { e.preventDefault(); downloadFirmware(); }}
            >
              {isVerifying ? (
                <>যাচাই হচ্ছে...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Verify ও ডাউনলোড
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DeviceSetupWizard;
