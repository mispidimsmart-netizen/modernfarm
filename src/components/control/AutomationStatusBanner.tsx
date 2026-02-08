import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldOff, AlertTriangle } from 'lucide-react';
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
import { useState } from 'react';

interface AutomationStatusBannerProps {
  automationEnabled: boolean;
  hasTemporaryOverrides: boolean;
  onToggleAutomation: (enabled: boolean) => void;
}

export function AutomationStatusBanner({
  automationEnabled,
  hasTemporaryOverrides,
  onToggleAutomation,
}: AutomationStatusBannerProps) {
  const { language } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);

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
    onToggleAutomation(false);
    setShowConfirmDialog(false);
    setConfirmStep(1);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setConfirmStep(1);
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
          
          {automationEnabled && (
            <button
              onClick={handleDisableClick}
              className="text-xs px-3 py-1.5 rounded-lg bg-background/50 border border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-colors"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Disable'}
            </button>
          )}
          
          {!automationEnabled && (
            <button
              onClick={() => onToggleAutomation(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              {language === 'bn' ? 'চালু করুন' : 'Enable'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="h-6 w-6" />
              {confirmStep === 1 
                ? (language === 'bn' ? 'সতর্কতা!' : 'Warning!')
                : (language === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
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
                </>
              ) : (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-base font-medium text-red-600 dark:text-red-400">
                    {language === 'bn' 
                      ? '⚠️ পাখির জীবন ঝুঁকিতে পড়তে পারে! আপনি দায়িত্ব নিচ্ছেন।'
                      : '⚠️ Bird lives may be at risk! You are taking responsibility.'}
                  </p>
                </div>
              )}
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
                className="bg-red-500 hover:bg-red-600"
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
