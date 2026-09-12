import { useEffect, useState } from 'react';
import { Check, Wrench, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TipKey =
  | 'safety_engine_sensor_fail'
  | 'safety_engine_stuck_relay'
  | 'safety_engine_airflow_ineffective'
  | 'safety_engine_sensor_drift';

interface TipItem {
  id: string;
  bn: string;
  en: string;
}

interface TipDef {
  title: { bn: string; en: string };
  intro: { bn: string; en: string };
  items: TipItem[];
}

const TIPS: Record<TipKey, TipDef> = {
  safety_engine_sensor_fail: {
    title: {
      bn: 'সেন্সর ফেল — দ্রুত সমাধান চেকলিস্ট',
      en: 'Sensor Fail — Quick Fix Checklist',
    },
    intro: {
      bn: 'DHT/SHT সেন্সর থেকে বৈধ ডেটা আসছিল না। নিচের ধাপগুলো একে একে দেখুন:',
      en: 'No valid data from DHT/SHT sensor. Check each step below:',
    },
    items: [
      { id: 'wire', bn: 'সেন্সরের ৪টি তার (VCC/GND/DATA) আঁটসাঁট সংযোগ আছে কিনা', en: 'Sensor wires (VCC/GND/DATA) firmly connected' },
      { id: 'power', bn: '৩.৩V পাওয়ার আসছে কিনা — মাল্টিমিটারে চেক করুন', en: 'Check 3.3V power with multimeter' },
      { id: 'pullup', bn: 'DATA পিনে ১০kΩ পুল-আপ রেজিস্টর আছে কিনা', en: '10kΩ pull-up resistor on DATA pin' },
      { id: 'placement', bn: 'সেন্সর ধুলো/পানি/সরাসরি বাতাসের বাইরে আছে কিনা', en: 'Sensor away from dust, water, direct fan airflow' },
      { id: 'cable', bn: 'কেবলের দৈর্ঘ্য ১ মিটারের কম রাখুন (লম্বা হলে শিল্ডেড)', en: 'Cable length under 1m (use shielded if longer)' },
      { id: 'restart', bn: 'ESP32 রিস্টার্ট দিয়ে দেখুন — সেন্সর ওয়ার্ম-আপ লাগে', en: 'Restart ESP32 — sensor needs warm-up time' },
      { id: 'replace', bn: 'উপরের সব ঠিক হলেও না হলে সেন্সর বদলান', en: 'If all above ok, replace sensor module' },
    ],
  },
  safety_engine_stuck_relay: {
    title: { bn: 'রিলে আটকে গেছে — চেকলিস্ট', en: 'Stuck Relay — Checklist' },
    intro: { bn: 'একটি রিলে কমান্ড অনুযায়ী টগল করছে না।', en: 'A relay is not toggling per command.' },
    items: [
      { id: 'audible', bn: 'রিলে থেকে ক্লিক শব্দ আসছে কিনা শুনুন', en: 'Listen for relay click sound' },
      { id: 'led', bn: 'রিলে বোর্ডের LED জ্বলছে/নিভছে কিনা দেখুন', en: 'Check relay board LED toggles' },
      { id: 'load', bn: 'লোডের তার পুড়ে/গলে গেছে কিনা পরীক্ষা করুন', en: 'Inspect load wires for burn/melt' },
      { id: 'gpio', bn: 'GPIO পিন থেকে রিলে IN পিনে সিগন্যাল আসছে কিনা', en: 'Verify GPIO signal reaches relay IN pin' },
      { id: 'replace', bn: 'রিলে চ্যানেল বদলে অন্য চ্যানেলে চেষ্টা করুন', en: 'Swap to a different relay channel' },
    ],
  },
  safety_engine_airflow_ineffective: {
    title: { bn: 'বাতাস কাজ করছে না — চেকলিস্ট', en: 'Airflow Ineffective — Checklist' },
    intro: { bn: 'ফ্যান চলছে কিন্তু তাপমাত্রা কমছে না।', en: 'Fans running but temperature not dropping.' },
    items: [
      { id: 'direction', bn: 'ফ্যানের দিক ঠিক আছে কিনা (গরম বাতাস বাইরে)', en: 'Fan direction correct (hot air out)' },
      { id: 'blockage', bn: 'ইনলেট/আউটলেটে বাধা/জাল আটকে আছে কিনা', en: 'Inlet/outlet blockage or clogged mesh' },
      { id: 'curtain', bn: 'পর্দা ঠিকমতো খোলা আছে কিনা', en: 'Curtains properly open' },
      { id: 'speed', bn: 'ফ্যানের ব্লেডে ধুলো/ময়লা পরিষ্কার করুন', en: 'Clean dust from fan blades' },
    ],
  },
  safety_engine_sensor_drift: {
    title: { bn: 'সেন্সর ড্রিফট — চেকলিস্ট', en: 'Sensor Drift — Checklist' },
    intro: { bn: 'সেন্সরের রিডিং অস্বাভাবিক বা ক্যালিব্রেশন ছেড়ে গেছে।', en: 'Sensor reading abnormal or out of calibration.' },
    items: [
      { id: 'compare', bn: 'অন্য থার্মোমিটার দিয়ে রিডিং মিলিয়ে দেখুন', en: 'Compare with another thermometer' },
      { id: 'recal', bn: 'সেটিংস → ক্যালিব্রেশন থেকে অফসেট ঠিক করুন', en: 'Adjust offset from Settings → Calibration' },
      { id: 'clean', bn: 'সেন্সর শুকনো কাপড়ে আলতো মুছুন (পানি না)', en: 'Wipe sensor with dry cloth (no water)' },
      { id: 'age', bn: 'সেন্সর ২+ বছর পুরনো হলে বদলান', en: 'Replace sensor if 2+ years old' },
    ],
  },
};

export function getTroubleshootingKey(actionType?: string): TipKey | null {
  if (!actionType) return null;
  if (actionType in TIPS) return actionType as TipKey;
  return null;
}

interface Props {
  tipKey: TipKey;
  logId: string;
  isBn: boolean;
}

export function TroubleshootingTips({ tipKey, logId, isBn }: Props) {
  const tip = TIPS[tipKey];
  const storageKey = `troubleshoot:${tipKey}:${logId}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch { /* noop */ }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  };

  const markAll = () => {
    const all = new Set(tip.items.map((i) => i.id));
    setChecked(all);
    try { localStorage.setItem(storageKey, JSON.stringify([...all])); } catch { /* noop */ }
  };

  const reset = () => {
    setChecked(new Set());
    try { localStorage.removeItem(storageKey); } catch { /* noop */ }
  };

  const done = checked.size;
  const total = tip.items.length;
  const allDone = done === total;

  return (
    <div
      className="mt-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-1">
        <Wrench size={14} className="text-amber-700 dark:text-amber-400" />
        <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
          {isBn ? tip.title.bn : tip.title.en}
        </span>
        <span className="ml-auto text-[10px] font-mono text-amber-700 dark:text-amber-400">
          {done}/{total}
        </span>
      </div>
      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mb-2 flex items-start gap-1">
        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
        {isBn ? tip.intro.bn : tip.intro.en}
      </p>

      <ul className="space-y-1">
        {tip.items.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`w-full flex items-start gap-2 text-left text-[11px] p-1.5 rounded transition-colors ${
                  isChecked
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-300 line-through opacity-70'
                    : 'hover:bg-amber-100/60 dark:hover:bg-amber-900/20 text-foreground'
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                    isChecked
                      ? 'bg-green-600 border-green-600'
                      : 'border-amber-400 dark:border-amber-700'
                  }`}
                >
                  {isChecked && <Check size={10} className="text-white" />}
                </span>
                <span>{isBn ? item.bn : item.en}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2 mt-2">
        {!allDone ? (
          <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={markAll}>
            {isBn ? 'সব ঠিক করেছি' : 'Mark all done'}
          </Button>
        ) : (
          <div className="flex-1 text-[11px] text-green-700 dark:text-green-400 text-center py-1 font-medium">
            ✓ {isBn ? 'চেকলিস্ট সম্পূর্ণ' : 'Checklist complete'}
          </div>
        )}
        {done > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={reset}>
            {isBn ? 'রিসেট' : 'Reset'}
          </Button>
        )}
      </div>
    </div>
  );
}
