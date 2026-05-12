/**
 * ResetFirstRunHintsCard (S4.3) — lets users replay one-shot tooltips/hints.
 *
 * The KPI color legend (S4.4) and other onboarding hints are dismissed
 * permanently per-browser via `useFirstRunHint`. This card surfaces a single
 * button that wipes those flags so a returning farmer (or a new family member
 * sharing the device) can see the hints again.
 */
import { Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { resetAllFirstRunHints } from '@/hooks/useFirstRunHint';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ResetFirstRunHintsCard() {
  const { language } = useAuth();
  const { toast } = useToast();

  const handleReset = () => {
    resetAllFirstRunHints();
    toast({
      title:
        language === 'bn'
          ? 'টিপস আবার দেখানো হবে'
          : 'Hints will show again',
      description:
        language === 'bn'
          ? 'ড্যাশবোর্ডে ফিরে যান — অনবোর্ডিং টিপ আবার দেখা যাবে।'
          : 'Return to dashboard to see onboarding hints again.',
    });
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lightbulb size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {language === 'bn' ? 'অনবোর্ডিং টিপস রিসেট' : 'Reset onboarding hints'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {language === 'bn'
              ? 'প্রথমবারের সাহায্যকারী টিপগুলো আবার দেখান।'
              : 'Show first-run helper tips again.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-8"
            onClick={handleReset}
          >
            {language === 'bn' ? 'টিপস আবার চালু' : 'Show hints again'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ResetFirstRunHintsCard;
