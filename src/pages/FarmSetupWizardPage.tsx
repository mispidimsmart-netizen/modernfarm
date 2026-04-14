import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Loader2, Wifi, WifiOff, QrCode, RotateCcw, Download } from 'lucide-react';
import { HardwareValidation } from '@/components/setup/HardwareValidation';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useFarmSetupStatus, useUpdateSetupStep, SETUP_STEPS } from '@/hooks/useFarmSetup';
import { useSheds, useAddShed } from '@/hooks/useSheds';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// ===== Step Components =====

function StepFarmCreate({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const { farms, selectedFarmId } = useFarmContext();
  const currentFarm = farms.find(f => f.id === selectedFarmId);

  // Farm already created by trigger
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
        <span className="text-5xl">🏠</span>
        <h3 className="mt-3 text-lg font-bold text-foreground">
          {language === 'bn' ? 'খামার তৈরি হয়েছে!' : 'Farm Created!'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentFarm?.name || 'আমার ফার্ম'}
        </p>
      </div>
      <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl">
        {language === 'bn' ? 'পরবর্তী ধাপ →' : 'Next Step →'}
      </Button>
    </div>
  );
}

function StepAddShed({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const { data: sheds } = useSheds();
  const addShed = useAddShed();
  const [shedName, setShedName] = useState('');
  const [capacity, setCapacity] = useState('1000');

  const hasSheds = sheds && sheds.length > 0;

  const handleAdd = async () => {
    if (!shedName.trim()) return;
    await addShed.mutateAsync({
      name: shedName,
      name_en: shedName,
      bird_capacity: parseInt(capacity) || 1000,
    });
    onComplete();
  };

  if (hasSheds) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <span className="text-5xl">🏗️</span>
          <h3 className="mt-3 text-lg font-bold text-foreground">
            {language === 'bn' ? `${sheds.length}টি শেড আছে` : `${sheds.length} shed(s) exist`}
          </h3>
          {sheds.map(s => (
            <p key={s.id} className="text-sm text-muted-foreground">{s.name}</p>
          ))}
        </div>
        <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl">
          {language === 'bn' ? 'পরবর্তী ধাপ →' : 'Next Step →'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label>{language === 'bn' ? 'শেডের নাম' : 'Shed Name'}</Label>
          <Input value={shedName} onChange={e => setShedName(e.target.value)} placeholder={language === 'bn' ? 'শেড ১' : 'Shed 1'} className="mt-1" />
        </div>
        <div>
          <Label>{language === 'bn' ? 'পাখির ধারণক্ষমতা' : 'Bird Capacity'}</Label>
          <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button onClick={handleAdd} disabled={!shedName.trim() || addShed.isPending} className="w-full h-12 text-base rounded-xl">
        {addShed.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (language === 'bn' ? 'শেড যোগ করুন →' : 'Add Shed →')}
      </Button>
    </div>
  );
}

function StepRegisterController({ onComplete }: { onComplete: () => void }) {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const [token, setToken] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  const handleRegister = async () => {
    if (!token.trim() || !user || !selectedFarmId) return;
    setIsRegistering(true);
    try {
      const { error } = await supabase.from('device_tokens').insert({
        user_id: user.id,
        token: token.trim(),
        device_name: 'ESP32 Controller',
        farm_id: selectedFarmId,
      });
      if (error) throw error;
      toast({ title: language === 'bn' ? '✅ কন্ট্রোলার সংযুক্ত!' : '✅ Controller registered!' });
      onComplete();
    } catch (err: any) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    }
    setIsRegistering(false);
  };

  // Check if already has tokens
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    if (!user || !selectedFarmId) return;
    supabase.from('device_tokens').select('id').eq('user_id', user.id).eq('farm_id', selectedFarmId).limit(1).then(({ data }) => {
      if (data && data.length > 0) setHasToken(true);
    });
  }, [user, selectedFarmId]);

  if (hasToken) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <span className="text-5xl">📱</span>
          <h3 className="mt-3 text-lg font-bold text-foreground">
            {language === 'bn' ? 'কন্ট্রোলার সংযুক্ত!' : 'Controller connected!'}
          </h3>
          <Wifi className="mx-auto mt-2 h-8 w-8 text-primary" />
        </div>
        <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl">
          {language === 'bn' ? 'পরবর্তী ধাপ →' : 'Next Step →'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
        <QrCode className="mx-auto h-16 w-16 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'ESP32 কন্ট্রোলারের QR কোড স্ক্যান করুন বা ম্যানুয়ালি টোকেন দিন'
            : 'Scan QR code on ESP32 controller or enter token manually'}
        </p>
      </div>
      <div>
        <Label>{language === 'bn' ? 'ডিভাইস টোকেন' : 'Device Token'}</Label>
        <Input value={token} onChange={e => setToken(e.target.value)} placeholder="FARM-XXXX-XXXX" className="mt-1 font-mono" />
      </div>
      <Button onClick={handleRegister} disabled={!token.trim() || isRegistering} className="w-full h-12 text-base rounded-xl">
        {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : (language === 'bn' ? '📱 সংযোগ করুন →' : '📱 Register →')}
      </Button>
    </div>
  );
}

