import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Props {
  licenseType: 'trial' | 'lifetime' | 'subscription' | 'suspended';
  licenseExpiresAt: string | null;
  onUpgrade?: () => void;
}

type Lang = 'bn' | 'en';

const t = {
  bn: {
    titleActive: 'ফ্রি ট্রায়াল চলছে',
    titleNearing: 'ট্রায়ালের মেয়াদ কমে আসছে',
    titleCritical: 'ট্রায়াল প্রায় শেষ',
    titleExpired: 'ট্রায়ালের মেয়াদ শেষ',
    expiryLabel: 'মেয়াদ',
    upgrade: 'সাবস্ক্রিপশন আপগ্রেড করুন',
    paymentHint: 'bKash / Nagad / Rocket / ব্যাংক — যেকোনো মাধ্যমে পেমেন্ট করুন',
    expiredMsg: (d: number) => <>আপনার ফ্রি ট্রায়ালের মেয়াদ <strong>{d} দিন</strong> আগে শেষ হয়েছে। সব ফিচার ব্যবহার চালিয়ে যেতে এখনই সাবস্ক্রিপশন নিন।</>,
    todayMsg: <>আপনার ফ্রি ট্রায়াল <strong>আজই</strong> শেষ হচ্ছে। সাবস্ক্রিপশন নিয়ে সব ফিচার চালু রাখুন।</>,
    activeMsg: (d: number, expiry: string) => <>আপনার ফ্রি ট্রায়ালের <strong>{d} দিন</strong> বাকি (মেয়াদ: {expiry})। সাবস্ক্রিপশন নিলে কোনো বাধা ছাড়াই সব ফিচার পাবেন।</>,
  },
  en: {
    titleActive: 'Free trial active',
    titleNearing: 'Trial nearing expiry',
    titleCritical: 'Trial almost over',
    titleExpired: 'Trial expired',
    expiryLabel: 'Expires',
    upgrade: 'Upgrade subscription',
    paymentHint: 'Pay via bKash / Nagad / Rocket / Bank — any method',
    expiredMsg: (d: number) => <>Your free trial expired <strong>{d} day{d === 1 ? '' : 's'} ago</strong>. Subscribe now to keep using all features.</>,
    todayMsg: <>Your free trial expires <strong>today</strong>. Subscribe now to keep all features active.</>,
    activeMsg: (d: number, expiry: string) => <><strong>{d} day{d === 1 ? '' : 's'}</strong> left in your free trial (expires {expiry}). Subscribe to keep all features without interruption.</>,
  },
} as const;

export function TrialStatusBanner({ licenseType, licenseExpiresAt, onUpgrade }: Props) {
  const auth = useAuth() as { language?: Lang };
  const lang: Lang = auth?.language === 'en' ? 'en' : 'bn';
  const tr = t[lang];

  if (licenseType !== 'trial' || !licenseExpiresAt) return null;

  const expires = new Date(licenseExpiresAt);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / msPerDay);
  const expired = daysRemaining <= 0;
  const expiryStr = expires.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US');

  let tone = 'border-primary/40 bg-primary/5';
  let icon = <Sparkles className="h-5 w-5 text-primary" />;
  let title = tr.titleActive;
  let nearExpiry = false;

  if (expired) {
    tone = 'border-destructive/60 bg-destructive/10';
    icon = <AlertTriangle className="h-5 w-5 text-destructive" />;
    title = tr.titleExpired;
    nearExpiry = true;
  } else if (daysRemaining <= 3) {
    tone = 'border-orange-500/60 bg-orange-50 dark:bg-orange-950/30';
    icon = <AlertTriangle className="h-5 w-5 text-orange-600" />;
    title = tr.titleCritical;
    nearExpiry = true;
  } else if (daysRemaining <= 14) {
    tone = 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30';
    icon = <Clock className="h-5 w-5 text-amber-600" />;
    title = tr.titleNearing;
    nearExpiry = true;
  }

  const handleUpgrade = () => {
    if (onUpgrade) return onUpgrade();
    document.getElementById('payment-request-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <Alert className={tone}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <AlertTitle className="font-semibold">{title}</AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {expired
              ? tr.expiredMsg(Math.abs(daysRemaining))
              : daysRemaining === 0
              ? tr.todayMsg
              : tr.activeMsg(daysRemaining, expiryStr)}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleUpgrade}>
                <Sparkles className="w-4 h-4 mr-1" />
                {tr.upgrade}
              </Button>
              {nearExpiry && (
                <span className="text-xs opacity-70 self-center">{tr.paymentHint}</span>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
