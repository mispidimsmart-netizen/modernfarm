/**
 * WorkerLockScreen — full-screen 4-digit PIN entry for Worker Mode (S2.1)
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Delete, Lock, ShieldAlert } from 'lucide-react';
import { useFarmContext } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { useFarmHasWorkerPin, useVerifyWorkerPin } from '@/hooks/useWorkerPin';
import { cn } from '@/lib/utils';

interface WorkerLockScreenProps {
  /** Called when PIN verifies successfully */
  onUnlocked: () => void;
  /** Optional title override */
  title?: { bn: string; en: string };
}

const PIN_LEN = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

export function WorkerLockScreen({ onUnlocked, title }: WorkerLockScreenProps) {
  const { language } = useAuth();
  const { selectedFarmId, currentFarm } = useFarmContext();
  const { data: hasPin, isLoading: checkingPin } = useFarmHasWorkerPin(selectedFarmId);
  const verify = useVerifyWorkerPin();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const t = {
    title: title ?? { bn: 'কর্মী মোড — PIN দিন', en: 'Worker Mode — Enter PIN' },
    sub:   { bn: 'খামারের ৪-সংখ্যার PIN দিয়ে আনলক করুন', en: 'Enter the 4-digit farm PIN to unlock' },
    noPin: { bn: 'এই খামারে কর্মী মোড সক্রিয় নয়। মালিককে সেটিংস → কর্মী মোড থেকে PIN সেট করতে বলুন।',
             en: 'Worker mode is not enabled for this farm. Ask the owner to set a PIN in Settings → Worker Mode.' },
    wrong: { bn: 'ভুল PIN', en: 'Wrong PIN' },
    farm:  { bn: 'খামার', en: 'Farm' },
  };

  // Auto-submit on full PIN
  useEffect(() => {
    if (pin.length !== PIN_LEN || !selectedFarmId) return;
    let cancelled = false;
    verify.mutate(
      { farmId: selectedFarmId, pin },
      {
        onSuccess: (ok) => {
          if (cancelled) return;
          if (ok) {
            onUnlocked();
          } else {
            setError(t.wrong[language]);
            setShake(true);
            setTimeout(() => { setPin(''); setShake(false); }, 350);
          }
        },
        onError: () => {
          if (cancelled) return;
          setError(t.wrong[language]);
          setShake(true);
          setTimeout(() => { setPin(''); setShake(false); }, 350);
        },
      }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleKey = (k: string) => {
    setError(null);
    if (k === 'back') {
      setPin(p => p.slice(0, -1));
    } else if (/^[0-9]$/.test(k)) {
      setPin(p => (p.length < PIN_LEN ? p + k : p));
    }
  };

  if (checkingPin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasPin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-lg">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <ShieldAlert size={24} />
          </div>
          <h1 className="mb-2 text-lg font-bold text-foreground">
            {language === 'bn' ? 'PIN সেট করা নেই' : 'PIN not set'}
          </h1>
          <p className="text-sm text-muted-foreground">{t.noPin[language]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock size={28} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">{t.title[language]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.sub[language]}</p>
          {currentFarm && (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {t.farm[language]}: <span className="text-foreground">{language === 'bn' ? currentFarm.name : currentFarm.name_en}</span>
            </p>
          )}
        </div>

        <motion.div
          animate={shake ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.32 }}
          className="flex items-center justify-center gap-3"
        >
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2',
                i < pin.length
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/40 bg-transparent'
              )}
            />
          ))}
        </motion.div>

        {error && (
          <p className="text-xs font-semibold text-destructive" role="alert">{error}</p>
        )}

        <div className="grid w-full grid-cols-3 gap-3">
          {KEYS.map((k, idx) => {
            if (k === '') return <div key={idx} />;
            const isBack = k === 'back';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleKey(k)}
                disabled={verify.isPending}
                className={cn(
                  'h-16 rounded-xl border bg-card text-2xl font-semibold text-foreground',
                  'transition active:scale-95 disabled:opacity-50',
                  'hover:bg-accent'
                )}
                aria-label={isBack ? (language === 'bn' ? 'মুছুন' : 'Delete') : k}
              >
                {isBack ? <Delete className="mx-auto" size={22} /> : k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WorkerLockScreen;
