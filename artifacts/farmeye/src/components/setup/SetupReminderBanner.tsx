import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsSetupComplete, SETUP_STEPS } from '@/hooks/useFarmSetup';
import { useFarmSetupStatus } from '@/hooks/useFarmSetup';
import { Progress } from '@/components/ui/progress';

export function SetupReminderBanner() {
  const { language } = useAuth();
  const { isComplete, isLoading, status } = useIsSetupComplete();

  if (isLoading || isComplete) return null;

  const completedSteps = status ? SETUP_STEPS.filter(s => status[s.key as keyof typeof status] === true).length : 0;
  const progressPercent = (completedSteps / 8) * 100;

  return (
    <Link
      to="/setup"
      className="block rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 p-4 mb-3 transition-colors hover:from-primary/15"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            {language === 'bn' ? '🚀 সেটআপ সম্পন্ন করুন' : '🚀 Complete Setup'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' ? `${completedSteps}/৮ ধাপ সম্পন্ন` : `${completedSteps}/8 steps done`}
          </p>
        </div>
      </div>
      <Progress value={progressPercent} className="h-1.5 rounded-full" />
    </Link>
  );
}