function StepTestRelays({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const sendCommand = useSendDeviceCommand();
  const [tested, setTested] = useState<Record<string, boolean>>({});
  const relays = [
    { key: 'fan', icon: '🌀', en: 'Exhaust Fan (Relay 1)', bn: 'এক্সহস্ট ফ্যান (রিলে ১)' },
    { key: 'light', icon: '💡', en: 'Light / Circ Fan (Relay 2)', bn: 'লাইট / সার্কুলেশন ফ্যান (রিলে ২)' },
    { key: 'alarm', icon: '🔔', en: 'Alarm / Heater (Relay 3)', bn: 'অ্যালার্ম / হিটার (রিলে ৩)' },
    { key: 'fogger', icon: '💧', en: 'Fogger (Relay 4)', bn: 'ফগার (রিলে ৪)' },
  ];

  const testRelay = async (key: string) => {
    await sendCommand.mutateAsync({ commandType: key as any, commandValue: true });
    setTimeout(async () => {
      await sendCommand.mutateAsync({ commandType: key as any, commandValue: false });
      setTested(prev => ({ ...prev, [key]: true }));
    }, 2000);
  };

  const allTested = relays.every(r => tested[r.key]);

  return (
    <div className="space-y-3">
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
          <span className="flex-1 text-sm font-medium">{language === 'bn' ? relay.bn : relay.en}</span>
          {tested[relay.key] ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        </button>
      ))}
      <Button onClick={onComplete} disabled={!allTested} className="w-full h-12 text-base rounded-xl mt-2">
        {language === 'bn' ? 'সব রিলে কাজ করছে →' : 'All relays working →'}
      </Button>
    </div>
  );
}

