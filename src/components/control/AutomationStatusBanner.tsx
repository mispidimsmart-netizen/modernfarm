import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldOff, AlertTriangle, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export interface AutomationStatusBannerProps {
  automationEnabled: boolean;
  hasTemporaryOverrides: boolean;
  onToggleAutomation: (enabled: boolean, reason?: string) => void;
  canToggle?: boolean;
  overrideRemainingSeconds?: number | null;
  isOutOfBioRange?: boolean;
}

export function AutomationStatusBanner({
  automationEnabled,
  hasTemporaryOverrides,
  onToggleAutomation,
  canToggle = true,
  overrideRemainingSeconds,
  isOutOfBioRange,
}: AutomationStatusBannerProps) {
  const { language } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);
  const [overrideReason, setOverrideReason] = useState('');

  const getStatus = () => {
    if (!automationEnabled) {
      return {
        label: { bn: '🔴 ম্যানুয়াল মোড সক্রিয়', en: '🔴 MANUAL MODE ACTIVE' },
        description: { 
          bn: 'অটোমেশন বন্ধ - পাখির সুরক্ষা ঝুঁকিতে আছে', 
          en: 'Automation disabled - bird safety at risk' 
        },
        bgClass: 'bg-red-500/20 border-red-500',
        iconClass: 'text-red-500',
        Icon: ShieldOff,
      };
    }
    if (hasTemporaryOverrides) {
      return {
        label: { bn: '🟠 সাময়িক ম্যানুয়াল কন্ট্রোল', en: '🟠 TEMPORARY MANUAL CONTROL' },
        description: { 
          bn: 'কিছু ডিভাইস সাময়িকভাবে ম্যানুয়াল মোডে আছে', 
          en: 'Some devices temporarily in manual mode' 
        },
        bgClass: 'bg-amber-500/20 border-amber-500',
        iconClass: 'text-amber-500',
        Icon: ShieldAlert,
      };
    }
    return {
      label: { bn: '🟢 অটোমেশন সক্রিয়', en: '🟢 AUTOMATION ENABLED' },
      description: { 
        bn: 'সিস্টেম স্বয়ংক্রিয়ভাবে পাখির সুরক্ষা দিচ্ছে', 
        en: 'System is automatically protecting birds' 
      },
      bgClass: 'bg-emerald-500/20 border-emerald-500',
      iconClass: 'text-emerald-500',
      Icon: Shield,
    };
  };

  const status = getStatus();
  const StatusIcon = status.Icon;

  const handleDisableClick = () => {
    setConfirmStep(1);
    setShowConfirmDialog(true);
  };

  const handleFirstConfirm = () => {
    setConfirmStep(2);
  };

  const handleSecondConfirm = () => {
    if (!overrideReason.trim()) return;
    onToggleAutomation(false, overrideReason.trim());
    setShowConfirmDialog(false);
    setConfirmStep(1);
    setOverrideReason('');
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setConfirmStep(1);
    setOverrideReason('');
  };

  // Format remaining seconds for display
  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border-2 p-4 ${status.bgClass}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-background/50 ${status.iconClass}`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{status.label[language]}</h3>
              <p className="text-sm text-muted-foreground">{status.description[language]}</p>
            </div>
          </div>
          
          {automationEnabled && canToggle && (
            <button
              onClick={handleDisableClick}
              className="text-xs px-3 py-1.5 rounded-lg bg-background/50 border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Disable'}
            </button>
          )}
          
          {!automationEnabled && canToggle && (
            <button
              onClick={() => onToggleAutomation(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {language === 'bn' ? 'চালু করুন' : 'Enable'}
            </button>
          )}
          
          {!canToggle && (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
              {language === 'bn' ? '🔒 অ্যাডমিন প্রয়োজন' : '🔒 Admin required'}
            </span>
          )}
        </div>

        {/* Override countdown timer */}
        {!automationEnabled && overrideRemainingSeconds != null && overrideRemainingSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-background/60 border border-border px-3 py-2"
          >
            <Timer className="h-4 w-4 text-destructive" />
            <span className="text-sm font-mono font-bold text-destructive">
              {formatRemaining(overrideRemainingSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">
              {language === 'bn'
                ? (isOutOfBioRange
                    ? '⚠️ জৈবিক সীমা অতিক্রম — ১৫ মিনিটে অটো ফিরবে'
                    : 'অটো মোডে ফিরে যাওয়ার সময় বাকি')
                : (isOutOfBioRange
                    ? '⚠️ Bio limit exceeded — auto-revert in progress'
                    : 'until auto-revert to AUTO mode')}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Double Confirmation Dialog with Reason */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              {confirmStep === 1 
                ? (language === 'bn' ? 'সতর্কতা!' : 'Warning!')
                : (language === 'bn' ? 'কারণ লিখুন ও নিশ্চিত করুন' : 'Provide reason & confirm')
              }
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {confirmStep === 1 ? (
                  <>
                    <p className="text-base">
                      {language === 'bn' 
                        ? 'অটোমেশন বন্ধ করলে নিম্নলিখিত সুরক্ষা বন্ধ হয়ে যাবে:'
                        : 'Disabling automation will turn off these protections:'}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>{language === 'bn' ? '🔥 হিট স্ট্রেস থেকে সুরক্ষা' : '🔥 Heat stress protection'}</li>
                      <li>{language === 'bn' ? '💨 গ্যাস পরিষ্কার ভেন্টিলেশন' : '💨 Gas purge ventilation'}</li>
                      <li>{language === 'bn' ? '🌡️ তাপমাত্রা নিয়ন্ত্রণ' : '🌡️ Temperature control'}</li>
                      <li>{language === 'bn' ? '⏰ স্বয়ংক্রিয় শিডিউল' : '⏰ Automatic schedules'}</li>
                    </ul>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        {language === 'bn'
                          ? '⏱️ ম্যানুয়াল ওভাররাইড সর্বোচ্চ ২০ মিনিট চলবে, তারপর সিস্টেম স্বয়ংক্রিয়ভাবে নিয়ন্ত্রণ ফিরে নেবে।'
                          : '⏱️ Manual override is limited to 20 minutes max, then the system automatically regains control.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                      <p className="text-base font-medium text-destructive">
                        {language === 'bn' 
                          ? '⚠️ পাখির জীবন ঝুঁকিতে পড়তে পারে! আপনি দায়িত্ব নিচ্ছেন।'
                          : '⚠️ Bird lives may be at risk! You are taking responsibility.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {language === 'bn' ? 'কারণ লিখুন (বাধ্যতামূলক):' : 'Reason (required):'}
                      </label>
                      <Textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder={language === 'bn' 
                          ? 'যেমন: ঔষধ দেওয়ার জন্য, পরিষ্কার করার জন্য...'
                          : 'e.g. Medication application, cleaning...'}
                        className="min-h-[80px]"
                      />
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            {confirmStep === 1 ? (
              <AlertDialogAction
                onClick={handleFirstConfirm}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {language === 'bn' ? 'তবুও বন্ধ করুন' : 'Disable Anyway'}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={handleSecondConfirm}
                disabled={!overrideReason.trim()}
                className="bg-destructive hover:bg-destructive/90 disabled:opacity-50"
              >
                {language === 'bn' ? 'হ্যাঁ, আমি নিশ্চিত' : 'Yes, I confirm'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
