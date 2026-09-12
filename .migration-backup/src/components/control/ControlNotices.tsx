import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

interface Props {
  language: 'bn' | 'en';
}

/** Read-only role notice shown above the control grids. */
export function ViewerRestrictionCard({ language }: Props) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-foreground">
              {language === 'bn' ? 'শুধুমাত্র দেখার অনুমতি' : 'View Only Access'}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'bn'
                ? 'আপনি ভিউয়ার হিসেবে কোনো পরিবর্তন করতে পারবেন না'
                : 'As a viewer, you cannot make any changes'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Worker / temporary-control-only notice (AUTO mode). */
export function TemporaryControlNoticeCard({ language }: Props) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">
              {language === 'bn' ? 'সাময়িক কন্ট্রোল' : 'Temporary Control Only'}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'bn'
                ? 'আপনি শুধুমাত্র সাময়িক কন্ট্রোল করতে পারবেন, স্থায়ী পরিবর্তন নয়'
                : 'You can only make temporary changes, not permanent ones'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
