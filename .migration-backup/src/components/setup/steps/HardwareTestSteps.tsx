import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SETUP_RELAY_TARGETS } from '@/data/setupWizardOptions';

type SendCommand = ReturnType<typeof useSendDeviceCommand>;
type CommandType = Parameters<SendCommand['mutateAsync']>[0]['commandType'];

export function StepTestRelays({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const navigate = useNavigate();
  const sendCommand = useSendDeviceCommand();
  const { isConnected } = useRealtimeSensorData();
  const [tested, setTested] = useState<Record<string, boolean>>({});
  const relays = SETUP_RELAY_TARGETS;

  const testRelay = async (key: string) => {
    await sendCommand.mutateAsync({ commandType: key as CommandType, commandValue: true });
    setTimeout(async () => {
      await sendCommand.mutateAsync({ commandType: key as CommandType, commandValue: false });
      setTested(prev => ({ ...prev, [key]: true }));
    }, 2000);
  };

  const allTested = relays.every(r => tested[r.key]);

  // ESP32 not connected - show blocker
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-destructive/5 border-2 border-destructive/30 p-6 text-center">
          <WifiOff className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h3 className="text-lg font-bold text-foreground">
            {language === 'bn' ? 'ESP32 সংযুক্ত নয়!' : 'ESP32 Not Connected!'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {language === 'bn'
              ? 'রিলে পরীক্ষা করতে হলে আগে ESP32-এ ফার্মওয়্যার আপলোড করে চালু করুন'
              : 'Upload firmware to ESP32 and power it on before testing relays'}
          </p>
        </div>

        <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {language === 'bn' ? '📋 চেকলিস্ট:' : '📋 Checklist:'}
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>1️⃣ {language === 'bn' ? 'আগের ধাপ থেকে ফার্মওয়্যার ডাউনলোড করুন' : 'Download firmware from previous step'}</p>
            <p>2️⃣ {language === 'bn' ? 'Arduino IDE-তে ESP32 বোর্ড সিলেক্ট করুন' : 'Select ESP32 board in Arduino IDE'}</p>
            <p>3️⃣ {language === 'bn' ? 'Upload Speed ১১৫২০০, Flash Freq ৪০MHz সেট করুন' : 'Set Upload Speed 115200, Flash Freq 40MHz'}</p>
            <p>4️⃣ {language === 'bn' ? 'USB দিয়ে কোড আপলোড করুন (অন্য কিছু কানেক্ট রাখবেন না)' : 'Upload via USB (disconnect everything else)'}</p>
            <p>5️⃣ {language === 'bn' ? 'ওয়্যারিং সম্পন্ন করে পাওয়ার দিন' : 'Complete wiring and power on'}</p>
            <p>6️⃣ {language === 'bn' ? 'WiFi সংযোগ হলে এই পেজ অটো-আপডেট হবে' : 'This page auto-updates when WiFi connects'}</p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/settings/installation-guide')}
          className="w-full h-10 rounded-xl text-sm"
        >
          📖 {language === 'bn' ? 'বিস্তারিত ইনস্টলেশন গাইড দেখুন' : 'View detailed Installation Guide'}
        </Button>

        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {language === 'bn' ? 'ESP32 সংযোগের অপেক্ষায়...' : 'Waiting for ESP32 connection...'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5 flex items-center gap-2">
        <Wifi className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">
          {language === 'bn' ? '✅ ESP32 অনলাইন — রিলে পরীক্ষা শুরু করুন' : '✅ ESP32 online — start testing relays'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        {language === 'bn' ? 'প্রতিটি রিলে ২ সেকেন্ডের জন্য চালু হবে — ক্লিক শব্দ শুনুন' : 'Each relay will turn ON for 2 seconds — listen for click sound'}
      </p>
      {relays.map(relay => (
        <button
          key={relay.key}
          onClick={() => testRelay(relay.key)}
          disabled={sendCommand.isPending}
          className={`w-full flex items-center gap-3 rounded-xl border p-4 transition-colors text-left ${
            tested[relay.key] ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border hover:bg-muted/50'
          }`}
        >
          <span className="text-2xl">{relay.icon}</span>
          <span className="flex-1 text-sm font-medium">{language === 'bn' ? relay.testBn : relay.testEn}</span>
          {tested[relay.key] ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        </button>
      ))}
      <Button onClick={onComplete} disabled={!allTested} className="w-full h-12 text-base rounded-xl mt-2">
        {language === 'bn' ? 'সব রিলে কাজ করছে →' : 'All relays working →'}
      </Button>
    </div>
  );
}

export function StepCalibrateSensors({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const { sensorData, isConnected } = useRealtimeSensorData();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${isConnected ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
        <div className="flex items-center gap-2 mb-3">
          {isConnected ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
          <span className="text-sm font-medium">{isConnected ? (language === 'bn' ? 'সেন্সর সংযুক্ত' : 'Sensors connected') : (language === 'bn' ? 'সেন্সর অফলাইন' : 'Sensors offline')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-xs text-muted-foreground">🌡️ {language === 'bn' ? 'তাপমাত্রা' : 'Temp'}</p>
            <p className="text-xl font-bold">{sensorData.temperature.toFixed(1)}°C</p>
          </div>
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-xs text-muted-foreground">💧 {language === 'bn' ? 'আর্দ্রতা' : 'Humidity'}</p>
            <p className="text-xl font-bold">{sensorData.humidity.toFixed(0)}%</p>
          </div>
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-xs text-muted-foreground">💨 {language === 'bn' ? 'অ্যামোনিয়া' : 'NH3'}</p>
            <p className="text-xl font-bold">{sensorData.ammonia.toFixed(1)} ppm</p>
          </div>
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-xs text-muted-foreground">🚰 {language === 'bn' ? 'পানি' : 'Water'}</p>
            <p className="text-xl font-bold">{sensorData.waterUsage.toFixed(0)} L/h</p>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="h-5 w-5 rounded border-border" />
        <span className="text-sm">{language === 'bn' ? 'সেন্সর রিডিং সঠিক দেখাচ্ছে' : 'Sensor readings look correct'}</span>
      </label>
      <Button onClick={onComplete} disabled={!confirmed} className="w-full h-12 text-base rounded-xl">
        {language === 'bn' ? 'ক্যালিব্রেশন সম্পন্ন →' : 'Calibration done →'}
      </Button>
    </div>
  );
}

export function StepSimulationTest({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const sendCommand = useSendDeviceCommand();
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runSimulation = useCallback(async () => {
    const devices = SETUP_RELAY_TARGETS;
    setPhase('running');
    setProgress(0);
    setLog([]);

    try {
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const label = language === 'bn' ? device.bn : device.en;
        addLog(`${device.icon} ${label} ${language === 'bn' ? 'চালু হচ্ছে...' : 'starting...'}`);
        await sendCommand.mutateAsync({ commandType: device.key as CommandType, commandValue: true });

        const segmentSize = 100 / devices.length;
        const startPct = i * segmentSize;
        for (let p = 0; p <= segmentSize; p += segmentSize / 3) {
          await new Promise(r => setTimeout(r, 500));
          setProgress(Math.min(startPct + p, 100));
        }

        await sendCommand.mutateAsync({ commandType: device.key as CommandType, commandValue: false });
        addLog(`✅ ${label} ${language === 'bn' ? 'পরীক্ষা সফল' : 'test passed'}`);
      }

      addLog(language === 'bn' ? '🎉 সিমুলেশন সম্পন্ন! ৮টি ডিভাইস পরীক্ষিত।' : '🎉 Simulation complete! 8 devices tested.');
      setProgress(100);
      setPhase('done');
    } catch {
      addLog(language === 'bn' ? '❌ সিমুলেশন ব্যর্থ' : '❌ Simulation failed');
      setPhase('failed');
    }
  }, [sendCommand, language]);

  return (
    <div className="space-y-4">
      {phase === 'idle' && (
        <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
          <span className="text-5xl">🧪</span>
          <p className="mt-3 text-sm text-muted-foreground">
            {language === 'bn'
              ? '৮-চ্যানেল সিমুলেশন টেস্ট — প্রতিটি ডিভাইস পর্যায়ক্রমে চালু/বন্ধ হবে'
              : '8-channel simulation — each device will turn ON/OFF sequentially'}
          </p>
          <Button onClick={runSimulation} className="mt-4 h-12 text-base rounded-xl">
            {language === 'bn' ? '▶️ সিমুলেশন শুরু করুন' : '▶️ Start Simulation'}
          </Button>
        </div>
      )}

      {(phase === 'running' || phase === 'done' || phase === 'failed') && (
        <>
          <Progress value={progress} className="h-3 rounded-full" />
          <div className="rounded-xl bg-muted/30 border border-border p-3 max-h-48 overflow-y-auto">
            {log.map((entry, i) => (
              <p key={i} className="text-xs font-mono text-muted-foreground">{entry}</p>
            ))}
          </div>
        </>
      )}

      {phase === 'done' && (
        <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl bg-primary">
          {language === 'bn' ? '🎉 সেটআপ সম্পন্ন করুন!' : '🎉 Complete Setup!'}
        </Button>
      )}

      {phase === 'failed' && (
        <div className="flex gap-2">
          <Button onClick={runSimulation} variant="outline" className="flex-1 h-12 rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" /> {language === 'bn' ? 'আবার চেষ্টা' : 'Retry'}
          </Button>
          <Button onClick={onComplete} variant="secondary" className="flex-1 h-12 rounded-xl">
            {language === 'bn' ? 'স্কিপ করুন' : 'Skip'}
          </Button>
        </div>
      )}
    </div>
  );
}
