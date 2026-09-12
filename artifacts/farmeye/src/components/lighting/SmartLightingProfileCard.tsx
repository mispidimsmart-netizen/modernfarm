import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bird, Egg, Moon, Layers, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLightingSchedule, useUpdateLightingSchedule } from '@/hooks/useFarmData';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type FlockType = 'layer' | 'broiler';

const BROILER_PRESETS = [
  { label_bn: '১২টা–৪টা (৪ ঘ.)', label_en: '12am–4am (4h)', start: '00:00', end: '04:00' },
  { label_bn: '১১টা–৫টা (৬ ঘ.)', label_en: '11pm–5am (6h)', start: '23:00', end: '05:00' },
  { label_bn: '১০টা–৬টা (৮ ঘ.)', label_en: '10pm–6am (8h)', start: '22:00', end: '06:00' },
];

export function SmartLightingProfileCard() {
  const { language } = useAuth();
  const { data: schedule } = useLightingSchedule();
  const updateSchedule = useUpdateLightingSchedule();
  const { toast } = useToast();

  const [flockType, setFlockType] = useState<FlockType>('layer');
  const [layerDarkHours, setLayerDarkHours] = useState(9);
  const [broilerStart, setBroilerStart] = useState('23:00');
  const [broilerEnd, setBroilerEnd] = useState('05:00');
  const [broilerAgeAuto, setBroilerAgeAuto] = useState(true);
  const [fadeCircuits, setFadeCircuits] = useState(2);
  const [fadeStepGap, setFadeStepGap] = useState(5);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!schedule) return;
    const s = schedule as any;
    setFlockType((s.flock_type ?? 'layer') as FlockType);
    setLayerDarkHours(Number(s.layer_dark_hours ?? 9));
    setBroilerStart((s.broiler_dark_start ?? '23:00:00').slice(0, 5));
    setBroilerEnd((s.broiler_dark_end ?? '05:00:00').slice(0, 5));
    setBroilerAgeAuto(Boolean(s.broiler_age_auto ?? true));
    setFadeCircuits(Number(s.fade_circuits ?? 2));
    setFadeStepGap(Number(s.fade_step_gap_minutes ?? 5));
    setHasChanges(false);
  }, [schedule]);

  const mark = () => setHasChanges(true);

  const save = () => {
    updateSchedule.mutate(
      {
        flock_type: flockType,
        layer_dark_hours: layerDarkHours,
        broiler_dark_start: broilerStart,
        broiler_dark_end: broilerEnd,
        broiler_age_auto: broilerAgeAuto,
        fade_circuits: fadeCircuits,
        fade_step_gap_minutes: fadeStepGap,
      } as any,
      {
        onSuccess: () => {
          setHasChanges(false);
          toast({
            title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
            description: language === 'bn' ? 'স্মার্ট লাইটিং প্রোফাইল আপডেট হয়েছে' : 'Smart lighting profile updated',
          });
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Layers size={20} />
        </div>
        <div>
          <h3 className="font-semibold">
            {language === 'bn' ? '🐔 স্মার্ট লাইটিং প্রোফাইল' : '🐔 Smart Lighting Profile'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' ? 'মুরগির ধরন অনুযায়ী আলোর সিদ্ধান্ত' : 'Lighting decisions per flock type'}
          </p>
        </div>
      </div>

      {/* Flock Type */}
      <div className="mb-5">
        <p className="mb-2 text-sm font-medium">
          {language === 'bn' ? 'মুরগির ধরন' : 'Flock Type'}
        </p>
        <Tabs value={flockType} onValueChange={(v) => { setFlockType(v as FlockType); mark(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="layer" className="gap-2">
              <Egg size={14} /> {language === 'bn' ? 'লেয়ার' : 'Layer'}
            </TabsTrigger>
            <TabsTrigger value="broiler" className="gap-2">
              <Bird size={14} /> {language === 'bn' ? 'ব্রয়লার' : 'Broiler'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Layer settings */}
      {flockType === 'layer' && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Moon size={16} className="text-indigo-500" />
              {language === 'bn' ? 'রাতে অন্ধকার সময়' : 'Night Dark Period'}
            </label>
            <Badge variant="outline">
              {layerDarkHours} {language === 'bn' ? 'ঘন্টা' : 'hours'}
            </Badge>
          </div>
          <Slider
            value={[layerDarkHours]}
            onValueChange={(v) => { setLayerDarkHours(v[0]); mark(); }}
            min={6}
            max={12}
            step={1}
            className="py-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {language === 'bn'
              ? `প্রতিদিন ${24 - layerDarkHours} ঘন্টা আলো + ${layerDarkHours} ঘন্টা পূর্ণ অন্ধকার বিশ্রাম`
              : `${24 - layerDarkHours}h light + ${layerDarkHours}h full dark rest per day`}
          </p>
          <div className="mt-2 text-xs">
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {language === 'bn' ? '💡 সুপারিশ:' : '💡 Recommended:'}
            </span>{' '}
            <span className="text-muted-foreground">
              {language === 'bn' ? '৯ ঘন্টা (১৫ ঘন্টা আলো) — ভাল উৎপাদন + পর্যাপ্ত বিশ্রাম' : '9h dark (15h light) — peak production + rest'}
            </span>
          </div>
        </div>
      )}

      {/* Broiler settings */}
      {flockType === 'broiler' && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
          <p className="mb-2 text-sm font-medium">
            {language === 'bn' ? 'রাতের অন্ধকার সময় (৮ দিনের পর)' : 'Night Dark Period (after day 8)'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BROILER_PRESETS.map((p) => {
              const active = broilerStart === p.start && broilerEnd === p.end;
              return (
                <button
                  key={p.start}
                  onClick={() => { setBroilerStart(p.start); setBroilerEnd(p.end); mark(); }}
                  className={`rounded-lg border p-2 text-xs font-medium transition ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  {language === 'bn' ? p.label_bn : p.label_en}
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-dashed p-3">
            <input
              type="checkbox"
              checked={broilerAgeAuto}
              onChange={(e) => { setBroilerAgeAuto(e.target.checked); mark(); }}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {language === 'bn' ? 'বয়স অনুযায়ী অটো শিডিউল' : 'Age-based auto schedule'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? 'দিন ১–৭: ২৩ ঘন্টা আলো | দিন ৮+: এই অন্ধকার সময় প্রয়োগ হবে'
                  : 'Day 1–7: 23h light | Day 8+: dark period above is applied'}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Fade circuits */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">
            {language === 'bn' ? 'ফেড সিমুলেশন (ধাপে ধাপে)' : 'Fade Simulation (stepped)'}
          </label>
          <Badge variant="outline">
            {fadeCircuits === 1
              ? (language === 'bn' ? '১ সার্কিট' : '1 circuit')
              : `${fadeCircuits} ${language === 'bn' ? 'সার্কিট' : 'circuits'}`}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => { setFadeCircuits(n); mark(); }}
              className={`rounded-lg border p-2 text-xs font-medium transition ${
                fadeCircuits === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50'
              }`}
            >
              {n === 1 && (language === 'bn' ? '১টা (ON/OFF)' : '1 (ON/OFF)')}
              {n === 2 && (language === 'bn' ? '২টা (২ ধাপ)' : '2 (2-step)')}
              {n === 3 && (language === 'bn' ? '৩টা (৩ ধাপ)' : '3 (3-step)')}
            </button>
          ))}
        </div>
        {fadeCircuits > 1 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {language === 'bn' ? 'ধাপের মধ্যে বিরতি' : 'Gap between steps'}
              </span>
              <Badge variant="outline" className="text-xs">
                {fadeStepGap} {language === 'bn' ? 'মিনিট' : 'min'}
              </Badge>
            </div>
            <Slider
              value={[fadeStepGap]}
              onValueChange={(v) => { setFadeStepGap(v[0]); mark(); }}
              min={1}
              max={15}
              step={1}
              className="py-2"
            />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {language === 'bn'
            ? `ভোরে ও সন্ধ্যায় আলো একসাথে না জ্বেলে ${fadeCircuits} ধাপে চালু/বন্ধ হবে — মুরগির স্ট্রেস কম।`
            : `Lights turn on/off in ${fadeCircuits} step(s) at dawn/dusk — reduces flock stress.`}
        </p>
      </div>

      <Button onClick={save} disabled={!hasChanges || updateSchedule.isPending} className="w-full gap-2">
        <Save size={16} />
        {updateSchedule.isPending
          ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
          : (language === 'bn' ? 'প্রোফাইল সংরক্ষণ' : 'Save Profile')}
      </Button>
    </motion.div>
  );
}
