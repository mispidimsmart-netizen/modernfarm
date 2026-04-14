import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Hand, ShieldCheck, AlertTriangle, ArrowLeftRight, Loader2, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAutomationMode, useSetAutomationMode, AutomationMode } from '@/hooks/useAutomationMode';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { useToast } from '@/hooks/use-toast';

const SYNC_PERIOD_SECONDS = 30;

export function AutomationModeCard() {
  const { language } = useAuth();
  const { data: currentMode, isLoading } = useAutomationMode();
  const setMode = useSetAutomationMode();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<AutomationMode | null>(null);
  const [syncCountdown, setSyncCountdown] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const isManual = currentMode === 'MANUAL';

  // Sync period countdown
  useEffect(() => {
    if (!isSyncing || syncCountdown <= 0) {
      if (isSyncing && syncCountdown <= 0) {
        setIsSyncing(false);
        toast({
          title: language === 'bn' ? '✅ সিঙ্ক সম্পন্ন' : '✅ Sync Complete',
          description: language === 'bn'
            ? 'অটোমেশন ইঞ্জিন এখন সম্পূর্ণ নিয়ন্ত্রণে'
            : 'Automation engine now has full control',
        });
      }
      return;
    }
    const timer = setTimeout(() => setSyncCountdown(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSyncing, syncCountdown, toast, language]);

  const handleToggle = (checked: boolean) => {
    if (isSyncing) return;
    const newMode: AutomationMode = checked ? 'MANUAL' : 'AUTO';
    setPendingMode(newMode);
    setShowConfirm(true);
  };

  const confirmModeChange = useCallback(async () => {
    if (!pendingMode) return;
    try {
      await setMode.mutateAsync(pendingMode);

      // If switching to AUTO → start sync period
      if (pendingMode === 'AUTO') {
        setIsSyncing(true);
        setSyncCountdown(SYNC_PERIOD_SECONDS);
        toast({
          title: language === 'bn' ? '🔄 সিঙ্ক পিরিয়ড শুরু' : '🔄 Sync Period Started',
          description: language === 'bn'
            ? `${SYNC_PERIOD_SECONDS} সেকেন্ড ধীরে ধীরে অটোমেশন পুনরায় শুরু হচ্ছে`
            : `${SYNC_PERIOD_SECONDS}s gradual automation resumption`,
        });
      } else {
        toast({
          title: language === 'bn' ? '✋ ম্যানুয়াল মোড সক্রিয়' : '✋ Manual Mode Active',
          description: language === 'bn'
            ? 'সেফটি ইনভ্যারিয়েন্ট সক্রিয় থাকবে'
            : 'Safety invariants remain active',
        });
      }
    } catch {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    }
    setShowConfirm(false);
    setPendingMode(null);
  }, [pendingMode, setMode, toast, language]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-6">
          <div className="h-20 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`border-2 overflow-hidden ${
          isSyncing
            ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-blue-600/10'
            : isManual
              ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-amber-600/10'
              : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'
        }`}>
          <CardContent className="py-5">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isSyncing
                    ? 'bg-blue-500/20 text-blue-600'
                    : isManual
                      ? 'bg-amber-500/20 text-amber-600'
                      : 'bg-primary/15 text-primary'
                }`}>
                  {isSyncing
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : isManual
                      ? <Hand className="h-6 w-6" />
                      : <Bot className="h-6 w-6" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">
                      {language === 'bn' ? 'অটোমেশন মোড' : 'Automation Mode'}
                    </h3>
                    <Badge variant={isManual ? 'secondary' : 'default'} className={`text-xs ${
                      isSyncing
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
                        : isManual
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-primary/20 text-primary border-primary/30'
                    }`}>
                      {isSyncing
                        ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'SYNCING...')
                        : isManual
                          ? (language === 'bn' ? 'ম্যানুয়াল' : 'MANUAL')
                          : (language === 'bn' ? 'অটো' : 'AUTO')
                      }
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isSyncing
                      ? (language === 'bn' ? 'অটোমেশন ধীরে ধীরে চালু হচ্ছে...' : 'Automation gradually resuming...')
                      : isManual
                        ? (language === 'bn' ? 'আপনি ডিভাইস নিয়ন্ত্রণ করছেন' : 'You control devices')
                        : (language === 'bn' ? 'সিস্টেম স্বয়ংক্রিয়ভাবে চলছে' : 'System runs automatically')
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <Switch
                  checked={isManual}
                  onCheckedChange={handleToggle}
                  disabled={setMode.isPending || isSyncing}
                  className={isManual ? 'data-[state=checked]:bg-amber-500' : ''}
                />
                <span className="text-[10px] text-muted-foreground">
                  {isManual
                    ? (language === 'bn' ? 'ম্যানুয়াল' : 'Manual')
                    : (language === 'bn' ? 'অটো' : 'Auto')
                  }
                </span>
              </div>
            </div>

            {/* Sync Period Progress */}
            {isSyncing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-3"
              >
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        {language === 'bn' ? 'সিঙ্ক পিরিয়ড' : 'Sync Period'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      {syncCountdown}s
                    </span>
                  </div>
                  <Progress
                    value={((SYNC_PERIOD_SECONDS - syncCountdown) / SYNC_PERIOD_SECONDS) * 100}
                    className="h-1.5"
                  />
                  <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80">
                    {language === 'bn'
                      ? 'সেন্সর ডেটা পড়ে সিস্টেম ধীরে ধীরে নিয়ন্ত্রণ নিচ্ছে...'
                      : 'System reading sensors and gradually taking control...'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Mode Description */}
            {!isSyncing && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={isManual ? 'manual' : 'auto'}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {isManual ? (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {language === 'bn'
                            ? 'ম্যানুয়াল মোডে অটোমেশন ইঞ্জিন বন্ধ। আপনি নিজে ফ্যান, লাইট, ফগার ইত্যাদি চালু/বন্ধ করবেন।'
                            : 'Automation engine is off. You manually control fans, lights, foggers, etc.'}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-green-700 dark:text-green-400">
                          {language === 'bn'
                            ? '🛡️ জীবন-রক্ষাকারী সেফটি সিস্টেম (INV-1 থেকে INV-8) সবসময় সক্রিয় থাকবে।'
                            : '🛡️ Life-saving safety system (INV-1 to INV-8) always stays active.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {language === 'bn'
                            ? 'সেন্সর ডেটার উপর ভিত্তি করে সিস্টেম স্বয়ংক্রিয়ভাবে ফ্যান, হিটার, ফগার ও লাইট নিয়ন্ত্রণ করে।'
                            : 'System automatically controls fans, heaters, foggers & lights based on sensor data.'}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {pendingMode === 'MANUAL'
                ? (language === 'bn' ? 'ম্যানুয়াল মোডে যেতে চান?' : 'Switch to Manual Mode?')
                : (language === 'bn' ? 'অটো মোডে ফিরতে চান?' : 'Switch to Auto Mode?')
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {pendingMode === 'MANUAL' ? (
                <>
                  <p>
                    {language === 'bn'
                      ? '⚠️ ম্যানুয়াল মোডে অটোমেশন ইঞ্জিন বন্ধ হয়ে যাবে। আপনাকে নিজে ডিভাইসগুলো নিয়ন্ত্রণ করতে হবে।'
                      : '⚠️ Automation engine will be disabled. You will need to control devices manually.'}
                  </p>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {language === 'bn'
                      ? '🛡️ সেফটি সিস্টেম সক্রিয় থাকবে — জরুরি অবস্থায় সিস্টেম স্বয়ংক্রিয়ভাবে হস্তক্ষেপ করবে।'
                      : '🛡️ Safety system stays active — system will intervene in emergencies.'}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    {language === 'bn'
                      ? '🤖 অটোমেশন ইঞ্জিন পুনরায় নিয়ন্ত্রণ নেবে। সেন্সর ডেটা অনুযায়ী ডিভাইসগুলো স্বয়ংক্রিয়ভাবে চলবে।'
                      : '🤖 Automation engine will resume control. Devices will run automatically based on sensor data.'}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    {language === 'bn'
                      ? `⏱️ ${SYNC_PERIOD_SECONDS} সেকেন্ড সিঙ্ক পিরিয়ড — সিস্টেম ধীরে ধীরে নিয়ন্ত্রণ নেবে`
                      : `⏱️ ${SYNC_PERIOD_SECONDS}s sync period — system will gradually take control`}
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmModeChange}
              className={pendingMode === 'MANUAL' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {pendingMode === 'MANUAL'
                ? (language === 'bn' ? '✋ ম্যানুয়াল করুন' : '✋ Go Manual')
                : (language === 'bn' ? '🤖 অটো করুন' : '🤖 Go Auto')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