function StepCalibrateSensors({ onComplete }: { onComplete: () => void }) {
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

function StepSetChickAge({ onComplete }: { onComplete: () => void }) {
  const { user, language } = useAuth();
  const [ageWeeks, setAgeWeeks] = useState('0');
  const [farmType, setFarmType] = useState<string>('layer');
  const { toast } = useToast();

  const handleSave = async () => {
    if (!user) return;
    // Update flock_info age
    await supabase.from('flock_info').update({ age_weeks: parseInt(ageWeeks) || 0 }).eq('user_id', user.id);
    toast({ title: language === 'bn' ? '✅ বয়স সেট হয়েছে' : '✅ Age set' });
    onComplete();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label>{language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}</Label>
          <Select value={farmType} onValueChange={setFarmType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="layer">🥚 {language === 'bn' ? 'লেয়ার' : 'Layer'}</SelectItem>
              <SelectItem value="broiler">🍗 {language === 'bn' ? 'ব্রয়লার' : 'Broiler'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{language === 'bn' ? 'বর্তমান বয়স (সপ্তাহ)' : 'Current Age (weeks)'}</Label>
          <Input type="number" value={ageWeeks} onChange={e => setAgeWeeks(e.target.value)} min="0" max="120" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">
            {farmType === 'broiler' 
              ? (language === 'bn' ? '০ = আজকে বাচ্চা এসেছে' : '0 = chicks arrived today')
              : (language === 'bn' ? 'লেয়ার মুরগির বর্তমান বয়স' : 'Current age of layer birds')
            }
          </p>
        </div>
      </div>
      <Button onClick={handleSave} className="w-full h-12 text-base rounded-xl">
        {language === 'bn' ? '🐣 বয়স সেট করুন →' : '🐣 Set Age →'}
      </Button>
    </div>
  );
}

function StepAutomationProfile({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const [profile, setProfile] = useState<string>('balanced');

  const profiles = [
    { id: 'conservative', icon: '🛡️', en: 'Conservative (Safety First)', bn: 'রক্ষণশীল (নিরাপত্তা প্রথম)', desc_en: 'Lower thresholds, more frequent checks', desc_bn: 'নিরাপদ সীমা, ঘন ঘন পরীক্ষা' },
    { id: 'balanced', icon: '⚖️', en: 'Balanced (Recommended)', bn: 'ভারসাম্যপূর্ণ (সুপারিশকৃত)', desc_en: 'Standard poultry industry defaults', desc_bn: 'স্ট্যান্ডার্ড পোল্ট্রি ইন্ডাস্ট্রি ডিফল্ট' },
    { id: 'aggressive', icon: '⚡', en: 'Aggressive (Max Production)', bn: 'আক্রমণাত্মক (সর্বোচ্চ উৎপাদন)', desc_en: 'Tighter ranges, faster responses', desc_bn: 'কঠোর সীমা, দ্রুত প্রতিক্রিয়া' },
  ];

  return (
    <div className="space-y-3">
      {profiles.map(p => (
        <button
          key={p.id}
          onClick={() => setProfile(p.id)}
          className={`w-full flex items-start gap-3 rounded-xl border p-4 transition-colors text-left ${
            profile === p.id ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20' : 'bg-muted/30 border-border hover:bg-muted/50'
          }`}
        >
          <span className="text-2xl mt-0.5">{p.icon}</span>
          <div>
            <p className="font-semibold text-sm">{language === 'bn' ? p.bn : p.en}</p>
            <p className="text-xs text-muted-foreground">{language === 'bn' ? p.desc_bn : p.desc_en}</p>
          </div>
        </button>
      ))}
      <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl mt-2">
        {language === 'bn' ? '⚙️ প্রোফাইল সিলেক্ট →' : '⚙️ Select Profile →'}
      </Button>
    </div>
  );
}

function StepSimulationTest({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const sendCommand = useSendDeviceCommand();
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runSimulation = useCallback(async () => {
    setPhase('running');
    setProgress(0);
    setLog([]);

    try {
      // Phase 1: Fan test (0-25%)
      addLog(language === 'bn' ? '🌀 ফ্যান চালু করা হচ্ছে...' : '🌀 Starting fan...');
      await sendCommand.mutateAsync({ commandType: 'fan', commandValue: true });
      for (let i = 0; i <= 25; i += 5) { await new Promise(r => setTimeout(r, 600)); setProgress(i); }
      await sendCommand.mutateAsync({ commandType: 'fan', commandValue: false });
      addLog(language === 'bn' ? '✅ ফ্যান পরীক্ষা সফল' : '✅ Fan test passed');

      // Phase 2: Light test (25-50%)
      addLog(language === 'bn' ? '💡 লাইট চালু করা হচ্ছে...' : '💡 Starting light...');
      await sendCommand.mutateAsync({ commandType: 'light', commandValue: true });
      for (let i = 25; i <= 50; i += 5) { await new Promise(r => setTimeout(r, 600)); setProgress(i); }
      await sendCommand.mutateAsync({ commandType: 'light', commandValue: false });
      addLog(language === 'bn' ? '✅ লাইট পরীক্ষা সফল' : '✅ Light test passed');

      // Phase 3: Alarm test (50-75%)
      addLog(language === 'bn' ? '🔔 অ্যালার্ম পরীক্ষা...' : '🔔 Testing alarm...');
      await sendCommand.mutateAsync({ commandType: 'alarm', commandValue: true });
      for (let i = 50; i <= 75; i += 5) { await new Promise(r => setTimeout(r, 600)); setProgress(i); }
      await sendCommand.mutateAsync({ commandType: 'alarm', commandValue: false });
      addLog(language === 'bn' ? '✅ অ্যালার্ম পরীক্ষা সফল' : '✅ Alarm test passed');

      // Phase 4: Full cycle (75-100%)
      addLog(language === 'bn' ? '🔄 সম্পূর্ণ সিমুলেশন চলছে...' : '🔄 Running full simulation...');
      for (let i = 75; i <= 100; i += 5) { await new Promise(r => setTimeout(r, 600)); setProgress(i); }
      addLog(language === 'bn' ? '🎉 সিমুলেশন সম্পন্ন!' : '🎉 Simulation complete!');

      setPhase('done');
    } catch (err) {
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
              ? '২ মিনিটের সিমুলেশন টেস্ট — প্রতিটি ডিভাইস পর্যায়ক্রমে চালু/বন্ধ হবে'
              : '2-minute simulation — each device will turn ON/OFF sequentially'}
          </p>
          <Button onClick={runSimulation} className="mt-4 h-12 text-base rounded-xl">
            {language === 'bn' ? '▶️ সিমুলেশন শুরু করুন' : '▶️ Start Simulation'}
          </Button>
        </div>
      )}

      {(phase === 'running' || phase === 'done' || phase === 'failed') && (
        <>
          <Progress value={progress} className="h-3 rounded-full" />
          <div className="rounded-xl bg-muted/30 border border-border p-3 max-h-40 overflow-y-auto">
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

// ===== Main Wizard =====

export default function FarmSetupWizardPage() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const { data: setupStatus, isLoading } = useFarmSetupStatus();
  const updateStep = useUpdateSetupStep();
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (setupStatus?.current_step) {
      setActiveStep(setupStatus.current_step);
    }
  }, [setupStatus?.current_step]);

  // If setup already completed, redirect
  useEffect(() => {
    if (setupStatus?.setup_completed) {
      navigate('/', { replace: true });
    }
  }, [setupStatus?.setup_completed, navigate]);

  const completeStep = async (stepNum: number) => {
    const stepConfig = SETUP_STEPS[stepNum - 1];
    const nextStep = stepNum + 1;
    
    const updates: Record<string, any> = {
      [stepConfig.key]: true,
      current_step: Math.min(nextStep, 9),
    };

    if (stepNum === 9) {
      updates.setup_completed = true;
      updates.setup_completed_at = new Date().toISOString();
    }

    await updateStep.mutateAsync(updates);

    if (stepNum === 9) {
      navigate('/', { replace: true });
    } else {
      setActiveStep(nextStep);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressPercent = ((activeStep - 1) / 9) * 100;

  const stepComponents: Record<number, React.ReactNode> = {
    1: <StepFarmCreate onComplete={() => completeStep(1)} />,
    2: <StepAddShed onComplete={() => completeStep(2)} />,
    3: <StepRegisterController onComplete={() => completeStep(3)} />,
    4: <StepTestRelays onComplete={() => completeStep(4)} />,
    5: <StepCalibrateSensors onComplete={() => completeStep(5)} />,
    6: <StepSetChickAge onComplete={() => completeStep(6)} />,
    7: <StepAutomationProfile onComplete={() => completeStep(7)} />,
    8: <HardwareValidation 
         onComplete={async (results) => {
           await updateStep.mutateAsync({
             hardware_validation_passed: true,
             hardware_validation_at: new Date().toISOString(),
             hardware_validation_results: results,
             current_step: 9,
           });
           setActiveStep(9);
         }}
         onSkip={() => setActiveStep(9)}
       />,
    9: <StepSimulationTest onComplete={() => completeStep(9)} />,
  };

  const currentStepConfig = SETUP_STEPS[activeStep - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">
            {language === 'bn' ? '🚀 খামার সেটআপ' : '🚀 Farm Setup'}
          </h1>
          <span className="text-xs text-muted-foreground font-mono">
            {activeStep}/9
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 rounded-full" />
      </div>

      {/* Step indicator strip */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto">
        {SETUP_STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = setupStatus?.[s.key as keyof typeof setupStatus] === true;
          const isActive = stepNum === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => isCompleted || stepNum <= activeStep ? setActiveStep(stepNum) : null}
              className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all ${
                isCompleted ? 'bg-primary text-primary-foreground' :
                isActive ? 'bg-primary/20 text-primary ring-2 ring-primary' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {isCompleted ? '✓' : s.icon}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="px-4 pb-8">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{currentStepConfig.icon}</span>
              {language === 'bn' ? currentStepConfig.bn : currentStepConfig.en}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {stepComponents[activeStep]}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        {activeStep > 1 && (
          <Button
            variant="ghost"
            onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
            className="mt-3 w-full h-10 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === 'bn' ? 'আগের ধাপ' : 'Previous Step'}
          </Button>
        )}
      </div>
    </div>
  );
}
