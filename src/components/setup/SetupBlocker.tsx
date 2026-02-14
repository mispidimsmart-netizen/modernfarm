import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsSetupComplete } from '@/hooks/useFarmSetup';
import { Button } from '@/components/ui/button';

/**
 * Wraps pages that require setup to be complete.
 * Shows a blocker with a link to the setup wizard if incomplete.
 */
export function SetupBlocker({ children }: { children: React.ReactNode }) {
  const { language } = useAuth();
  const navigate = useNavigate();
  const { isComplete, isLoading } = useIsSetupComplete();

  if (isLoading) return null;

  if (!isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Shield className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {language === 'bn' ? '⚠️ সেটআপ সম্পন্ন করুন' : '⚠️ Complete Setup First'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {language === 'bn' 
            ? 'অটোমেশন চালু করতে হলে খামার সেটআপ উইজার্ড সম্পন্ন করতে হবে। এটি আপনার ডিভাইস এবং সেন্সর সঠিকভাবে কনফিগার করা নিশ্চিত করে।'
            : 'You must complete the farm setup wizard before using automation. This ensures your devices and sensors are properly configured.'}
        </p>
        <Button onClick={() => navigate('/setup')} className="h-12 px-8 text-base rounded-xl">
          {language === 'bn' ? '🚀 সেটআপ শুরু করুন' : '🚀 Start Setup'}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
