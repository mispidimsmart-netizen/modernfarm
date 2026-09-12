import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useSheds, useAddShed } from '@/hooks/useSheds';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SETUP_AUTOMATION_PROFILES } from '@/data/setupWizardOptions';

export function StepFarmCreate({ onComplete }: { onComplete: () => void }) {
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

export function StepAddShed({ onComplete }: { onComplete: () => void }) {
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

export function StepSetChickAge({ onComplete }: { onComplete: () => void }) {
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

export function StepAutomationProfile({ onComplete }: { onComplete: () => void }) {
  const { language } = useAuth();
  const [profile, setProfile] = useState<string>('balanced');

  return (
    <div className="space-y-3">
      {SETUP_AUTOMATION_PROFILES.map(p => (
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
