import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  licenseType: 'trial' | 'lifetime' | 'subscription' | 'suspended';
  licenseExpiresAt: string | null;
  onUpgrade?: () => void;
}

export function TrialStatusBanner({ licenseType, licenseExpiresAt, onUpgrade }: Props) {
  if (licenseType !== 'trial' || !licenseExpiresAt) return null;

  const expires = new Date(licenseExpiresAt);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / msPerDay);
  const expired = daysRemaining <= 0;

  // tone & messaging
  let tone = 'border-primary/40 bg-primary/5';
  let icon = <Sparkles className="h-5 w-5 text-primary" />;
  let title = 'ফ্রি ট্রায়াল চলছে';
  let nearExpiry = false;

  if (expired) {
    tone = 'border-destructive/60 bg-destructive/10';
    icon = <AlertTriangle className="h-5 w-5 text-destructive" />;
    title = 'ট্রায়ালের মেয়াদ শেষ';
    nearExpiry = true;
  } else if (daysRemaining <= 3) {
    tone = 'border-orange-500/60 bg-orange-50 dark:bg-orange-950/30';
    icon = <AlertTriangle className="h-5 w-5 text-orange-600" />;
    title = 'ট্রায়াল প্রায় শেষ';
    nearExpiry = true;
  } else if (daysRemaining <= 14) {
    tone = 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30';
    icon = <Clock className="h-5 w-5 text-amber-600" />;
    title = 'ট্রায়ালের মেয়াদ কমে আসছে';
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
            {expired ? (
              <>আপনার ফ্রি ট্রায়ালের মেয়াদ <strong>{Math.abs(daysRemaining)} দিন</strong> আগে শেষ হয়েছে। সব ফিচার ব্যবহার চালিয়ে যেতে এখনই সাবস্ক্রিপশন নিন।</>
            ) : daysRemaining === 0 ? (
              <>আপনার ফ্রি ট্রায়াল <strong>আজই</strong> শেষ হচ্ছে। সাবস্ক্রিপশন নিয়ে সব ফিচার চালু রাখুন।</>
            ) : (
              <>আপনার ফ্রি ট্রায়ালের <strong>{daysRemaining} দিন</strong> বাকি (মেয়াদ: {expires.toLocaleDateString('bn-BD')})। সাবস্ক্রিপশন নিলে কোনো বাধা ছাড়াই সব ফিচার পাবেন।</>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleUpgrade}>
                <Sparkles className="w-4 h-4 mr-1" />
                সাবস্ক্রিপশন আপগ্রেড করুন
              </Button>
              {nearExpiry && (
                <span className="text-xs opacity-70 self-center">
                  bKash / Nagad / Rocket / ব্যাংক — যেকোনো মাধ্যমে পেমেন্ট করুন
                </span>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
