import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Language, VerifyErrorState } from './types';
import type { CodegenLabels } from './labels';

interface Props {
  language: Language;
  t: CodegenLabels;
  verifyError: VerifyErrorState;
  isDownloading: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

/** Inline troubleshooting guide shown when firmware content verification fails. */
export function VerifyErrorGuide({ language, t, verifyError, isDownloading, onRetry, onDismiss }: Props) {
  const bn = language === 'bn';
  const steps = bn
    ? [
        'Browser cache clear করুন (Ctrl+Shift+R বা Cmd+Shift+R দিয়ে hard reload)।',
        'Service Worker disable / unregister করুন (DevTools → Application → Service Workers → Unregister)।',
        `নিশ্চিত করুন hardware ও firmware version মিলেছে (এখন: ${verifyError.expected.toUpperCase()})।`,
        'নিচের Retry বোতাম চাপুন — fresh fetch হবে।',
        'এখনও fail করলে অন্য network/incognito tab থেকে চেষ্টা করুন বা support-কে জানান।',
      ]
    : [
        'Clear browser cache (hard reload with Ctrl+Shift+R or Cmd+Shift+R).',
        'Unregister service worker (DevTools → Application → Service Workers → Unregister).',
        `Confirm hardware and firmware versions match (now: ${verifyError.expected.toUpperCase()}).`,
        'Press Retry below — a fresh fetch will run.',
        'If it still fails, try another network/incognito tab or contact support.',
      ];

  return (
    <div className="space-y-2 p-3 bg-destructive/10 border border-destructive/40 rounded-lg">
      <p className="text-sm font-semibold text-destructive">
        {bn
          ? `❌ যাচাই ব্যর্থ — প্রত্যাশিত ${verifyError.expected.toUpperCase()}, পাওয়া গেছে ${verifyError.detected === 'unknown' ? 'অজানা' : verifyError.detected.toUpperCase()}`
          : `❌ Verification failed — expected ${verifyError.expected.toUpperCase()}, got ${verifyError.detected === 'unknown' ? 'unknown' : verifyError.detected.toUpperCase()}`}
      </p>
      <ol className="text-xs text-destructive/90 list-decimal pl-5 space-y-1">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="destructive" disabled={isDownloading} onClick={onRetry}>
          {isDownloading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> {t.downloading}
            </>
          ) : (
            <>🔄 {bn ? 'পুনরায় চেষ্টা করুন (Retry)' : 'Retry'}</>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          {bn ? 'বন্ধ করুন' : 'Dismiss'}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground break-all pt-1">URL: {verifyError.url}</p>
    </div>
  );
}
