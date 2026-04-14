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
  const [isRegistering, setIsRegistering] = useState(false);
  const [showFirmwareDownload, setShowFirmwareDownload] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const { toast } = useToast();

  // Auto-generate a unique token
  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `FARM-${segment(4)}-${segment(4)}-${segment(4)}`;
  };

  // Generate token on mount
  useEffect(() => {
    setGeneratedToken(generateToken());
  }, []);

  const handleRegister = async () => {
    if (!generatedToken || !user || !selectedFarmId) return;
    setIsRegistering(true);
    try {
      const { error } = await supabase.from('device_tokens').insert({
        user_id: user.id,
        token: generatedToken,
        device_name: 'ESP32 Controller',
        farm_id: selectedFarmId,
      });
      if (error) throw error;
      toast({ title: language === 'bn' ? '✅ কন্ট্রোলার রেজিস্টার হয়েছে!' : '✅ Controller registered!' });
      onComplete();
    } catch (err: any) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    }
    setIsRegistering(false);
  };

  // Check if already has tokens
  const [hasToken, setHasToken] = useState(false);
  const [existingToken, setExistingToken] = useState('');
  useEffect(() => {
    if (!user || !selectedFarmId) return;
    supabase.from('device_tokens').select('id, token').eq('user_id', user.id).eq('farm_id', selectedFarmId).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        setHasToken(true);
        setExistingToken(data[0].token);
      }
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
          <div className="mt-3 rounded-xl bg-background/80 p-3">
            <p className="text-xs text-muted-foreground mb-1">{language === 'bn' ? 'ডিভাইস টোকেন' : 'Device Token'}</p>
            <p className="font-mono text-sm font-bold text-foreground select-all">{existingToken}</p>
          </div>
        </div>

        {/* Firmware download - always visible & prominent */}
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">
              {language === 'bn' ? '📥 ফার্মওয়্যার ডাউনলোড করুন (আবশ্যক)' : '📥 Download Firmware (Required)'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'bn' 
              ? '⚠️ পরবর্তী ধাপে রিলে/সেন্সর পরীক্ষার জন্য ESP32-এ ফার্মওয়্যার আপলোড করা আবশ্যক'
              : '⚠️ Firmware must be uploaded to ESP32 before relay/sensor tests in next steps'}
          </p>
          <button
            onClick={() => setShowFirmwareDownload(!showFirmwareDownload)}
            className="w-full flex items-center justify-between rounded-xl bg-primary/10 p-3 hover:bg-primary/15 transition-colors"
          >
            <span className="text-sm font-medium text-primary">
              {showFirmwareDownload 
                ? (language === 'bn' ? '🔽 ফার্মওয়্যার কোড লুকান' : '🔽 Hide firmware code')
                : (language === 'bn' ? '▶️ ফার্মওয়্যার কোড দেখুন ও ডাউনলোড করুন' : '▶️ View & download firmware code')
              }
            </span>
            <ChevronRight className={`h-4 w-4 text-primary transition-transform ${showFirmwareDownload ? 'rotate-90' : ''}`} />
          </button>
          {showFirmwareDownload && (
            <div className="mt-3 border-t border-primary/20 pt-3">
              <ESP32CodeGenerator language={language} />
            </div>
          )}
        </div>

        {/* Flashing guide tip */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {language === 'bn' 
              ? '💡 Arduino IDE-তে আপলোড: Upload Speed ১১৫২০০, Flash Freq ৪০MHz, "Erase All Flash" চালু রাখুন। ফ্ল্যাশিংয়ের সময় শুধু USB কেবল ব্যবহার করুন।'
              : '💡 Arduino IDE upload: Speed 115200, Flash Freq 40MHz, "Erase All Flash" enabled. Use USB cable only during flashing.'}
          </p>
        </div>

        <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl">
          {language === 'bn' ? 'ফার্মওয়্যার আপলোড হয়ে গেছে → পরবর্তী ধাপ' : 'Firmware uploaded → Next Step'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
        <span className="text-5xl">🔑</span>
        <h3 className="mt-3 text-lg font-bold text-foreground">
          {language === 'bn' ? 'অটো-জেনারেটেড ডিভাইস টোকেন' : 'Auto-Generated Device Token'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'এই টোকেন আপনার ESP32 কন্ট্রোলারের জন্য তৈরি হয়েছে'
            : 'This token is generated for your ESP32 controller'}
        </p>
      </div>
      
      {/* Show generated token */}
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-center">
        <p className="text-xs text-muted-foreground mb-2">{language === 'bn' ? 'আপনার ডিভাইস টোকেন' : 'Your Device Token'}</p>
        <p className="font-mono text-xl font-bold text-primary select-all tracking-wider">{generatedToken}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {language === 'bn' 
            ? '⚡ ফার্মওয়্যার ডাউনলোডের সময় এটি অটো-এম্বেড হবে'
            : '⚡ This will be auto-embedded when downloading firmware'}
        </p>
        <button 
          onClick={() => setGeneratedToken(generateToken())}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
        >
          <RotateCcw className="h-3 w-3" />
          {language === 'bn' ? 'নতুন টোকেন তৈরি করুন' : 'Generate new token'}
        </button>
      </div>

      <Button onClick={handleRegister} disabled={isRegistering} className="w-full h-12 text-base rounded-xl">
        {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : (language === 'bn' ? '📱 টোকেন রেজিস্টার করুন →' : '📱 Register Token →')}
      </Button>
    </div>
  );
}

function StepTestRelays({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const navigate = useNavigate();
  const sendCommand = useSendDeviceCommand();
  const { isConnected } = useRealtimeSensorData();
  const [tested, setTested] = useState<Record<string, boolean>>({});
  const relays = [
    { key: 'fan', icon: '🌀', en: 'Exhaust Fan (IN1 - GPIO 25)', bn: 'এক্সহস্ট ফ্যান (IN1 - GPIO 25)' },
    { key: 'ceiling_fan', icon: '🔄', en: 'Ceiling Fan (IN2 - GPIO 26)', bn: 'সিলিং ফ্যান (IN2 - GPIO 26)' },
    { key: 'light', icon: '💡', en: 'Light (IN3 - GPIO 27)', bn: 'লাইট (IN3 - GPIO 27)' },
    { key: 'heater', icon: '🔥', en: 'Heater (IN4 - GPIO 14)', bn: 'হিটার (IN4 - GPIO 14)' },
    { key: 'fogger', icon: '💧', en: 'Fogger (IN5 - GPIO 12)', bn: 'ফগার (IN5 - GPIO 12)' },
    { key: 'alarm', icon: '🔔', en: 'Buzzer/Alarm (IN6 - GPIO 13)', bn: 'বাজার/অ্যালার্ম (IN6 - GPIO 13)' },
    { key: 'sprinkler', icon: '🚿', en: 'Sprinkler (IN7 - GPIO 15)', bn: 'স্প্রিংকলার (IN7 - GPIO 15)' },
    { key: 'circulation_fan', icon: '🌬️', en: 'Circulation Fan (IN8 - GPIO 33)', bn: 'সার্কুলেশন ফ্যান (IN8 - GPIO 33)' },
  ];

  const testRelay = async (key: string) => {
    await sendCommand.mutateAsync({ commandType: key as any, commandValue: true });
    setTimeout(async () => {
      await sendCommand.mutateAsync({ commandType: key as any, commandValue: false });
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

  const devices = [
    { key: 'fan', icon: '🌀', bn: 'এক্সহস্ট ফ্যান', en: 'Exhaust Fan' },
    { key: 'ceiling_fan', icon: '🔄', bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
    { key: 'light', icon: '💡', bn: 'লাইট', en: 'Light' },
    { key: 'heater', icon: '🔥', bn: 'হিটার', en: 'Heater' },
    { key: 'fogger', icon: '💧', bn: 'ফগার', en: 'Fogger' },
    { key: 'alarm', icon: '🔔', bn: 'বাজার', en: 'Buzzer' },
    { key: 'sprinkler', icon: '🚿', bn: 'স্প্রিংকলার', en: 'Sprinkler' },
    { key: 'circulation_fan', icon: '🌬️', bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
  ];

  const runSimulation = useCallback(async () => {
    setPhase('running');
    setProgress(0);
    setLog([]);

    try {
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const label = language === 'bn' ? device.bn : device.en;
        addLog(`${device.icon} ${label} ${language === 'bn' ? 'চালু হচ্ছে...' : 'starting...'}`);
        await sendCommand.mutateAsync({ commandType: device.key as any, commandValue: true });
        
        const segmentSize = 100 / devices.length;
        const startPct = i * segmentSize;
        for (let p = 0; p <= segmentSize; p += segmentSize / 3) {
          await new Promise(r => setTimeout(r, 500));
          setProgress(Math.min(startPct + p, 100));
        }
        
        await sendCommand.mutateAsync({ commandType: device.key as any, commandValue: false });
        addLog(`✅ ${label} ${language === 'bn' ? 'পরীক্ষা সফল' : 'test passed'}`);
      }

      addLog(language === 'bn' ? '🎉 সিমুলেশন সম্পন্ন! ৮টি ডিভাইস পরীক্ষিত।' : '🎉 Simulation complete! 8 devices tested.');
      setProgress(100);
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
