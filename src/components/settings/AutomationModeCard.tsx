import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Hand, ShieldCheck, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAutomationMode, useSetAutomationMode, AutomationMode } from '@/hooks/useAutomationMode';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export function AutomationModeCard() {
  const { language } = useAuth();
  const { data: currentMode, isLoading } = useAutomationMode();
  const setMode = useSetAutomationMode();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<AutomationMode | null>(null);

  const isManual = currentMode === 'MANUAL';

  const handleToggle = (checked: boolean) => {
    const newMode: AutomationMode = checked ? 'MANUAL' : 'AUTO';
    setPendingMode(newMode);
    setShowConfirm(true);
  };

  const confirmModeChange = async () => {
    if (!pendingMode) return;
    try {
      await setMode.mutateAsync(pendingMode);
      toast({
        title: pendingMode === 'MANUAL'
          ? (language === 'bn' ? '✋ ম্যানুয়াল মোড সক্রিয়' : '✋ Manual Mode Active')
          : (language === 'bn' ? '🤖 অটো মোড সক্রিয়' : '🤖 Auto Mode Active'),
        description: pendingMode === 'MANUAL'
          ? (language === 'bn' ? 'সেফটি ইনভ্যারিয়েন্ট সক্রিয় থাকবে' : 'Safety invariants remain active')
          : (language === 'bn' ? 'অটোমেশন ইঞ্জিন পুনরায় নিয়ন্ত্রণ নিয়েছে' : 'Automation engine resumed control'),
      });
    } catch {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    }
    setShowConfirm(false);
    setPendingMode(null);
  };

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
          isManual
            ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-amber-600/10'
            : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'
        }`}>
          <CardContent className="py-5">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isManual
                    ? 'bg-amber-500/20 text-amber-600'
                    : 'bg-primary/15 text-primary'
                }`}>
                  {isManual ? <Hand className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">
                      {language === 'bn' ? 'অটোমেশন মোড' : 'Automation Mode'}
                    </h3>
                    <Badge variant={isManual ? 'secondary' : 'default'} className={`text-xs ${
                      isManual
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-primary/20 text-primary border-primary/30'
                    }`}>
                      {isManual
                        ? (language === 'bn' ? 'ম্যানুয়াল' : 'MANUAL')
                        : (language === 'bn' ? 'অটো' : 'AUTO')
                      }
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isManual
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
                  disabled={setMode.isPending}
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

            {/* Mode Description */}
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
                <p>
                  {language === 'bn'
                    ? '🤖 অটোমেশন ইঞ্জিন পুনরায় নিয়ন্ত্রণ নেবে। সেন্সর ডেটা অনুযায়ী ডিভাইসগুলো স্বয়ংক্রিয়ভাবে চলবে।'
                    : '🤖 Automation engine will resume control. Devices will run automatically based on sensor data.'}
                </p>
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
