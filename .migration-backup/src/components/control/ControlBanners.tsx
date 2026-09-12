import { Link } from 'react-router-dom';
import { AlertTriangle, Hand, Bot, Settings, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FarmGuardProps {
  language: 'bn' | 'en';
  farmsLoading: boolean;
  farmCount: number;
}

/** Blocking banner shown when no farm is selected — commands are disabled. */
export function FarmGuardBanner({ language, farmsLoading, farmCount }: FarmGuardProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-destructive/60 bg-destructive/10 p-4 flex items-start gap-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-destructive">
          {language === 'bn'
            ? '⚠️ কোনো ফার্ম নির্বাচন করা নেই — কমান্ড পাঠানো বন্ধ'
            : '⚠️ No farm selected — commands are disabled'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {farmsLoading
            ? (language === 'bn' ? 'ফার্ম লোড হচ্ছে…' : 'Loading farms…')
            : farmCount === 0
              ? (language === 'bn'
                  ? 'আপনার কোনো ফার্ম নেই। সেটিংস → ফার্মে গিয়ে প্রথমে একটি ফার্ম তৈরি করুন।'
                  : 'You do not have any farms yet. Create one from Settings → Farm.')
              : (language === 'bn'
                  ? 'উপরের হেডার থেকে একটি ফার্ম বেছে নিন, নাহলে ডিভাইস কমান্ড ব্যাকএন্ড দ্বারা ব্লক হবে।'
                  : 'Pick a farm from the header — without a valid farm the backend will reject device commands.')}
        </p>
        <Link
          to="/settings"
          className="inline-block mt-2 text-xs font-semibold text-destructive underline underline-offset-2"
        >
          {language === 'bn' ? 'সেটিংস → ফার্মে যান' : 'Go to Settings → Farm'}
        </Link>
      </div>
    </div>
  );
}

interface ModeBannerProps {
  language: 'bn' | 'en';
  isManualMode: boolean;
  /** Cloud intent not yet mirrored by the ESP32 (manual_override mismatch). */
  modeSyncPending?: boolean;
  /** device_status row older than the online threshold. */
  isStatusStale?: boolean;
  /** Timestamp (ms) of the last hardware ack, for the "last seen" hint. */
  lastAckAt?: number | null;
}

function formatAgo(ms: number, language: 'bn' | 'en'): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return language === 'bn' ? `${mins} মিনিট আগে` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return language === 'bn' ? `${hrs} ঘণ্টা আগে` : `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return language === 'bn' ? `${days} দিন আগে` : `${days} d ago`;
}

/** Read-only indicator of the current automation mode (switching lives in Settings). */
export function ControlModeBanner({
  language,
  isManualMode,
  modeSyncPending = false,
  isStatusStale = false,
  lastAckAt = null,
}: ModeBannerProps) {
  return (
    <div className={`rounded-2xl border-2 p-3 space-y-2 ${
      isManualMode
        ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-amber-600/5'
        : 'border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10'
    }`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          isManualMode ? 'bg-amber-500/20 text-amber-600' : 'bg-primary/15 text-primary'
        }`}>
          {isManualMode ? <Hand className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold">
              {isManualMode
                ? (language === 'bn' ? '✋ ম্যানুয়াল মোড' : '✋ Manual Mode')
                : (language === 'bn' ? '🤖 অটো মোড' : '🤖 Auto Mode')}
            </p>
            <Badge variant="secondary" className={`text-[10px] ${
              isManualMode
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                : 'bg-primary/20 text-primary'
            }`}>
              {isManualMode
                ? (language === 'bn' ? 'সরাসরি কন্ট্রোল' : 'Direct Control')
                : (language === 'bn' ? 'টাইমার কন্ট্রোল' : 'Timer Control')}
            </Badge>
            {modeSyncPending && (
              <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400">
                {language === 'bn' ? '⏳ ডিভাইস নিশ্চিত করেনি' : '⏳ Not confirmed by device'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isManualMode
              ? (language === 'bn' ? 'আপনি সরাসরি ON/OFF করতে পারবেন' : 'You can directly toggle ON/OFF')
              : (language === 'bn' ? 'সাময়িক কন্ট্রোল — টাইমার শেষে অটো ফিরবে' : 'Temporary control — returns to auto after timer')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/settings?tab=devices"
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          title={language === 'bn' ? 'সেটিংস থেকে মোড পরিবর্তন করুন' : 'Change mode from Settings'}
        >
          {language === 'bn' ? 'মোড পরিবর্তন → সেটিংস' : 'Change mode → Settings'}
        </Link>
        <Link to="/settings" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
      </div>

      {isStatusStale && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-muted-foreground/30 bg-muted/40 px-3 py-2"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {language === 'bn'
              ? `ডিভাইস থেকে নতুন তথ্য আসছে না — নিচের ON/OFF অবস্থা সর্বশেষ জানা অবস্থা${
                  lastAckAt ? ` (${formatAgo(Date.now() - lastAckAt, 'bn')})` : ''
                }, লাইভ নয়।`
              : `No fresh data from the device — the ON/OFF states below are the last known values${
                  lastAckAt ? ` (${formatAgo(Date.now() - lastAckAt, 'en')})` : ''
                }, not live.`}
          </p>
        </div>
      )}
    </div>
  );

}

/** Offline-first reassurance footer. */
export function ControlSafetyFooter({ language }: { language: 'bn' | 'en' }) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-center space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        🛡️ {language === 'bn'
          ? 'নেট না থাকলেও খামার চলবে • সমস্ত ম্যানুয়াল অ্যাকশন স্বয়ংক্রিয়ভাবে মেয়াদ শেষ হয়'
          : 'Farm runs without internet • All manual actions expire automatically'}
      </p>
    </div>
  );
}
